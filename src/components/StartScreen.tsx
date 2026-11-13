import React, { useMemo, useState } from 'react';
import { Users, Wallet, Landmark, Star, Play, RotateCcw, Search, Shield } from 'lucide-react';
import { buildInitialDatabase } from '../data/clubsAndPlayers';
import { CareerState } from '../types/brasfoot';
import { formatMoney } from '../engine/gameEngine';
import { ClubBadge } from './ClubBadge';

interface StartScreenProps {
  savedCareer: CareerState | null;
  onContinueCareer: () => void;
  onStartNewCareer: (coachName: string, clubId: string, rounds: 19 | 38) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  savedCareer,
  onContinueCareer,
  onStartNewCareer,
}) => {
  const previewDb = useMemo(() => buildInitialDatabase(), []);
  const [divisionTab, setDivisionTab] = useState<'A' | 'B'>('A');
  const [search, setSearch] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string>('fla');
  const [coachName, setCoachName] = useState('Seu Nome');
  const [rounds, setRounds] = useState<19 | 38>(19);

  const filteredClubs = useMemo(() => {
    return previewDb.clubs.filter(
      (c) =>
        c.division === divisionTab &&
        (c.shortName.toLowerCase().includes(search.toLowerCase()) ||
          c.state.toLowerCase().includes(search.toLowerCase()))
    );
  }, [previewDb.clubs, divisionTab, search]);

  const selectedClub = useMemo(
    () => previewDb.clubs.find((c) => c.id === selectedClubId) || previewDb.clubs[0],
    [previewDb.clubs, selectedClubId]
  );

  const selectedRoster = useMemo(
    () =>
      previewDb.players
        .filter((p) => p.clubId === selectedClub.id)
        .sort((a, b) => b.ovr - a.ovr),
    [previewDb.players, selectedClub.id]
  );

  const avgOvr = useMemo(() => {
    const top11 = selectedRoster.slice(0, 11);
    if (!top11.length) return 70;
    return Math.round(top11.reduce((acc, p) => acc + p.ovr, 0) / top11.length);
  }, [selectedRoster]);

  const savedClub = useMemo(() => {
    if (!savedCareer) return null;
    return savedCareer.clubs.find((c) => c.id === savedCareer.userClubId) || null;
  }, [savedCareer]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-900 text-slate-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Topo estilo Brasfoot */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-green-700 to-emerald-900 border-2 border-amber-400/60 shadow-2xl p-5 sm:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center shadow-lg font-black text-3xl border-2 border-white">
              BF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow">
                  BRASFOOT <span className="text-amber-300">2026</span>
                </h1>
                <span className="text-xs font-extrabold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                  Elencos Atuais
                </span>
              </div>
              <p className="text-emerald-100 text-sm sm:text-base mt-0.5">
                Série A, Série B, Copa do Brasil, Mercado Mundial, Estádio, Base e Jogo Ao Vivo!
              </p>
            </div>
          </div>

          {savedCareer && savedClub && (
            <button
              onClick={onContinueCareer}
              className="w-full md:w-auto flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-3.5 rounded-xl font-black shadow-lg transition cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm leading-tight">
                  Continuar: {savedClub.shortName} ({savedCareer.year})
                </div>
                <div className="text-xs font-semibold opacity-80">
                  Técnico {savedCareer.coachName} · Série {savedClub.division} · {formatMoney(savedClub.cash)}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Configurações do Técnico + Seleção de Clube */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Dados do Técnico + Lista de Clubes */}
          <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pb-4 border-b border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                  Nome do Técnico
                </label>
                <input
                  type="text"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Digite seu nome..."
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                  Formato do Brasileirão (+ Copa do Brasil)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRounds(19)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      rounds === 19
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    19 Rodadas (Rápido)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRounds(38)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      rounds === 38
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    38 Rodadas (Completo)
                  </button>
                </div>
              </div>
            </div>

            {/* Abas Série A / Série B + Busca */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDivisionTab('A');
                    const firstA = previewDb.clubs.find((c) => c.division === 'A');
                    if (firstA) setSelectedClubId(firstA.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
                    divisionTab === 'A'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🏆 Série A (20)
                </button>
                <button
                  onClick={() => {
                    setDivisionTab('B');
                    const goiasOrFirstB =
                      previewDb.clubs.find((c) => c.id === 'goi') ||
                      previewDb.clubs.find((c) => c.division === 'B');
                    if (goiasOrFirstB) setSelectedClubId(goiasOrFirstB.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
                    divisionTab === 'B'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ⚔️ Série B (20)
                </button>
              </div>

              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar time ou estado (ex: GO, SP, RJ)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Grade de Clubes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[430px] overflow-y-auto pr-1">
              {filteredClubs.map((club) => {
                const roster = previewDb.players
                  .filter((p) => p.clubId === club.id)
                  .sort((a, b) => b.ovr - a.ovr);
                const clubOvr = Math.round(
                  roster.slice(0, 11).reduce((s, p) => s + p.ovr, 0) / 11
                );
                const isSelected = club.id === selectedClub.id;
                return (
                  <button
                    key={club.id}
                    onClick={() => setSelectedClubId(club.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-400/40'
                        : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClubBadge club={club} size="md" />
                      <div className="truncate">
                        <div className="font-bold text-sm text-white truncate">
                          {club.shortName}{' '}
                          <span className="text-[11px] font-semibold text-slate-400">
                            ({club.state})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {formatMoney(club.cash)} · {club.stadium}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-black text-amber-300">
                        {clubOvr}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Raio-X do Clube Selecionado */}
          <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div
              style={{
                background: `linear-gradient(135deg, ${selectedClub.primaryColor} 0%, #0f172a 90%)`,
              }}
              className="p-5 border-b border-white/15 flex items-center gap-4"
            >
              <ClubBadge club={selectedClub} size="xl" />
              <div className="min-w-0">
                <span className="inline-block text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 text-amber-300 mb-1">
                  Brasileirão Série {selectedClub.division} · {selectedClub.state}
                </span>
                <h2 className="text-2xl font-black text-white truncate drop-shadow">
                  {selectedClub.shortName}
                </h2>
                <p className="text-xs text-white/80 truncate">{selectedClub.name}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
              <div>
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Shield className="w-3.5 h-3.5 text-amber-400" /> Força Média
                    </div>
                    <div className="text-xl font-black text-amber-300 mt-0.5">{avgOvr}</div>
                  </div>
                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Caixa Inicial
                    </div>
                    <div className="text-sm sm:text-base font-black text-emerald-400 mt-1 truncate">
                      {formatMoney(selectedClub.cash)}
                    </div>
                  </div>
                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Landmark className="w-3.5 h-3.5 text-sky-400" /> Estádio
                    </div>
                    <div className="text-xs font-bold text-white mt-1 truncate">
                      {selectedClub.stadium}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {selectedClub.capacity.toLocaleString('pt-BR')} lug.
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" /> Principais Jogadores do Elenco ({selectedRoster.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Formação base: {selectedClub.tactics.formation}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl max-h-[250px] overflow-y-auto divide-y divide-slate-800/70">
                  {selectedRoster.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded font-black text-[11px] flex items-center justify-center shrink-0 ${
                            p.pos === 'G'
                              ? 'bg-amber-500/20 text-amber-300'
                              : p.pos === 'Z' || p.pos === 'L'
                              ? 'bg-sky-500/20 text-sky-300'
                              : p.pos === 'M'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {p.pos}
                        </span>
                        <span className="font-semibold text-slate-100 truncate">{p.name}</span>
                        {p.star && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-400">{p.age}a</span>
                        <span className="text-[11px] text-slate-400 w-14 text-right">
                          {p.traits[0]}/{p.traits[1]}
                        </span>
                        <span className="font-black text-amber-300 w-6 text-right">{p.ovr}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onStartNewCareer(coachName, selectedClub.id, rounds)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base sm:text-lg shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                ASSUMIR O {selectedClub.shortName.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
