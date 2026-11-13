import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  FastForward,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  CareerState,
  Club,
  FormationId,
  MarkingStyle,
  Player,
  PlayStyle,
} from '../types/brasfoot';
import {
  LiveMatchState,
  resolvePenaltyShootout,
  simulateMatchMinute,
} from '../engine/gameEngine';
import { FORMATIONS } from '../data/formations';
import { ClubBadge } from './ClubBadge';

interface LiveMatchModalProps {
  state: CareerState;
  stepFixtures: LiveMatchState[];
  onFinishRound: (
    completedMatches: LiveMatchState[],
    updatedUserClub: Club,
    updatedUserPlayers: Player[]
  ) => void;
}

export const LiveMatchModal: React.FC<LiveMatchModalProps> = ({
  state,
  stepFixtures,
  onFinishRound,
}) => {
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState<0 | 1 | 3 | 6>(3); // 0 = pausado
  const [halftimeDone, setHalftimeDone] = useState(false);
  const [matches, setMatches] = useState<LiveMatchState[]>(stepFixtures);
  const [showTacticsDrawer, setShowTacticsDrawer] = useState(false);
  const [goalBannerClubId, setGoalBannerClubId] = useState<string | null>(null);

  // Estado local do clube e jogadores do usuário para táticas e substituições em tempo real
  const [localClubs, setLocalClubs] = useState<Club[]>(state.clubs);
  const [localPlayers, setLocalPlayers] = useState<Player[]>(state.players);
  const [subOutId, setSubOutId] = useState<string | null>(null);

  const clubsMap = useMemo(() => new Map(localClubs.map((c) => [c.id, c])), [localClubs]);
  const playersByClub = useMemo(() => {
    const m = new Map<string, Player[]>();
    for (const p of localPlayers) {
      const arr = m.get(p.clubId) || [];
      arr.push(p);
      m.set(p.clubId, arr);
    }
    return m;
  }, [localPlayers]);

  // Partida principal em destaque (a do usuário, ou a 1ª da rodada caso folgue na Copa)
  const featuredIndex = useMemo(() => {
    const idx = matches.findIndex(
      (m) => m.fixture.homeId === state.userClubId || m.fixture.awayId === state.userClubId
    );
    return idx >= 0 ? idx : 0;
  }, [matches, state.userClubId]);

  const userIsPlaying = useMemo(
    () =>
      matches.some(
        (m) => m.fixture.homeId === state.userClubId || m.fixture.awayId === state.userClubId
      ),
    [matches, state.userClubId]
  );

  const featured = matches[featuredIndex];
  const homeClub = featured ? clubsMap.get(featured.fixture.homeId) : undefined;
  const awayClub = featured ? clubsMap.get(featured.fixture.awayId) : undefined;
  const userClub = clubsMap.get(state.userClubId)!;
  const userRoster = playersByClub.get(state.userClubId) || [];

  const isFinished = minute >= 90;

  // Relógio minuto a minuto
  useEffect(() => {
    if (speed === 0 || minute >= 90) return;

    // Pausa automática no intervalo se o usuário estiver jogando
    if (minute === 45 && !halftimeDone && userIsPlaying) {
      setSpeed(0);
      setHalftimeDone(true);
      setShowTacticsDrawer(true);
      return;
    }

    const delay = speed === 1 ? 420 : speed === 3 ? 170 : 65;
    const timer = setTimeout(() => {
      const nextMin = minute + 1;
      let featuredGoalClub: string | null = null;

      setMatches((prev) =>
        prev.map((lm, idx) => {
          const { updated, goalScoredBy } = simulateMatchMinute(
            lm,
            nextMin,
            clubsMap,
            playersByClub
          );
          if (idx === featuredIndex && goalScoredBy) {
            featuredGoalClub = goalScoredBy;
          }
          return updated;
        })
      );

      if (featuredGoalClub) {
        setGoalBannerClubId(featuredGoalClub);
        setTimeout(() => setGoalBannerClubId(null), 2200);
      }
      setMinute(nextMin);
    }, delay);

    return () => clearTimeout(timer);
  }, [minute, speed, halftimeDone, userIsPlaying, clubsMap, playersByClub, featuredIndex]);

  // Se empatar na Copa aos 90', mostra pênaltis resolvidos imediatamente na tela
  const finalPreviewMatches = useMemo(() => {
    if (!isFinished) return matches;
    return matches.map((m) => ({
      ...m,
      fixture: resolvePenaltyShootout(m.fixture, clubsMap, playersByClub),
    }));
  }, [isFinished, matches, clubsMap, playersByClub]);

  const currentFeatured = finalPreviewMatches[featuredIndex] || featured;

  const handleSkipToEnd = () => {
    let curMin = minute;
    let curMatches = [...matches];
    while (curMin < 90) {
      curMin++;
      curMatches = curMatches.map((lm) => {
        const { updated } = simulateMatchMinute(lm, curMin, clubsMap, playersByClub);
        return updated;
      });
    }
    setMatches(curMatches);
    setHalftimeDone(true);
    setMinute(90);
    setSpeed(0);
  };

  const handleMakeSubstitution = (benchPlayerId: string) => {
    if (!subOutId || !featured) return;
    if (featured.subsUsedUser >= 5) return;
    if (featured.sentOffPlayerIds.includes(subOutId)) return; // expulso não pode ser substituído

    const outPlayer = localPlayers.find((p) => p.id === subOutId);
    const inPlayer = localPlayers.find((p) => p.id === benchPlayerId);
    if (!outPlayer || !inPlayer) return;

    setLocalPlayers((prev) =>
      prev.map((p) => {
        if (p.id === outPlayer.id) {
          return { ...p, isStarter: false, slotIndex: undefined };
        }
        if (p.id === inPlayer.id) {
          return { ...p, isStarter: true, slotIndex: outPlayer.slotIndex };
        }
        return p;
      })
    );

    setMatches((prev) =>
      prev.map((m, idx) => {
        if (idx !== featuredIndex) return m;
        return {
          ...m,
          subsUsedUser: m.subsUsedUser + 1,
          fixture: {
            ...m.fixture,
            events: [
              ...m.fixture.events,
              {
                minute: Math.max(1, minute),
                clubId: userClub.id,
                type: 'SUB',
                playerName: inPlayer.name,
                text: `🔄 Substituição no ${userClub.shortName}: sai ${outPlayer.name}, entra ${inPlayer.name}.`,
              },
            ],
          },
        };
      })
    );

    setSubOutId(null);
  };

  const updateUserTactics = (
    patch: Partial<{ formation: FormationId; style: PlayStyle; marking: MarkingStyle }>
  ) => {
    setLocalClubs((prev) =>
      prev.map((c) =>
        c.id === state.userClubId
          ? { ...c, tactics: { ...c.tactics, ...patch } }
          : c
      )
    );
  };

  const userDivisionComp = userClub.division === 'A' ? 'SERIE_A' : 'SERIE_B';
  const sameCompetitionMatches = finalPreviewMatches.filter(
    (m, i) =>
      i !== featuredIndex &&
      (m.fixture.competition === currentFeatured?.fixture.competition ||
        m.fixture.competition === userDivisionComp)
  );

  const userStarters = userRoster
    .filter((p) => p.isStarter)
    .sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
  const userBench = userRoster
    .filter((p) => !p.isStarter && p.suspended === 0 && p.injured === 0)
    .sort((a, b) => b.ovr - a.ovr);

  if (!currentFeatured || !homeClub || !awayClub) return null;

  const goalClub = goalBannerClubId ? clubsMap.get(goalBannerClubId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-6xl bg-slate-900 border-2 border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Topo da Rodada + Cronômetro + Controles */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              {currentFeatured.fixture.stageName}
            </span>
            <div className="text-xs text-slate-300">
              {homeClub.stadium} · Temporada {state.year}
            </div>
          </div>

          {/* Cronômetro */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-1.5 rounded-xl font-black text-lg border ${
                isFinished
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : minute === 45 && speed === 0
                  ? 'bg-sky-500 text-slate-950 border-sky-300'
                  : 'bg-slate-950 text-emerald-400 border-emerald-500/50'
              }`}
            >
              {isFinished
                ? 'FIM DE JOGO'
                : minute === 45 && speed === 0
                ? 'INTERVALO (45\')'
                : `${minute}'`}
            </div>

            {!isFinished && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSpeed(speed === 0 ? 3 : 0)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {speed === 0 ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" /> Continuar
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pausar
                    </>
                  )}
                </button>
                {([1, 3, 6] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeed(spd)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                      speed === spd
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
                <button
                  onClick={handleSkipToEnd}
                  title="Simular até os 90 minutos"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" /> 90'
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Corpo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Esquerda: Placar Principal, Estatísticas, Lances e Substituições */}
          <div className="lg:col-span-7 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col gap-4">
            {/* Banner animado de GOL */}
            {goalClub && (
              <div
                style={{ backgroundColor: goalClub.primaryColor }}
                className="rounded-xl py-2 px-4 text-center font-black text-white text-lg tracking-wider animate-pulse border-2 border-amber-300 shadow-lg"
              >
                ⚽ GOOOOOOOOL DO {goalClub.shortName.toUpperCase()}!!
              </div>
            )}

            {/* Placar Grande */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-5">
              <div className="grid grid-cols-7 items-center gap-2">
                <div className="col-span-3 flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
                  <ClubBadge club={homeClub} size="lg" />
                  <div className="min-w-0">
                    <div className="font-black text-base sm:text-lg text-white truncate">
                      {homeClub.shortName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {homeClub.tactics.formation} · {homeClub.tactics.style}
                    </div>
                    {currentFeatured.homeRedCards > 0 && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded">
                        🟥 {currentFeatured.homeRedCards}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-1 text-center">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight whitespace-nowrap">
                    {currentFeatured.fixture.homeGoals}{' '}
                    <span className="text-slate-500 text-xl">x</span>{' '}
                    {currentFeatured.fixture.awayGoals}
                  </div>
                  {currentFeatured.fixture.homePen !== undefined && (
                    <div className="text-[11px] font-bold text-amber-300 mt-1">
                      Pên: {currentFeatured.fixture.homePen} x {currentFeatured.fixture.awayPen}
                    </div>
                  )}
                </div>

                <div className="col-span-3 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 text-center sm:text-right">
                  <div className="min-w-0">
                    <div className="font-black text-base sm:text-lg text-white truncate">
                      {awayClub.shortName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {awayClub.tactics.formation} · {awayClub.tactics.style}
                    </div>
                    {currentFeatured.awayRedCards > 0 && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded">
                        🟥 {currentFeatured.awayRedCards}
                      </span>
                    )}
                  </div>
                  <ClubBadge club={awayClub} size="lg" />
                </div>
              </div>

              {/* Barra de Posse e Finalizações */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300 font-semibold">
                  <span>{currentFeatured.homePossession}% Posse</span>
                  <span className="text-slate-400">
                    Finalizações: {currentFeatured.homeShots} x {currentFeatured.awayShots}
                  </span>
                  <span>{100 - currentFeatured.homePossession}% Posse</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    style={{
                      width: `${currentFeatured.homePossession}%`,
                      backgroundColor: homeClub.primaryColor === '#111111' ? '#10B981' : homeClub.primaryColor,
                    }}
                    className="h-full transition-all duration-300"
                  />
                  <div className="flex-1 bg-slate-600" />
                </div>
              </div>
            </div>

            {/* Botão para Substituições & Tática durante o jogo */}
            {userIsPlaying && !isFinished && (
              <div className="flex items-center justify-between bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2.5">
                <div className="text-xs text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>
                    <strong>Mexer no Time:</strong> {5 - currentFeatured.subsUsedUser} substituições restantes
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSpeed(0);
                    setShowTacticsDrawer((v) => !v);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {showTacticsDrawer ? 'Fechar Prancheta' : 'Substituir / Tática'}
                </button>
              </div>
            )}

            {/* Painel de Substituições e Tática em Jogo */}
            {showTacticsDrawer && userIsPlaying && !isFinished && (
              <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Formação
                    </label>
                    <select
                      value={userClub.tactics.formation}
                      onChange={(e) => updateUserTactics({ formation: e.target.value as FormationId })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                    >
                      {(Object.keys(FORMATIONS) as FormationId[]).map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Postura
                    </label>
                    <select
                      value={userClub.tactics.style}
                      onChange={(e) => updateUserTactics({ style: e.target.value as PlayStyle })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                    >
                      {(['Retranca', 'Contra-Ataque', 'Equilibrado', 'Ofensivo', 'Ataque Total'] as PlayStyle[]).map(
                        (st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Marcação
                    </label>
                    <select
                      value={userClub.tactics.marking}
                      onChange={(e) => updateUserTactics({ marking: e.target.value as MarkingStyle })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                    >
                      {(['Leve', 'Normal', 'Pesada'] as MarkingStyle[]).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {currentFeatured.subsUsedUser < 5 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <div className="font-bold text-amber-300 mb-1">
                        1. Clique em quem SAI de campo:
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {userStarters.map((p) => {
                          const sentOff = currentFeatured.sentOffPlayerIds.includes(p.id);
                          const hurt = currentFeatured.injuredPlayerIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              disabled={sentOff}
                              onClick={() => setSubOutId(p.id)}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded text-left cursor-pointer ${
                                sentOff
                                  ? 'opacity-40 bg-red-950/40 cursor-not-allowed'
                                  : subOutId === p.id
                                  ? 'bg-amber-400 text-slate-950 font-bold'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              <span className="truncate">
                                [{p.pos}] {p.name} {hurt ? '🏥' : ''} {sentOff ? '🟥' : ''}
                              </span>
                              <span>{p.ovr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-emerald-400 mb-1">
                        2. Clique no reserva que ENTRA:
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {userBench.map((p) => (
                          <button
                            key={p.id}
                            disabled={!subOutId}
                            onClick={() => handleMakeSubstitution(p.id)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left ${
                              !subOutId
                                ? 'opacity-50 bg-slate-800 cursor-not-allowed'
                                : 'bg-emerald-900/50 hover:bg-emerald-700 text-white cursor-pointer'
                            }`}
                          >
                            <span className="truncate">
                              [{p.pos}] {p.name}
                            </span>
                            <span className="font-bold text-amber-300">{p.ovr}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Limite de 5 substituições atingido!
                  </div>
                )}
              </div>
            )}

            {/* Narração Minuto a Minuto */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col min-h-[190px] max-h-[260px]">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                🎙️ Narração Lance a Lance
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {currentFeatured.fixture.events.length === 0 ? (
                  <div className="text-slate-500 italic py-6 text-center">
                    Bola rolando em {homeClub.stadium}... Aguardando os primeiros lances de perigo!
                  </div>
                ) : (
                  [...currentFeatured.fixture.events].reverse().map((ev, idx) => (
                    <div
                      key={idx}
                      className={`px-2.5 py-1.5 rounded-lg border ${
                        ev.type === 'GOAL'
                          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200 font-bold'
                          : ev.type === 'RED'
                          ? 'bg-rose-950/70 border-rose-500/50 text-rose-200 font-semibold'
                          : ev.type === 'YELLOW'
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-black text-amber-400 mr-1.5">{ev.minute}'</span>
                      {ev.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Direita: Placar Ao Vivo dos Outros Jogos da Rodada */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between bg-slate-900/60">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-3">
                📻 Placar Ao Vivo da Rodada
              </h3>
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {sameCompetitionMatches.map((m) => {
                  const hc = clubsMap.get(m.fixture.homeId);
                  const ac = clubsMap.get(m.fixture.awayId);
                  if (!hc || !ac) return null;
                  return (
                    <div
                      key={m.fixture.id}
                      className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ClubBadge club={hc} size="xs" />
                        <span className="font-semibold text-slate-200 truncate">
                          {hc.shortName}
                        </span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded bg-slate-800 font-black text-white text-sm mx-2 shrink-0">
                        {m.fixture.homeGoals} x {m.fixture.awayGoals}
                        {m.fixture.homePen !== undefined && (
                          <span className="text-[10px] text-amber-300 ml-1">
                            ({m.fixture.homePen}-{m.fixture.awayPen})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                        <span className="font-semibold text-slate-200 truncate">
                          {ac.shortName}
                        </span>
                        <ClubBadge club={ac} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botão Encerrar Rodada */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              {isFinished ? (
                <button
                  onClick={() =>
                    onFinishRound(finalPreviewMatches, userClub, userRoster)
                  }
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  CONFIRMAR RESULTADOS E AVANÇAR
                </button>
              ) : (
                <div className="text-center text-xs text-slate-400">
                  Aguarde o apito final aos 90' ou clique em <strong>90'</strong> no topo para simular instantaneamente.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
