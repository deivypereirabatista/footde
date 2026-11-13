import React, { useMemo, useState } from 'react';
import { X, Search, Star, DollarSign, Briefcase, Check, XCircle } from 'lucide-react';
import { CareerState, IncomingOffer, Player, Position, TRAIT_NAMES } from '../types/brasfoot';
import { formatMoney } from '../engine/gameEngine';
import { ClubBadge } from './ClubBadge';
import { WORLD_LEAGUES, LEAGUE_BY_ID } from '../data/clubsAndPlayers';

// Ligas agrupadas por continente para o filtro de origem
const LEAGUES_BY_CONTINENT = WORLD_LEAGUES.reduce<Record<string, typeof WORLD_LEAGUES>>((acc, l) => {
  (acc[l.continent] ||= []).push(l);
  return acc;
}, {});

interface TransferMarketModalProps {
  state: CareerState;
  onBuyPlayer: (player: Player, fee: number) => { ok: boolean; message: string };
  onSellMyPlayer: (player: Player, fee: number) => { ok: boolean; message: string };
  onRespondIncomingOffer: (offer: IncomingOffer, accept: boolean) => void;
  onClose: () => void;
}

export const TransferMarketModal: React.FC<TransferMarketModalProps> = ({
  state,
  onBuyPlayer,
  onSellMyPlayer,
  onRespondIncomingOffer,
  onClose,
}) => {
  const [tab, setTab] = useState<'BUY' | 'OFFERS' | 'SELL'>(
    state.incomingOffers.length > 0 ? 'OFFERS' : 'BUY'
  );
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<'ALL' | Position>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL'); // ALL | FREE | A | B | INT | CONT:<continente> | LG:<liga>
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
  const [offerMultiplier, setOfferMultiplier] = useState<number>(1.1);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const userClub = state.clubs.find((c) => c.id === state.userClubId)!;
  const clubsMap = useMemo(() => new Map(state.clubs.map((c) => [c.id, c])), [state.clubs]);

  const marketList = useMemo(() => {
    return state.players
      .filter((p) => {
        if (p.clubId === state.userClubId) return false;
        if (posFilter !== 'ALL' && p.pos !== posFilter) return false;
        if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;

        if (originFilter === 'FREE') {
          if (p.clubId !== 'FREE') return false;
        } else if (originFilter !== 'ALL') {
          const cl = clubsMap.get(p.clubId);
          if (!cl) return false;
          if (originFilter.startsWith('LG:')) {
            if (cl.leagueId !== originFilter.slice(3)) return false;
          } else if (originFilter.startsWith('CONT:')) {
            if (cl.continent !== originFilter.slice(5)) return false;
          } else if (cl.division !== originFilter) return false;
        }

        if (affordableOnly) {
          const cost = p.clubId === 'FREE' ? p.wage * 3 : p.value;
          if (cost > userClub.cash) return false;
        }
        return true;
      })
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, 80);
  }, [state.players, state.userClubId, posFilter, query, originFilter, affordableOnly, clubsMap, userClub.cash]);

  const myRoster = useMemo(
    () =>
      state.players
        .filter((p) => p.clubId === state.userClubId)
        .sort((a, b) => b.ovr - a.ovr),
    [state.players, state.userClubId]
  );

  const handleConfirmBid = () => {
    if (!negotiatingPlayer) return;
    const isFree = negotiatingPlayer.clubId === 'FREE';
    const fee = isFree
      ? negotiatingPlayer.wage * 3
      : Math.round((negotiatingPlayer.value * offerMultiplier) / 50000) * 50000;

    // Chance de aceitação depende da porcentagem oferecida sobre o valor de mercado
    if (!isFree) {
      const sellerRosterCount = state.players.filter(
        (p) => p.clubId === negotiatingPlayer.clubId
      ).length;
      if (sellerRosterCount <= 13) {
        setFeedback({
          ok: false,
          text: 'O clube vendedor recusou pois está com elenco reduzido demais!',
        });
        return;
      }
      const acceptProb =
        offerMultiplier >= 1.2
          ? 0.96
          : offerMultiplier >= 1.08
          ? 0.8
          : offerMultiplier >= 1.0
          ? 0.48
          : 0.15;
      if (Math.random() > acceptProb) {
        setFeedback({
          ok: false,
          text: `${clubsMap.get(negotiatingPlayer.clubId)?.shortName} recusou a oferta por ${negotiatingPlayer.name}! Tente oferecer um valor maior.`,
        });
        return;
      }
    }

    const res = onBuyPlayer(negotiatingPlayer, fee);
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) setNegotiatingPlayer(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Topo */}
        <div className="px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-black text-white">Mercado da Bola</h2>
              <p className="text-xs text-slate-400">
                Caixa disponível no {userClub.shortName}:{' '}
                <strong className="text-emerald-400">{formatMoney(userClub.cash)}</strong>
              </p>
            </div>
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
          <button
            onClick={() => setTab('BUY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
              tab === 'BUY'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🔎 Contratar Jogadores
          </button>
          <button
            onClick={() => setTab('OFFERS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer flex items-center gap-1.5 ${
              tab === 'OFFERS'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📩 Propostas Recebidas
            {state.incomingOffers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                {state.incomingOffers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('SELL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
              tab === 'SELL'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💰 Vender do Meu Elenco ({myRoster.length})
          </button>
        </div>

        {feedback && (
          <div
            className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
              feedback.ok
                ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/90 border border-rose-500/60 text-rose-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {tab === 'BUY' && (
            <div>
              {/* Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-4">
                <div className="sm:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nome (ex: Neymar, Estêvão, Messi)..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={posFilter}
                    onChange={(e) => setPosFilter(e.target.value as typeof posFilter)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="ALL">Todas as Posições</option>
                    <option value="G">G - Goleiros</option>
                    <option value="L">L - Laterais</option>
                    <option value="Z">Z - Zagueiros</option>
                    <option value="M">M - Meias</option>
                    <option value="A">A - Atacantes</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="ALL">Todos os Mercados</option>
                    <option value="FREE">Sem Contrato (Passe Livre)</option>
                    <option value="A">Brasileirão Série A</option>
                    <option value="B">Brasileirão Série B</option>
                    <option value="INT">Exterior / Mundo (todos)</option>
                    {Object.entries(LEAGUES_BY_CONTINENT).map(([continent, leagues]) => (
                      <optgroup key={continent} label={continent}>
                        <option value={`CONT:${continent}`}>{continent} (todas as ligas)</option>
                        {leagues
                          .filter((l) => l.cc !== 'BRA')
                          .map((l) => (
                            <option key={l.id} value={`LG:${l.id}`}>
                              {l.country} — {l.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-center">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={affordableOnly}
                      onChange={(e) => setAffordableOnly(e.target.checked)}
                      className="accent-emerald-500"
                    />
                    Cabe no caixa
                  </label>
                </div>
              </div>

              {/* Caixa de Negociação Ativa */}
              {negotiatingPlayer && (
                <div className="mb-4 bg-slate-950 border-2 border-amber-400/70 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-amber-300 font-bold uppercase">
                      Negociando Contratação
                    </div>
                    <div className="text-base font-black text-white mt-0.5">
                      {negotiatingPlayer.name} ({negotiatingPlayer.pos} · Força {negotiatingPlayer.ovr} · {negotiatingPlayer.age} anos)
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Salário pedido: {formatMoney(negotiatingPlayer.wage)}/rodada · Habilidades:{' '}
                      {TRAIT_NAMES[negotiatingPlayer.traits[0]]} e {TRAIT_NAMES[negotiatingPlayer.traits[1]]}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {negotiatingPlayer.clubId !== 'FREE' ? (
                      <div className="flex gap-1.5">
                        {[
                          { m: 1.0, label: '100%' },
                          { m: 1.12, label: '112%' },
                          { m: 1.25, label: '125% (Forte)' },
                        ].map((opt) => (
                          <button
                            key={opt.m}
                            onClick={() => setOfferMultiplier(opt.m)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                              offerMultiplier === opt.m
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <button
                      onClick={handleConfirmBid}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Oferecer{' '}
                      {formatMoney(
                        negotiatingPlayer.clubId === 'FREE'
                          ? negotiatingPlayer.wage * 3
                          : Math.round((negotiatingPlayer.value * offerMultiplier) / 50000) * 50000
                      )}
                    </button>
                    <button
                      onClick={() => setNegotiatingPlayer(null)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Jogadores */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                      <th className="py-2 px-2.5">Pos</th>
                      <th className="py-2 px-2.5">Jogador</th>
                      <th className="py-2 px-2.5">Clube Atual</th>
                      <th className="py-2 px-2.5 text-center">Idade</th>
                      <th className="py-2 px-2.5 text-center">Força</th>
                      <th className="py-2 px-2.5 hidden sm:table-cell">Carac.</th>
                      <th className="py-2 px-2.5 text-right">Passe / Luvas</th>
                      <th className="py-2 px-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {marketList.map((p) => {
                      const cl = clubsMap.get(p.clubId);
                      const isFree = p.clubId === 'FREE';
                      const cost = isFree ? p.wage * 3 : p.value;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/50">
                          <td className="py-2 px-2.5 font-black text-amber-300">{p.pos}</td>
                          <td className="py-2 px-2.5 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.nat && <span className="text-[10px] font-semibold text-slate-500">{p.nat}</span>}
                              {p.star && (
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2.5">
                            {isFree ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">
                                Passe Livre
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {cl && <ClubBadge club={cl} size="xs" />}
                                <span className="text-slate-300">{cl?.shortName}</span>
                                {cl?.leagueId && cl.division === 'INT' && (
                                  <span className="text-[10px] text-slate-500 hidden md:inline">
                                    {LEAGUE_BY_ID[cl.leagueId]?.country}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-300">{p.age}</td>
                          <td className="py-2 px-2.5 text-center font-black text-amber-300 text-sm">
                            {p.ovr}
                          </td>
                          <td className="py-2 px-2.5 text-slate-400 hidden sm:table-cell">
                            {p.traits[0]} / {p.traits[1]}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-emerald-400">
                            {formatMoney(cost)}
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <button
                              onClick={() => {
                                setNegotiatingPlayer(p);
                                setOfferMultiplier(1.12);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Proposta
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'OFFERS' && (
            <div className="space-y-3">
              {state.incomingOffers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Nenhuma proposta oficial recebida no momento. Continue jogando as rodadas!
                </div>
              ) : (
                state.incomingOffers.map((off) => {
                  const buyer = clubsMap.get(off.fromClubId);
                  const pl = state.players.find((p) => p.id === off.playerId);
                  return (
                    <div
                      key={off.id}
                      className="bg-slate-950 border border-amber-400/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {buyer && <ClubBadge club={buyer} size="md" />}
                        <div>
                          <div className="text-xs text-amber-300 font-bold uppercase">
                            Proposta Oficial de {off.fromClubName}
                          </div>
                          <div className="text-base font-black text-white">
                            {off.playerName}{' '}
                            {pl && (
                              <span className="text-xs font-semibold text-slate-400">
                                ({pl.pos} · Força {pl.ovr})
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-emerald-400 mt-0.5">
                            Valor oferecido à vista: {formatMoney(off.amount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onRespondIncomingOffer(off, true)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Aceitar Venda
                        </button>
                        <button
                          onClick={() => onRespondIncomingOffer(off, false)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" /> Recusar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'SELL' && (
            <div>
              <p className="text-xs text-slate-400 mb-3">
                Venda imediata para clubes interessados por <strong>85% do valor de mercado</strong> (mínimo de 14 jogadores no elenco).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                      <th className="py-2 px-2.5">Pos</th>
                      <th className="py-2 px-2.5">Jogador</th>
                      <th className="py-2 px-2.5 text-center">Idade</th>
                      <th className="py-2 px-2.5 text-center">Força</th>
                      <th className="py-2 px-2.5 text-right">Salário</th>
                      <th className="py-2 px-2.5 text-right">Valor de Venda (85%)</th>
                      <th className="py-2 px-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {myRoster.map((p) => {
                      const salePrice = Math.round((p.value * 0.85) / 50000) * 50000;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/50">
                          <td className="py-2 px-2.5 font-black text-amber-300">{p.pos}</td>
                          <td className="py-2 px-2.5 font-bold text-white">
                            {p.name} {p.isStarter && <span className="text-[10px] text-emerald-400">(Titular)</span>}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-300">{p.age}</td>
                          <td className="py-2 px-2.5 text-center font-black text-amber-300">{p.ovr}</td>
                          <td className="py-2 px-2.5 text-right text-slate-400">
                            {formatMoney(p.wage)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-emerald-400">
                            {formatMoney(salePrice)}
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <button
                              onClick={() => {
                                const res = onSellMyPlayer(p, salePrice);
                                setFeedback({ ok: res.ok, text: res.message });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                            >
                              <DollarSign className="w-3 h-3" /> Vender
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
