import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Trophy,
  Briefcase,
  Landmark,
  Sparkles,
  Wand2,
  Star,
  AlertCircle,
  LogOut,
  Award,
  Volume2,
} from 'lucide-react';
import {
  CareerState,
  Club,
  FormationId,
  IncomingOffer,
  MarkingStyle,
  PassStyle,
  Player,
  PlayStyle,
  TRAIT_NAMES,
} from './types/brasfoot';
import { assignBestLineup } from './data/clubsAndPlayers';
import { FORMATIONS, getCompatibilityMultiplier } from './data/formations';
import {
  computeStandings,
  createNewCareer,
  evaluateClubStrength,
  finalizeStepResults,
  formatMoney,
  generateYouthWonderkid,
  LiveMatchState,
  startNextSeason,
} from './engine/gameEngine';
import { ClubBadge } from './components/ClubBadge';
import { loadCareer, saveCareer } from './utils/saveStore';
import { StartScreen } from './components/StartScreen';
import { PitchView } from './components/PitchView';
import { LiveMatchModal } from './components/LiveMatchModal';
import { TablesModal } from './components/TablesModal';
import { TransferMarketModal } from './components/TransferMarketModal';
import { ClubManagementModal } from './components/ClubManagementModal';


export default function App() {
  const [savedPreview, setSavedPreview] = useState<CareerState | null>(null);

  // Carrega o save do IndexedDB ao abrir o jogo
  useEffect(() => {
    let alive = true;
    loadCareer().then((saved) => {
      if (alive && saved) setSavedPreview(saved);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [career, setCareer] = useState<CareerState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Modais ativos
  const [liveRoundMatches, setLiveRoundMatches] = useState<LiveMatchState[] | null>(null);
  const [tablesModalTab, setTablesModalTab] = useState<'A' | 'B' | 'COPA' | 'ROUNDS' | 'SCORERS' | null>(null);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [clubModalTab, setClubModalTab] = useState<'STADIUM' | 'FINANCE' | 'YOUTH' | 'TROPHIES' | null>(null);
  const [seasonEndModal, setSeasonEndModal] = useState(false);

  // Salva automaticamente a cada alteração na carreira
  useEffect(() => {
    if (career) {
      // pequeno atraso agrupa várias alterações seguidas num único salvamento
      const t = setTimeout(() => {
        saveCareer(career)
          .then(() => setSavedPreview(career))
          .catch((err) => console.error('Falha ao salvar carreira', err));
      }, 400);
      return () => clearTimeout(t);
    }
  }, [career]);

  const clubsMap = useMemo(() => {
    if (!career) return new Map<string, Club>();
    return new Map(career.clubs.map((c) => [c.id, c]));
  }, [career]);

  const userClub = useMemo(() => {
    if (!career) return null;
    return clubsMap.get(career.userClubId) || null;
  }, [career, clubsMap]);

  const userPlayers = useMemo(() => {
    if (!career) return [];
    return career.players.filter((p) => p.clubId === career.userClubId);
  }, [career]);

  const starters = useMemo(() => {
    return userPlayers
      .filter((p) => p.isStarter)
      .sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
  }, [userPlayers]);

  const reserves = useMemo(() => {
    const posOrder = { G: 1, L: 2, Z: 3, M: 4, A: 5 };
    return userPlayers
      .filter((p) => !p.isStarter)
      .sort((a, b) =>
        posOrder[a.pos] !== posOrder[b.pos]
          ? posOrder[a.pos] - posOrder[b.pos]
          : b.ovr - a.ovr
      );
  }, [userPlayers]);

  const userStandingPos = useMemo(() => {
    if (!career || !userClub) return 1;
    const div = userClub.division === 'B' ? 'B' : 'A';
    const rows = computeStandings(career.clubs, career.fixtures, div);
    return rows.findIndex((r) => r.clubId === userClub.id) + 1;
  }, [career, userClub]);

  const teamStrength = useMemo(() => {
    if (!userClub) return null;
    return evaluateClubStrength(userClub, userPlayers, true);
  }, [userClub, userPlayers]);

  const stepFixtures = useMemo(() => {
    if (!career) return [];
    return career.fixtures.filter(
      (f) => f.calendarStep === career.currentStep && f.homeId !== 'TBD'
    );
  }, [career]);

  const userNextFixture = useMemo(() => {
    if (!career) return null;
    return (
      stepFixtures.find(
        (f) => f.homeId === career.userClubId || f.awayId === career.userClubId
      ) || null
    );
  }, [career, stepFixtures]);

  const invalidStartersCount = useMemo(() => {
    return starters.filter((p) => p.suspended > 0 || p.injured > 0).length;
  }, [starters]);

  // Tela Inicial se não houver carreira aberta
  if (!career || !userClub) {
    return (
      <StartScreen
        savedCareer={savedPreview}
        onContinueCareer={() => {
          if (savedPreview) setCareer(savedPreview);
        }}
        onStartNewCareer={(coachName, clubId, rounds) => {
          const fresh = createNewCareer(coachName, clubId, rounds);
          setCareer(fresh);
        }}
      />
    );
  }

  const isSeasonComplete = career.currentStep > career.maxStep;
  const slots = FORMATIONS[userClub.tactics.formation];

  // Troca de jogadores (Titular <-> Reserva ou Titular <-> Titular)
  const handleSelectOrSwapPlayer = (clickedId: string) => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(clickedId);
      return;
    }
    if (selectedPlayerId === clickedId) {
      setSelectedPlayerId(null);
      return;
    }

    const p1 = userPlayers.find((p) => p.id === selectedPlayerId);
    const p2 = userPlayers.find((p) => p.id === clickedId);
    if (!p1 || !p2) {
      setSelectedPlayerId(null);
      return;
    }

    setCareer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) => {
          if (p.id === p1.id) {
            return { ...p, isStarter: p2.isStarter, slotIndex: p2.slotIndex };
          }
          if (p.id === p2.id) {
            return { ...p, isStarter: p1.isStarter, slotIndex: p1.slotIndex };
          }
          return p;
        }),
      };
    });
    setSelectedPlayerId(null);
  };

  const handleAutoLineup = () => {
    const aligned = assignBestLineup(userPlayers, userClub.tactics.formation);
    const alignedMap = new Map(aligned.map((p) => [p.id, p]));
    setCareer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) => alignedMap.get(p.id) || p),
      };
    });
    setSelectedPlayerId(null);
  };

  const updateUserTactics = (
    patch: Partial<{
      formation: FormationId;
      style: PlayStyle;
      passing: PassStyle;
      marking: MarkingStyle;
      captainId: string;
      setPieceId: string;
      ticketPrice: number;
    }>
  ) => {
    setCareer((prev) => {
      if (!prev) return prev;
      let nextPlayers = prev.players;
      // Se trocou a formação, garante que os 11 titulares tenham slotIndex de 0 a 10
      if (patch.formation) {
        const myCurrent = prev.players.filter((p) => p.clubId === prev.userClubId);
        const curStarters = myCurrent
          .filter((p) => p.isStarter)
          .sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
        const slotMap = new Map<string, number>();
        curStarters.slice(0, 11).forEach((p, idx) => slotMap.set(p.id, idx));
        nextPlayers = prev.players.map((p) =>
          slotMap.has(p.id) ? { ...p, slotIndex: slotMap.get(p.id) } : p
        );
      }

      return {
        ...prev,
        players: nextPlayers,
        clubs: prev.clubs.map((c) =>
          c.id === prev.userClubId
            ? { ...c, tactics: { ...c.tactics, ...patch } }
            : c
        ),
      };
    });
  };

  // Inicia simulação ao vivo da rodada atual
  const handlePlayRound = () => {
    if (isSeasonComplete) {
      setSeasonEndModal(true);
      return;
    }
    if (stepFixtures.length === 0) {
      setCareer((prev) =>
        prev ? { ...prev, currentStep: prev.currentStep + 1 } : prev
      );
      return;
    }

    const initialLive: LiveMatchState[] = stepFixtures.map((fx) => ({
      fixture: { ...fx, homeGoals: 0, awayGoals: 0, events: [] },
      homeRedCards: 0,
      awayRedCards: 0,
      homeShots: 0,
      awayShots: 0,
      homePossession: 50,
      subsUsedUser: 0,
      sentOffPlayerIds: [],
      injuredPlayerIds: [],
      yellowPlayerIds: [],
    }));
    setLiveRoundMatches(initialLive);
  };

  const handleFinishLiveRound = (
    completedMatches: LiveMatchState[],
    updatedUserClub: Club,
    updatedUserRoster: Player[]
  ) => {
    const rosterMap = new Map(updatedUserRoster.map((p) => [p.id, p]));
    const syncedState: CareerState = {
      ...career,
      clubs: career.clubs.map((c) =>
        c.id === updatedUserClub.id ? updatedUserClub : c
      ),
      players: career.players.map((p) => rosterMap.get(p.id) || p),
    };

    const nextState = finalizeStepResults(syncedState, completedMatches);
    setCareer(nextState);
    setLiveRoundMatches(null);
    if (nextState.currentStep > nextState.maxStep) {
      setSeasonEndModal(true);
    }
  };

  // Comprar jogador no Mercado da Bola
  const handleBuyPlayer = (player: Player, fee: number) => {
    if (userClub.cash < fee) {
      return { ok: false, message: 'Saldo insuficiente em caixa para esta operação!' };
    }
    if (userPlayers.length >= 28) {
      return {
        ok: false,
        message: 'Seu elenco atingiu o limite máximo de 28 atletas! Venda alguém antes.',
      };
    }

    const sellerClub = clubsMap.get(player.clubId);
    setCareer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id === prev.userClubId) return { ...c, cash: c.cash - fee };
          if (sellerClub && c.id === sellerClub.id) return { ...c, cash: c.cash + fee };
          return c;
        }),
        players: prev.players.map((p) =>
          p.id === player.id
            ? {
                ...p,
                clubId: prev.userClubId,
                isStarter: false,
                slotIndex: undefined,
                value: Math.max(p.value, fee),
              }
            : p
        ),
        ledger: [
          {
            id: `buy_${Date.now()}`,
            step: prev.currentStep,
            description: `Contratação de ${player.name} (${sellerClub?.shortName || 'Passe Livre'})`,
            amount: -fee,
          },
          ...prev.ledger,
        ],
        news: [
          `✍️ REFORÇO NO ${userClub.shortName.toUpperCase()}! ${player.name} (Força ${player.ovr}) assina por ${formatMoney(fee)}.`,
          ...prev.news,
        ],
      };
    });

    return {
      ok: true,
      message: `${player.name} foi contratado pelo ${userClub.shortName} com sucesso!`,
    };
  };

  // Vender jogador do próprio elenco
  const handleSellMyPlayer = (player: Player, fee: number) => {
    if (userPlayers.length <= 14) {
      return {
        ok: false,
        message: 'Mantenha pelo menos 14 jogadores no elenco para disputar a temporada!',
      };
    }
    const potentialBuyers = career.clubs.filter(
      (c) => c.id !== career.userClubId && c.cash >= fee
    );
    const buyer =
      potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)] ||
      career.clubs.find((c) => c.id !== career.userClubId)!;

    setCareer((prev) => {
      if (!prev) return prev;
      const updatedPlayers = prev.players.map((p) =>
        p.id === player.id
          ? { ...p, clubId: buyer.id, isStarter: false, slotIndex: undefined }
          : p
      );
      // Se vendeu um titular, re-escala automaticamente uma vaga
      const myRemaining = updatedPlayers.filter((p) => p.clubId === prev.userClubId);
      const fixedMy = player.isStarter
        ? assignBestLineup(myRemaining, userClub.tactics.formation)
        : myRemaining;
      const fixedMap = new Map(fixedMy.map((p) => [p.id, p]));

      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id === prev.userClubId) return { ...c, cash: c.cash + fee };
          if (c.id === buyer.id) return { ...c, cash: Math.max(0, c.cash - fee) };
          return c;
        }),
        players: updatedPlayers.map((p) => fixedMap.get(p.id) || p),
        incomingOffers: prev.incomingOffers.filter((o) => o.playerId !== player.id),
        ledger: [
          {
            id: `sell_${Date.now()}`,
            step: prev.currentStep,
            description: `Venda de ${player.name} para ${buyer.shortName}`,
            amount: fee,
          },
          ...prev.ledger,
        ],
        news: [
          `💰 NEGÓCIO FECHADO: ${userClub.shortName} vende ${player.name} ao ${buyer.shortName} por ${formatMoney(fee)}.`,
          ...prev.news,
        ],
      };
    });

    return {
      ok: true,
      message: `${player.name} vendido para ${buyer.shortName} por ${formatMoney(fee)}!`,
    };
  };

  const handleRespondIncomingOffer = (offer: IncomingOffer, accept: boolean) => {
    if (!accept) {
      setCareer((prev) =>
        prev
          ? {
              ...prev,
              incomingOffers: prev.incomingOffers.filter((o) => o.id !== offer.id),
            }
          : prev
      );
      return;
    }

    const pl = userPlayers.find((p) => p.id === offer.playerId);
    if (!pl || userPlayers.length <= 14) return;

    setCareer((prev) => {
      if (!prev) return prev;
      const updatedPlayers = prev.players.map((p) =>
        p.id === pl.id
          ? { ...p, clubId: offer.fromClubId, isStarter: false, slotIndex: undefined }
          : p
      );
      const myRemaining = updatedPlayers.filter((p) => p.clubId === prev.userClubId);
      const fixedMy = pl.isStarter
        ? assignBestLineup(myRemaining, userClub.tactics.formation)
        : myRemaining;
      const fixedMap = new Map(fixedMy.map((p) => [p.id, p]));

      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id === prev.userClubId) return { ...c, cash: c.cash + offer.amount };
          if (c.id === offer.fromClubId) return { ...c, cash: Math.max(0, c.cash - offer.amount) };
          return c;
        }),
        players: updatedPlayers.map((p) => fixedMap.get(p.id) || p),
        incomingOffers: prev.incomingOffers.filter((o) => o.id !== offer.id),
        ledger: [
          {
            id: `off_acc_${Date.now()}`,
            step: prev.currentStep,
            description: `Venda de ${pl.name} ao ${offer.fromClubName}`,
            amount: offer.amount,
          },
          ...prev.ledger,
        ],
        news: [
          `✈️ TRANSFERÊNCIA: ${pl.name} deixa o ${userClub.shortName} rumo ao ${offer.fromClubName} por ${formatMoney(offer.amount)}!`,
          ...prev.news,
        ],
      };
    });
  };

  // Estádio & Base
  const handleExpandStadium = (seats: number, cost: number) => {
    if (userClub.cash < cost) {
      return { ok: false, message: 'Caixa insuficiente para iniciar a obra no estádio!' };
    }
    setCareer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === prev.userClubId
            ? { ...c, cash: c.cash - cost, capacity: c.capacity + seats }
            : c
        ),
        ledger: [
          {
            id: `std_${Date.now()}`,
            step: prev.currentStep,
            description: `Ampliação do ${userClub.stadium} (+${seats.toLocaleString('pt-BR')} lugares)`,
            amount: -cost,
          },
          ...prev.ledger,
        ],
        news: [
          `🏟️ ${userClub.stadium} ampliado em +${seats.toLocaleString('pt-BR')} lugares!`,
          ...prev.news,
        ],
      };
    });
    return {
      ok: true,
      message: `Obras concluídas! ${userClub.stadium} agora comporta ${(userClub.capacity + seats).toLocaleString('pt-BR')} torcedores.`,
    };
  };

  const handlePromoteYouth = () => {
    if (career.youthUsedThisSeason) {
      return { ok: false, message: 'Você já promoveu um atleta da base nesta temporada!' };
    }
    if (userPlayers.length >= 28) {
      return { ok: false, message: 'Elenco cheio (28 jogadores). Venda um jogador antes!' };
    }
    const kid = generateYouthWonderkid(userClub);
    setCareer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        youthUsedThisSeason: true,
        players: [...prev.players, kid],
        news: [
          `🌟 JOIA DA BASE! ${kid.name} (${kid.pos}, ${kid.age} anos, Força ${kid.ovr}) subiu ao profissional do ${userClub.shortName}!`,
          ...prev.news,
        ],
      };
    });
    return {
      ok: true,
      message: `Revelação promovida: ${kid.name} (${kid.pos} · ${kid.age} anos · Força ${kid.ovr})!`,
    };
  };

  const handleUpgradeYouth = (cost: number) => {
    if (userClub.cash < cost) {
      return { ok: false, message: 'Saldo insuficiente para modernizar o CT da base!' };
    }
    setCareer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === prev.userClubId
            ? { ...c, cash: c.cash - cost, youthLevel: Math.min(5, c.youthLevel + 1) }
            : c
        ),
        ledger: [
          {
            id: `yth_${Date.now()}`,
            step: prev.currentStep,
            description: `Modernização do CT da Base`,
            amount: -cost,
          },
          ...prev.ledger,
        ],
      };
    });
    return { ok: true, message: 'Centro de Formação evoluído com sucesso!' };
  };

  const opponentClub = userNextFixture
    ? clubsMap.get(
        userNextFixture.homeId === userClub.id
          ? userNextFixture.awayId
          : userNextFixture.homeId
      )
    : null;

  const isHomeNext = userNextFixture ? userNextFixture.homeId === userClub.id : false;

  const posBadgeStyle = (pos: string) => {
    switch (pos) {
      case 'G':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'L':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Z':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'M':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Banner Superior com as Cores do Clube igual no Brasfoot */}
      <header
        style={{
          background: `linear-gradient(125deg, ${userClub.primaryColor} 0%, #0f172a 72%)`,
        }}
        className="border-b-2 border-amber-400/50 shadow-xl"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <ClubBadge club={userClub} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow">
                  {userClub.shortName}
                </h1>
                <span className="px-2 py-0.5 rounded bg-black/45 text-amber-300 text-xs font-black">
                  Série {userClub.division} · {userStandingPos}º Lugar
                </span>
                <span className="px-2 py-0.5 rounded bg-black/45 text-emerald-300 text-xs font-bold">
                  Caixa: {formatMoney(userClub.cash)}
                </span>
              </div>
              <div className="text-xs text-white/80 mt-0.5 flex flex-wrap gap-x-3">
                <span>👔 Téc. {career.coachName}</span>
                <span>🏟️ {userClub.stadium} ({userClub.capacity.toLocaleString('pt-BR')})</span>
                <span>📅 Temporada {career.year}</span>
              </div>
            </div>
          </div>

          {/* Barra de Atalhos do Brasfoot */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setTablesModalTab(userClub.division === 'B' ? 'B' : 'A')}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Tabelas & Copa
            </button>

            <button
              onClick={() => setShowMarketModal(true)}
              className="relative px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-emerald-400" />
              Mercado
              {career.incomingOffers.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-bounce">
                  {career.incomingOffers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setClubModalTab('STADIUM')}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-sky-400" />
              Estádio & Finanças
            </button>

            <button
              onClick={() => setClubModalTab('YOUTH')}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Base
            </button>

            <button
              onClick={() => setClubModalTab('TROPHIES')}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4 text-yellow-400" />
              Troféus
            </button>

            <button
              onClick={() => setCareer(null)}
              title="Voltar ao Menu Inicial (Seu jogo já está salvo!)"
              className="px-2.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal: Esquerda Elenco (Titulares + Reservas) | Direita Tática + Campinho + Próximo Jogo */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUNA ESQUERDA: TABELA DO ELENCO ESTILO BRASFOOT */}
        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Plantel do {userClub.shortName} ({userPlayers.length} jogadores)
              </h2>
              <p className="text-[11px] text-slate-400">
                {selectedPlayerId
                  ? '🔄 Agora clique em outro jogador para trocar de posição!'
                  : 'Clique em um titular e depois em um reserva para substituir'}
              </p>
            </div>

            <button
              onClick={handleAutoLineup}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600 hover:text-white border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Escalar Automático
            </button>
          </div>

          {/* Aviso se houver suspenso/lesionado nos titulares */}
          {invalidStartersCount > 0 && (
            <div className="bg-rose-950/80 border-b border-rose-500/50 px-4 py-2 flex items-center justify-between text-xs text-rose-200">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                Atenção: há {invalidStartersCount} titular(es) suspenso(s) ou no DM!
              </span>
              <button
                onClick={handleAutoLineup}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Corrigir Time
              </button>
            </div>
          )}

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left border-collapse select-none">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                  <th className="py-2 px-2.5">Pos</th>
                  <th className="py-2 px-2">Função</th>
                  <th className="py-2 px-2">Jogador</th>
                  <th className="py-2 px-2 text-center">Id.</th>
                  <th className="py-2 px-2 text-center font-black text-amber-300">Força</th>
                  <th className="py-2 px-2 hidden sm:table-cell">Carac.</th>
                  <th className="py-2 px-2 w-20">Energia</th>
                  <th className="py-2 px-2.5 text-center">Gols</th>
                </tr>
              </thead>
              <tbody>
                {/* Faixa Titulares */}
                <tr className="bg-emerald-950/50 border-y border-emerald-500/30">
                  <td colSpan={8} className="py-1 px-3 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    ⚽ 11 Titulares Escalados ({userClub.tactics.formation})
                  </td>
                </tr>
                {starters.map((p, idx) => {
                  const slot = slots[p.slotIndex ?? idx] || slots[idx];
                  const compat = slot ? getCompatibilityMultiplier(p.pos, slot.reqPos) : 1;
                  const isSelected = selectedPlayerId === p.id;
                  const isCap = userClub.tactics.captainId === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectOrSwapPlayer(p.id)}
                      className={`border-b border-slate-800/60 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-400/25 ring-1 ring-inset ring-amber-400'
                          : 'hover:bg-slate-800/65'
                      }`}
                    >
                      <td className="py-1.5 px-2.5">
                        <span
                          className={`inline-flex w-5 h-5 rounded border items-center justify-center font-black text-[11px] ${posBadgeStyle(
                            p.pos
                          )}`}
                        >
                          {p.pos}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-bold text-slate-400 text-[11px]">
                        {slot?.roleLabel || '-'}
                        {compat < 1 && (
                          <span className="ml-1 px-1 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                            IMP
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 font-bold text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          {p.star && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                          {isCap && (
                            <span className="px-1 rounded bg-sky-500/25 text-sky-300 text-[9px] font-black">
                              C
                            </span>
                          )}
                          {p.yellowCards % 3 > 0 && (
                            <span className="text-[10px]" title={`${p.yellowCards} amarelos`}>
                              {'🟨'.repeat(p.yellowCards % 3)}
                            </span>
                          )}
                          {p.suspended > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black">
                              SUS ({p.suspended})
                            </span>
                          )}
                          {p.injured > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-700 text-white text-[9px] font-black">
                              🏥 DM ({p.injured})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-300">{p.age}</td>
                      <td className="py-1.5 px-2 text-center font-black text-amber-300 text-sm">
                        {p.ovr}
                      </td>
                      <td
                        className="py-1.5 px-2 text-slate-400 hidden sm:table-cell text-[11px]"
                        title={`${TRAIT_NAMES[p.traits[0]]} / ${TRAIT_NAMES[p.traits[1]]}`}
                      >
                        {p.traits[0]}/{p.traits[1]}
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${p.energy}%` }}
                              className={`h-full ${
                                p.energy >= 75
                                  ? 'bg-emerald-400'
                                  : p.energy >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">{p.energy}%</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-bold text-slate-200">
                        {p.goals > 0 ? p.goals : '-'}
                      </td>
                    </tr>
                  );
                })}

                {/* Faixa Reservas */}
                <tr className="bg-slate-950 border-y border-slate-800">
                  <td colSpan={8} className="py-1 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    🪑 Banco de Reservas & Suplentes ({reserves.length})
                  </td>
                </tr>
                {reserves.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectOrSwapPlayer(p.id)}
                      className={`border-b border-slate-800/50 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-400/25 ring-1 ring-inset ring-amber-400'
                          : 'hover:bg-slate-800/55 text-slate-300'
                      }`}
                    >
                      <td className="py-1.5 px-2.5">
                        <span
                          className={`inline-flex w-5 h-5 rounded border items-center justify-center font-black text-[11px] ${posBadgeStyle(
                            p.pos
                          )}`}
                        >
                          {p.pos}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-[11px] text-slate-500">RES</td>
                      <td className="py-1.5 px-2 font-semibold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          {p.star && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                          {p.suspended > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black">
                              SUS ({p.suspended})
                            </span>
                          )}
                          {p.injured > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-700 text-white text-[9px] font-black">
                              🏥 DM ({p.injured})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-400">{p.age}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-amber-300/90">
                        {p.ovr}
                      </td>
                      <td
                        className="py-1.5 px-2 text-slate-500 hidden sm:table-cell text-[11px]"
                        title={`${TRAIT_NAMES[p.traits[0]]} / ${TRAIT_NAMES[p.traits[1]]}`}
                      >
                        {p.traits[0]}/{p.traits[1]}
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${p.energy}%` }}
                              className={`h-full ${
                                p.energy >= 75
                                  ? 'bg-emerald-400'
                                  : p.energy >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{p.energy}%</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 text-center text-slate-400">
                        {p.goals > 0 ? p.goals : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* COLUNA DIREITA: PRÓXIMO JOGO + BOTÃO JOGAR + PRANCHETA TÁTICA E CAMPINHO */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Card Próximo Compromisso */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            {isSeasonComplete ? (
              <div className="text-center space-y-3">
                <div className="text-xs font-black uppercase text-amber-300">
                  Fim do Calendário {career.year}
                </div>
                <p className="text-sm text-slate-200 font-semibold">
                  Todas as rodadas da temporada {career.year} foram concluídas!
                </p>
                <button
                  onClick={() => setSeasonEndModal(true)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base shadow-lg cursor-pointer"
                >
                  🏆 VER PREMIAÇÃO E INICIAR {career.year + 1}
                </button>
              </div>
            ) : userNextFixture && opponentClub ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black uppercase tracking-wider text-amber-300">
                    {userNextFixture.stageName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {isHomeNext ? `Em Casa (${userClub.stadium})` : `Fora (${opponentClub.stadium})`}
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ClubBadge club={isHomeNext ? userClub : opponentClub} size="md" />
                    <div className="truncate">
                      <div className="font-black text-sm text-white truncate">
                        {(isHomeNext ? userClub : opponentClub).shortName}
                      </div>
                      <div className="text-[10px] text-slate-400">Mandante</div>
                    </div>
                  </div>

                  <span className="font-black text-slate-500 text-base px-2">VS</span>

                  <div className="flex items-center gap-2.5 min-w-0 text-right">
                    <div className="truncate">
                      <div className="font-black text-sm text-white truncate">
                        {(isHomeNext ? opponentClub : userClub).shortName}
                      </div>
                      <div className="text-[10px] text-slate-400">Visitante</div>
                    </div>
                    <ClubBadge club={isHomeNext ? opponentClub : userClub} size="md" />
                  </div>
                </div>

                <button
                  onClick={handlePlayRound}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  JOGAR PARTIDA AO VIVO
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="text-xs font-black uppercase text-amber-300">
                  {stepFixtures[0]?.stageName || 'Data da Copa do Brasil'}
                </div>
                <p className="text-xs text-slate-300">
                  O {userClub.shortName} folga nesta data da Copa do Brasil (elenco descansa e recupera energia!).
                </p>
                <button
                  onClick={handlePlayRound}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm cursor-pointer"
                >
                  Simular Rodada da Copa do Brasil
                </button>
              </div>
            )}
          </div>

          {/* Prancheta Tática + Campinho 2D */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                📋 Esquema Tático & Posicionamento
              </h3>
              {teamStrength && (
                <div className="flex gap-2 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                    DEF {Math.round(teamStrength.def)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                    MEI {Math.round(teamStrength.mid)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-rose-300">
                    ATA {Math.round(teamStrength.att)}
                  </span>
                </div>
              )}
            </div>

            <PitchView
              club={userClub}
              starters={starters}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={handleSelectOrSwapPlayer}
            />

            {/* Seletores Táticos Clássicos do Brasfoot */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Formação Tática
                </label>
                <select
                  value={userClub.tactics.formation}
                  onChange={(e) =>
                    updateUserTactics({ formation: e.target.value as FormationId })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  {(Object.keys(FORMATIONS) as FormationId[]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Estilo de Jogo
                </label>
                <select
                  value={userClub.tactics.style}
                  onChange={(e) => updateUserTactics({ style: e.target.value as PlayStyle })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  {(
                    [
                      'Retranca',
                      'Contra-Ataque',
                      'Equilibrado',
                      'Ofensivo',
                      'Ataque Total',
                    ] as PlayStyle[]
                  ).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Troca de Passes
                </label>
                <select
                  value={userClub.tactics.passing}
                  onChange={(e) => updateUserTactics({ passing: e.target.value as PassStyle })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  {(['Misto', 'Toque de Bola', 'Bola Longa', 'Pelos Lados'] as PassStyle[]).map(
                    (ps) => (
                      <option key={ps} value={ps}>
                        {ps}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Marcação
                </label>
                <select
                  value={userClub.tactics.marking}
                  onChange={(e) =>
                    updateUserTactics({ marking: e.target.value as MarkingStyle })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  {(['Leve', 'Normal', 'Pesada'] as MarkingStyle[]).map((mk) => (
                    <option key={mk} value={mk}>
                      {mk}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Capitão da Equipe
                </label>
                <select
                  value={userClub.tactics.captainId || ''}
                  onChange={(e) => updateUserTactics({ captainId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  {starters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.pos} · Força {p.ovr})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Giro de Notícias */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
              <Volume2 className="w-3.5 h-3.5" /> Bastidores & Notícias da Bola
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto text-xs text-slate-300 pr-1">
              {career.news.slice(0, 6).map((item, idx) => (
                <div key={idx} className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* MODAL: PARTIDA AO VIVO */}
      {liveRoundMatches && (
        <LiveMatchModal
          state={career}
          stepFixtures={liveRoundMatches}
          onFinishRound={handleFinishLiveRound}
        />
      )}

      {/* MODAL: TABELAS, COPA DO BRASIL, RODADAS E ARTILHARIA */}
      {tablesModalTab && (
        <TablesModal
          state={career}
          initialTab={tablesModalTab}
          onClose={() => setTablesModalTab(null)}
        />
      )}

      {/* MODAL: MERCADO DA BOLA */}
      {showMarketModal && (
        <TransferMarketModal
          state={career}
          onBuyPlayer={handleBuyPlayer}
          onSellMyPlayer={handleSellMyPlayer}
          onRespondIncomingOffer={handleRespondIncomingOffer}
          onClose={() => setShowMarketModal(false)}
        />
      )}

      {/* MODAL: ESTÁDIO, FINANÇAS, BASE E TROFÉUS */}
      {clubModalTab && (
        <ClubManagementModal
          state={career}
          initialTab={clubModalTab}
          onChangeTicketPrice={(price) => updateUserTactics({ ticketPrice: price })}
          onExpandStadium={handleExpandStadium}
          onPromoteYouth={handlePromoteYouth}
          onUpgradeYouthAcademy={handleUpgradeYouth}
          onClose={() => setClubModalTab(null)}
        />
      )}

      {/* MODAL: ENCERRAMENTO DE TEMPORADA E PREMIAÇÃO */}
      {seasonEndModal && (
        <SeasonEndSummaryModal
          state={career}
          onAdvanceYear={() => {
            const next = startNextSeason(career);
            setCareer(next);
            setSeasonEndModal(false);
          }}
          onClose={() => setSeasonEndModal(false)}
        />
      )}
    </div>
  );
}

function SeasonEndSummaryModal({
  state,
  onAdvanceYear,
  onClose,
}: {
  state: CareerState;
  onAdvanceYear: () => void;
  onClose: () => void;
}) {
  const tableA = computeStandings(state.clubs, state.fixtures, 'A');
  const tableB = computeStandings(state.clubs, state.fixtures, 'B');
  const clubsMap = new Map(state.clubs.map((c) => [c.id, c]));

  const champA = clubsMap.get(tableA[0]?.clubId || '');
  const champB = clubsMap.get(tableB[0]?.clubId || '');
  const promoted = tableB.slice(0, 4).map((r) => clubsMap.get(r.clubId)?.shortName || '');
  const relegated = tableA.slice(-4).map((r) => clubsMap.get(r.clubId)?.shortName || '');
  const copaChamp = state.trophies.find(
    (t) => t.year === state.year && t.competition === 'Copa do Brasil'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-400 rounded-2xl shadow-2xl p-6 space-y-5 text-center">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
        <div>
          <h2 className="text-2xl font-black text-white">
            Resumo da Temporada {state.year}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Confira os campeões, acessos e rebaixamentos antes da virada do ano!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase text-amber-300">Campeão Série A</div>
            <div className="text-base font-black text-white mt-1">
              🏆 {champA?.shortName}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase text-emerald-400">Campeão Série B</div>
            <div className="text-base font-black text-white mt-1">
              🥇 {champB?.shortName}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase text-sky-300">Copa do Brasil</div>
            <div className="text-base font-black text-white mt-1">
              🏅 {copaChamp?.championName || '-'}
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-left space-y-2">
          <div>
            <strong className="text-emerald-400">⬆️ Acesso para a Série A {state.year + 1}:</strong>{' '}
            <span className="text-slate-200">{promoted.join(', ')}</span>
          </div>
          <div>
            <strong className="text-rose-400">⬇️ Rebaixados para a Série B {state.year + 1}:</strong>{' '}
            <span className="text-slate-200">{relegated.join(', ')}</span>
          </div>
          <div className="text-slate-400 pt-1">
            Ao avançar para {state.year + 1}, os prêmios da CBF entram em caixa, jovens do elenco evoluem de força e uma nova tabela será sorteada.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
          >
            Ver Tabelas Antes
          </button>
          <button
            onClick={onAdvanceYear}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg cursor-pointer"
          >
            INICIAR TEMPORADA {state.year + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}
