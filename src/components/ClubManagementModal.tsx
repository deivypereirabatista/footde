import React, { useState } from 'react';
import {
  X,
  Landmark,
  Wallet,
  Sparkles,
  Trophy,
  TrendingUp,
  Ticket,
  Hammer,
} from 'lucide-react';
import { CareerState } from '../types/brasfoot';
import { formatMoney } from '../engine/gameEngine';

interface ClubManagementModalProps {
  state: CareerState;
  initialTab?: 'STADIUM' | 'FINANCE' | 'YOUTH' | 'TROPHIES';
  onChangeTicketPrice: (price: number) => void;
  onExpandStadium: (seats: number, cost: number) => { ok: boolean; message: string };
  onPromoteYouth: () => { ok: boolean; message: string };
  onUpgradeYouthAcademy: (cost: number) => { ok: boolean; message: string };
  onClose: () => void;
}

export const ClubManagementModal: React.FC<ClubManagementModalProps> = ({
  state,
  initialTab = 'STADIUM',
  onChangeTicketPrice,
  onExpandStadium,
  onPromoteYouth,
  onUpgradeYouthAcademy,
  onClose,
}) => {
  const [tab, setTab] = useState<'STADIUM' | 'FINANCE' | 'YOUTH' | 'TROPHIES'>(initialTab);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const roster = state.players.filter((p) => p.clubId === club.id);
  const wageBill = roster.reduce((s, p) => s + p.wage, 0);

  // Estimativa de público médio conforme preço do ingresso
  const idealPrice = club.division === 'A' ? 45 + club.fanbase * 0.45 : 25 + club.fanbase * 0.3;
  const ratio = club.tactics.ticketPrice / Math.max(15, idealPrice);
  const estFill = Math.min(
    0.96,
    Math.max(0.2, (club.fanbase / 100) * (ratio <= 1 ? 0.95 : Math.pow(1 / ratio, 1.45)))
  );
  const estAttendance = Math.round(club.capacity * estFill);
  const estRevenue = estAttendance * club.tactics.ticketPrice;

  const userTrophies = state.trophies.filter((t) => t.championId === state.userClubId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Landmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">
              Gestão do Clube — {club.shortName}
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
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap gap-2">
          {[
            { id: 'STADIUM', label: '🏟️ Estádio & Ingressos' },
            { id: 'FINANCE', label: '💵 Finanças & Extrato' },
            { id: 'YOUTH', label: '🌟 Categorias de Base' },
            { id: 'TROPHIES', label: '🏆 Sala de Troféus' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as typeof tab);
                setMsg(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                tab === t.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div
            className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              msg.ok
                ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950 border border-rose-500/60 text-rose-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {tab === 'STADIUM' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Estádio</div>
                  <div className="text-lg font-black text-white mt-0.5">{club.stadium}</div>
                  <div className="text-xs text-emerald-400 font-bold mt-1">
                    Capacidade: {club.capacity.toLocaleString('pt-BR')} lugares
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Público Estimado (Casa)</div>
                  <div className="text-lg font-black text-amber-300 mt-0.5">
                    ~{estAttendance.toLocaleString('pt-BR')} torcedores
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Ocupação média: {Math.round(estFill * 100)}%
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Renda Estimada por Jogo</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    {formatMoney(estRevenue)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Caixa atual: {formatMoney(club.cash)}
                  </div>
                </div>
              </div>

              {/* Preço do Ingresso */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-black text-white mb-3">
                  <Ticket className="w-4 h-4 text-amber-400" /> Definir Preço do Ingresso
                </div>
                <div className="flex flex-wrap gap-2">
                  {[20, 35, 50, 70, 95, 130, 170].map((p) => (
                    <button
                      key={p}
                      onClick={() => onChangeTicketPrice(p)}
                      className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition ${
                        club.tactics.ticketPrice === p
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      R$ {p}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2.5">
                  Dica Brasfoot: ingressos caros demais afastam a torcida; ajuste de acordo com a divisão e tamanho da torcida ({club.fanbase}/100).
                </p>
              </div>

              {/* Obras de Ampliação */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-black text-white mb-3">
                  <Hammer className="w-4 h-4 text-emerald-400" /> Ampliar Capacidade do {club.stadium}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { seats: 2500, cost: 4_500_000, title: 'Arquibancada Popular' },
                    { seats: 6000, cost: 10_000_000, title: 'Cadeiras Cobertas' },
                    { seats: 12000, cost: 19_500_000, title: 'Anel Superior Completo' },
                  ].map((opt) => (
                    <div
                      key={opt.seats}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{opt.title}</div>
                        <div className="text-base font-black text-amber-300 mt-0.5">
                          +{opt.seats.toLocaleString('pt-BR')} lugares
                        </div>
                        <div className="text-xs text-emerald-400 font-semibold mt-1">
                          Custo: {formatMoney(opt.cost)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const r = onExpandStadium(opt.seats, opt.cost);
                          setMsg({ ok: r.ok, text: r.message });
                        }}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Construir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'FINANCE' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Wallet className="w-4 h-4 text-emerald-400" /> Saldo em Caixa
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {formatMoney(club.cash)}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <TrendingUp className="w-4 h-4 text-sky-400" /> Patrocínio ({club.sponsorName})
                  </div>
                  <div className="text-lg font-black text-sky-300 mt-1">
                    +{formatMoney(club.sponsorPerRound)} / rodada
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Folha Salarial ({roster.length} atletas)</div>
                  <div className="text-lg font-black text-rose-400 mt-1">
                    -{formatMoney(wageBill)} / rodada
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Últimas Movimentações Financeiras
                </h3>
                <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto text-xs">
                  {state.ledger.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="text-slate-300">{item.description}</span>
                      <span
                        className={`font-bold shrink-0 ${
                          item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.amount >= 0 ? '+' : ''}
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'YOUTH' && (
            <div className="space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 font-black text-base">
                    <Sparkles className="w-5 h-5" /> Centro de Formação de Atletas — Nível {club.youthLevel}/5
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Quanto maior o nível da sua base, mais fortes e talentosos serão os jovens de 16 a 18 anos promovidos ao elenco profissional!
                  </p>
                </div>

                {club.youthLevel < 5 && (
                  <button
                    onClick={() => {
                      const upgradeCost = club.youthLevel * 6_000_000;
                      const r = onUpgradeYouthAcademy(upgradeCost);
                      setMsg({ ok: r.ok, text: r.message });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                  >
                    Evoluir Base ({formatMoney(club.youthLevel * 6_000_000)})
                  </button>
                )}
              </div>

              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-5 text-center space-y-3">
                <h3 className="text-base font-black text-white">
                  Promover Joia do Sub-20 na Temporada {state.year}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Você pode subir gratuitamente 1 revelação por temporada diretamente para o elenco profissional. Jovens evoluem rapidamente a cada virada de ano!
                </p>
                <button
                  disabled={state.youthUsedThisSeason}
                  onClick={() => {
                    const r = onPromoteYouth();
                    setMsg({ ok: r.ok, text: r.message });
                  }}
                  className={`px-6 py-3 rounded-xl font-black text-sm transition ${
                    state.youthUsedThisSeason
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg'
                  }`}
                >
                  {state.youthUsedThisSeason
                    ? '✓ Revelação já promovida nesta temporada'
                    : '🌟 Subir Jogador da Base Agora'}
                </button>
              </div>
            </div>
          )}

          {tab === 'TROPHIES' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Pontos de Técnico</div>
                  <div className="text-xl font-black text-amber-300 mt-0.5">{state.managerScore}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Vitórias</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">{state.careerWins}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Empates / Derrotas</div>
                  <div className="text-xl font-black text-slate-200 mt-0.5">
                    {state.careerDraws} / {state.careerLosses}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Títulos Conquistados</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">{userTrophies.length}</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> Galeria de Campeões
                </h3>
                {state.trophies.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Os primeiros campeões serão coroados ao fim das competições!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {state.trophies.map((t, i) => (
                      <div
                        key={i}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-amber-300 mr-2">{t.year}</span>
                          <span className="font-bold text-white">{t.competition}</span>
                        </div>
                        <div>
                          <span className="font-black text-emerald-400">🏆 {t.championName}</span>
                          <span className="text-slate-500 ml-2">(Vice: {t.runnerUpName})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
