import React, { useMemo, useState } from 'react';
import { X, Trophy, Calendar, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { CareerState } from '../types/brasfoot';
import { computeStandings, COPA_PRIZES, formatMoney } from '../engine/gameEngine';
import { ClubBadge } from './ClubBadge';

interface TablesModalProps {
  state: CareerState;
  initialTab?: 'A' | 'B' | 'COPA' | 'ROUNDS' | 'SCORERS';
  onClose: () => void;
}

export const TablesModal: React.FC<TablesModalProps> = ({
  state,
  initialTab = 'A',
  onClose,
}) => {
  const userClub = state.clubs.find((c) => c.id === state.userClubId)!;
  const [tab, setTab] = useState<'A' | 'B' | 'COPA' | 'ROUNDS' | 'SCORERS'>(
    initialTab === 'A' && userClub.division === 'B' ? 'B' : initialTab
  );
  const [roundDiv, setRoundDiv] = useState<'SERIE_A' | 'SERIE_B'>(
    userClub.division === 'B' ? 'SERIE_B' : 'SERIE_A'
  );

  const clubsMap = useMemo(() => new Map(state.clubs.map((c) => [c.id, c])), [state.clubs]);

  const currentLeagueRound = useMemo(() => {
    const nextUnplayed = state.fixtures.find(
      (f) => f.competition === roundDiv && !f.played
    );
    return nextUnplayed ? nextUnplayed.round : state.totalLeagueRounds;
  }, [state.fixtures, roundDiv, state.totalLeagueRounds]);

  const [selectedRound, setSelectedRound] = useState<number>(currentLeagueRound);

  const tableA = useMemo(
    () => computeStandings(state.clubs, state.fixtures, 'A'),
    [state.clubs, state.fixtures]
  );
  const tableB = useMemo(
    () => computeStandings(state.clubs, state.fixtures, 'B'),
    [state.clubs, state.fixtures]
  );

  const topScorers = useMemo(() => {
    return [...state.players]
      .filter((p) => p.goals > 0 || p.assists > 0)
      .sort((a, b) => (b.goals !== a.goals ? b.goals - a.goals : b.assists - a.assists))
      .slice(0, 30);
  }, [state.players]);

  const cupFixturesByPhase = useMemo(() => {
    const phases = [5, 4, 3, 2, 1];
    return phases
      .map((r) => ({
        round: r,
        fixtures: state.fixtures.filter(
          (f) => f.competition === 'COPA_BR' && f.round === r && f.homeId !== 'TBD'
        ),
      }))
      .filter((g) => g.fixtures.length > 0);
  }, [state.fixtures]);

  const renderStandingsTable = (division: 'A' | 'B') => {
    const rows = division === 'A' ? tableA : tableB;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
              <th className="py-2.5 px-2.5 w-10">#</th>
              <th className="py-2.5 px-2">Clube</th>
              <th className="py-2.5 px-2 text-center font-black text-amber-300">P</th>
              <th className="py-2.5 px-2 text-center">J</th>
              <th className="py-2.5 px-2 text-center">V</th>
              <th className="py-2.5 px-2 text-center">E</th>
              <th className="py-2.5 px-2 text-center">D</th>
              <th className="py-2.5 px-2 text-center">GP</th>
              <th className="py-2.5 px-2 text-center">GC</th>
              <th className="py-2.5 px-2 text-center">SG</th>
              <th className="py-2.5 px-2 text-center hidden sm:table-cell">%</th>
              <th className="py-2.5 px-2 text-center hidden md:table-cell">Últimos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {rows.map((r, idx) => {
              const pos = idx + 1;
              const cl = clubsMap.get(r.clubId)!;
              const isUser = cl.id === state.userClubId;
              const pct = r.played > 0 ? Math.round((r.points / (r.played * 3)) * 100) : 0;

              let posBadge = 'bg-slate-800 text-slate-300';
              if (division === 'A') {
                if (pos === 1) posBadge = 'bg-amber-400 text-slate-950 font-black';
                else if (pos <= 4) posBadge = 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40';
                else if (pos <= 6) posBadge = 'bg-sky-500/25 text-sky-300 border border-sky-500/40';
                else if (pos <= 12) posBadge = 'bg-indigo-500/20 text-indigo-300';
                else if (pos >= 17) posBadge = 'bg-rose-600/30 text-rose-300 border border-rose-500/40';
              } else {
                if (pos <= 4) posBadge = 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40';
                else if (pos >= 17) posBadge = 'bg-rose-600/30 text-rose-300 border border-rose-500/40';
              }

              return (
                <tr
                  key={r.clubId}
                  className={`${
                    isUser
                      ? 'bg-emerald-900/40 font-bold'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="py-2 px-2.5">
                    <span
                      className={`inline-flex w-6 h-6 rounded items-center justify-center text-[11px] font-bold ${posBadge}`}
                    >
                      {pos}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <ClubBadge club={cl} size="xs" />
                      <span className={isUser ? 'text-amber-300 font-black' : 'text-slate-100'}>
                        {cl.shortName}
                      </span>
                      <span className="text-[10px] text-slate-500">({cl.state})</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center font-black text-amber-300 text-sm">
                    {r.points}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-300">{r.played}</td>
                  <td className="py-2 px-2 text-center text-emerald-400">{r.won}</td>
                  <td className="py-2 px-2 text-center text-slate-400">{r.drawn}</td>
                  <td className="py-2 px-2 text-center text-rose-400">{r.lost}</td>
                  <td className="py-2 px-2 text-center text-slate-300">{r.gf}</td>
                  <td className="py-2 px-2 text-center text-slate-300">{r.ga}</td>
                  <td className="py-2 px-2 text-center font-semibold text-slate-200">
                    {r.gd > 0 ? `+${r.gd}` : r.gd}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 hidden sm:table-cell">
                    {pct}%
                  </td>
                  <td className="py-2 px-2 hidden md:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      {r.form.map((res, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                            res === 'V'
                              ? 'bg-emerald-500 text-slate-950'
                              : res === 'E'
                              ? 'bg-slate-500 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {res}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-4 mt-3 px-2 text-[11px] text-slate-400">
          {division === 'A' ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Campeão
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> G4 Libertadores
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-sky-400" /> Pré-Libertadores
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-400" /> Sul-Americana
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Z4 Rebaixamento à Série B
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> G4 Acesso à Série A
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Z4 Zona de Risco
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const roundFixtures = state.fixtures.filter(
    (f) => f.competition === roundDiv && f.round === selectedRound
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">
              Competições & Estatísticas — Temporada {state.year}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="px-4 pt-3 pb-2 bg-slate-900 border-b border-slate-800 flex flex-wrap gap-2">
          {[
            { id: 'A', label: '🏆 Série A' },
            { id: 'B', label: '⚔️ Série B' },
            { id: 'COPA', label: '🏅 Copa do Brasil' },
            { id: 'ROUNDS', label: '📅 Jogos por Rodada' },
            { id: 'SCORERS', label: '⚽ Artilharia' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as typeof tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                tab === item.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {tab === 'A' && renderStandingsTable('A')}
          {tab === 'B' && renderStandingsTable('B')}

          {tab === 'COPA' && (
            <div className="space-y-6">
              {cupFixturesByPhase.map(({ round, fixtures }) => (
                <div key={round} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-amber-300">
                      {fixtures[0]?.stageName}
                    </h3>
                    <span className="text-xs font-bold text-emerald-400">
                      Premiação por vaga: {formatMoney(COPA_PRIZES[round] || 3_000_000)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {fixtures.map((fx) => {
                      const hc = clubsMap.get(fx.homeId);
                      const ac = clubsMap.get(fx.awayId);
                      if (!hc || !ac) return null;
                      return (
                        <div
                          key={fx.id}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ClubBadge club={hc} size="xs" />
                            <span className="font-semibold text-white truncate">{hc.shortName}</span>
                          </div>
                          <div className="px-2.5 py-0.5 rounded bg-slate-800 font-black text-amber-300 mx-2">
                            {fx.played ? (
                              <>
                                {fx.homeGoals} x {fx.awayGoals}
                                {fx.homePen !== undefined && ` (${fx.homePen}-${fx.awayPen})`}
                              </>
                            ) : (
                              'vs'
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                            <span className="font-semibold text-white truncate">{ac.shortName}</span>
                            <ClubBadge club={ac} size="xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'ROUNDS' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setRoundDiv('SERIE_A')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      roundDiv === 'SERIE_A'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Série A
                  </button>
                  <button
                    onClick={() => setRoundDiv('SERIE_B')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      roundDiv === 'SERIE_B'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Série B
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRound((r) => Math.max(1, r - 1))}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-white px-3 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Rodada {selectedRound} de {state.totalLeagueRounds}
                  </span>
                  <button
                    onClick={() =>
                      setSelectedRound((r) => Math.min(state.totalLeagueRounds, r + 1))
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {roundFixtures.map((fx) => {
                  const hc = clubsMap.get(fx.homeId);
                  const ac = clubsMap.get(fx.awayId);
                  if (!hc || !ac) return null;
                  const isUserMatch =
                    fx.homeId === state.userClubId || fx.awayId === state.userClubId;
                  return (
                    <div
                      key={fx.id}
                      className={`rounded-xl px-3.5 py-2.5 border flex items-center justify-between text-xs ${
                        isUserMatch
                          ? 'bg-emerald-950/60 border-emerald-500/50'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ClubBadge club={hc} size="xs" />
                        <span className="font-bold text-white truncate">{hc.shortName}</span>
                      </div>
                      <div className="px-3 py-1 rounded bg-slate-800 font-black text-sm text-amber-300 mx-2">
                        {fx.played ? `${fx.homeGoals} x ${fx.awayGoals}` : 'vs'}
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                        <span className="font-bold text-white truncate">{ac.shortName}</span>
                        <ClubBadge club={ac} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'SCORERS' && (
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Principais Artilheiros e Garçons da Temporada
              </h3>
              {topScorers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhuma partida disputada ainda nesta temporada.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Jogador</th>
                      <th className="py-2 px-3">Clube</th>
                      <th className="py-2 px-3 text-center">Jogos</th>
                      <th className="py-2 px-3 text-center font-black text-amber-300">Gols</th>
                      <th className="py-2 px-3 text-center text-emerald-400">Assist.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {topScorers.map((p, idx) => {
                      const cl = clubsMap.get(p.clubId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-bold text-slate-400">{idx + 1}º</td>
                          <td className="py-2 px-3 font-bold text-white">
                            {p.name}{' '}
                            <span className="text-[10px] text-slate-400">
                              ({p.pos} · {p.ovr})
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {cl && <ClubBadge club={cl} size="xs" />}
                              <span className="text-slate-200">{cl?.shortName || 'Livre'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">{p.matches}</td>
                          <td className="py-2 px-3 text-center font-black text-amber-300 text-sm">
                            {p.goals}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-400">
                            {p.assists}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
