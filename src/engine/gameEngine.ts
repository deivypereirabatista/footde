import {
  calcMarketValue,
  calcWage,
  assignBestLineup,
  buildInitialDatabase,
} from '../data/clubsAndPlayers';
import { FORMATIONS, getCompatibilityMultiplier } from '../data/formations';
import {
  CareerState,
  Club,
  CompetitionType,
  Fixture,
  MatchEvent,
  Player,
  Position,
  SeasonSummary,
  StandingRow,
  Trait,
} from '../types/brasfoot';
import { CAREER_VERSION } from '../utils/saveStore';


// Gera tabela Todos contra Todos (método Berger)
function generateRoundRobinPairs(clubIds: string[], doubleRound: boolean): [string, string][][] {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push('BYE');
  const n = teams.length;
  const numRounds = n - 1;
  const half = n / 2;
  const rounds: [string, string][][] = [];

  const rotating = teams.slice(1);
  for (let r = 0; r < numRounds; r++) {
    const roundPairs: [string, string][] = [];
    const current = [teams[0], ...rotating];
    for (let i = 0; i < half; i++) {
      const t1 = current[i];
      const t2 = current[n - 1 - i];
      if (t1 !== 'BYE' && t2 !== 'BYE') {
        if ((r + i) % 2 === 0) roundPairs.push([t1, t2]);
        else roundPairs.push([t2, t1]);
      }
    }
    rounds.push(roundPairs);
    rotating.unshift(rotating.pop()!);
  }

  if (doubleRound) {
    const secondHalf = rounds.map((rPairs) =>
      rPairs.map(([h, a]) => [a, h] as [string, string])
    );
    return [...rounds, ...secondHalf];
  }
  return rounds;
}

const COPA_STAGE_NAMES: Record<number, string> = {
  1: 'Copa do Brasil - 1ª Fase',
  2: 'Copa do Brasil - Oitavas',
  3: 'Copa do Brasil - Quartas',
  4: 'Copa do Brasil - Semifinal',
  5: 'Copa do Brasil - Final',
};

export const COPA_PRIZES: Record<number, number> = {
  1: 2_500_000,
  2: 4_200_000,
  3: 7_000_000,
  4: 13_500_000,
  5: 48_000_000, // Campeão
};

export function generateSeasonCalendar(
  clubs: Club[],
  userClubId: string,
  totalLeagueRounds: 19 | 38
): { fixtures: Fixture[]; copaParticipants: string[]; maxStep: number } {
  const serieAIds = clubs.filter((c) => c.division === 'A').map((c) => c.id);
  const serieBIds = clubs.filter((c) => c.division === 'B').map((c) => c.id);

  const doubleRound = totalLeagueRounds === 38;
  const roundsA = generateRoundRobinPairs(serieAIds, doubleRound);
  const roundsB = generateRoundRobinPairs(serieBIds, doubleRound);

  // Seleciona 32 clubes para a Copa do Brasil (20 Série A + 12 Série B incluindo o clube do usuário)
  const serieBSorted = clubs
    .filter((c) => c.division === 'B')
    .sort((a, b) => b.fanbase - a.fanbase);
  const pickedB = serieBSorted.slice(0, 12).map((c) => c.id);
  if (serieBIds.includes(userClubId) && !pickedB.includes(userClubId)) {
    pickedB[pickedB.length - 1] = userClubId;
  }
  const copa32 = [...serieAIds, ...pickedB];
  // Embaralha copa32
  for (let i = copa32.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copa32[i], copa32[j]] = [copa32[j], copa32[i]];
  }

  // Define depois de quais rodadas da liga acontecem as 5 fases da Copa do Brasil
  const cupAfterLeagueRound =
    totalLeagueRounds === 19 ? [3, 7, 11, 15, 18] : [6, 13, 21, 29, 35];

  const fixtures: Fixture[] = [];
  let step = 1;
  let fCounter = 1;
  let cupPhase = 1;

  for (let lr = 1; lr <= totalLeagueRounds; lr++) {
    const pairsA = roundsA[lr - 1] || [];
    const pairsB = roundsB[lr - 1] || [];

    for (const [homeId, awayId] of pairsA) {
      fixtures.push({
        id: `fix_${fCounter++}`,
        calendarStep: step,
        round: lr,
        competition: 'SERIE_A',
        stageName: `Brasileirão Série A - Rodada ${lr}`,
        homeId,
        awayId,
        homeGoals: 0,
        awayGoals: 0,
        played: false,
        events: [],
      });
    }

    for (const [homeId, awayId] of pairsB) {
      fixtures.push({
        id: `fix_${fCounter++}`,
        calendarStep: step,
        round: lr,
        competition: 'SERIE_B',
        stageName: `Brasileirão Série B - Rodada ${lr}`,
        homeId,
        awayId,
        homeGoals: 0,
        awayGoals: 0,
        played: false,
        events: [],
      });
    }
    step++;

    if (cupAfterLeagueRound.includes(lr)) {
      if (cupPhase === 1) {
        // Já cria os confrontos da 1ª Fase (32 clubes -> 16 jogos)
        for (let i = 0; i < copa32.length; i += 2) {
          fixtures.push({
            id: `fix_cup_1_${i}`,
            calendarStep: step,
            round: 1,
            competition: 'COPA_BR',
            stageName: COPA_STAGE_NAMES[1],
            homeId: copa32[i],
            awayId: copa32[i + 1],
            homeGoals: 0,
            awayGoals: 0,
            played: false,
            events: [],
          });
        }
      } else {
        // Placeholder step reservado para as próximas fases da Copa (geradas conforme avançam!)
        fixtures.push({
          id: `cup_placeholder_${cupPhase}`,
          calendarStep: step,
          round: cupPhase,
          competition: 'COPA_BR',
          stageName: COPA_STAGE_NAMES[cupPhase],
          homeId: 'TBD',
          awayId: 'TBD',
          homeGoals: 0,
          awayGoals: 0,
          played: false,
          events: [],
        });
      }
      cupPhase++;
      step++;
    }
  }

  return {
    fixtures,
    copaParticipants: copa32,
    maxStep: step - 1,
  };
}

export function createNewCareer(
  coachName: string,
  userClubId: string,
  totalLeagueRounds: 19 | 38
): CareerState {
  const { clubs, players } = buildInitialDatabase();
  const updatedClubs = clubs.map((c) =>
    c.id === userClubId ? { ...c, coachName: coachName.trim() || 'Técnico' } : c
  );
  const { fixtures, copaParticipants, maxStep } = generateSeasonCalendar(
    updatedClubs,
    userClubId,
    totalLeagueRounds
  );
  const userClub = updatedClubs.find((c) => c.id === userClubId)!;

  return {
    version: CAREER_VERSION,
    coachName: coachName.trim() || 'Técnico',
    userClubId,
    year: 2026,
    totalLeagueRounds,
    currentStep: 1,
    maxStep,
    clubs: updatedClubs,
    players,
    fixtures,
    copaActiveClubIds: copaParticipants,
    incomingOffers: [],
    ledger: [
      {
        id: 'init_1',
        step: 0,
        description: `Saldo inicial em caixa (${userClub.shortName})`,
        amount: userClub.cash,
      },
    ],
    trophies: [],
    history: [],
    news: [
      `🎙️ ${coachName.trim() || 'Novo treinador'} assume o comando do ${userClub.shortName} para a temporada 2026!`,
      `🏆 Brasileirão (${totalLeagueRounds} rodadas) e Copa do Brasil estão prestes a começar.`,
    ],
    managerScore: 100,
    careerWins: 0,
    careerDraws: 0,
    careerLosses: 0,
    youthUsedThisSeason: false,
  };
}

export function computeStandings(
  clubs: Club[],
  fixtures: Fixture[],
  division: 'A' | 'B'
): StandingRow[] {
  const comp: CompetitionType = division === 'A' ? 'SERIE_A' : 'SERIE_B';
  const divClubs = clubs.filter((c) => c.division === division);
  const map = new Map<string, StandingRow>();

  for (const c of divClubs) {
    map.set(c.id, {
      clubId: c.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: [],
    });
  }

  const playedFixtures = fixtures
    .filter((f) => f.competition === comp && f.played)
    .sort((a, b) => a.round - b.round);

  for (const f of playedFixtures) {
    const h = map.get(f.homeId);
    const a = map.get(f.awayId);
    if (!h || !a) continue;

    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;

    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      h.form = [...h.form.slice(-4), 'V'];
      a.lost++;
      a.form = [...a.form.slice(-4), 'D'];
    } else if (f.awayGoals > f.homeGoals) {
      a.won++;
      a.points += 3;
      a.form = [...a.form.slice(-4), 'V'];
      h.lost++;
      h.form = [...h.form.slice(-4), 'D'];
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
      h.form = [...h.form.slice(-4), 'E'];
      a.form = [...a.form.slice(-4), 'E'];
    }
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;
  }

  return Array.from(map.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.won !== x.won) return y.won - x.won;
    if (y.gd !== x.gd) return y.gd - x.gd;
    return y.gf - x.gf;
  });
}

export interface TeamStrength {
  gk: number;
  def: number;
  mid: number;
  att: number;
  overall: number;
  cardFactor: number;
  starters: Player[];
}

export function evaluateClubStrength(
  club: Club,
  clubPlayers: Player[],
  isHome: boolean,
  redCardsInMatch = 0
): TeamStrength {
  const slots = FORMATIONS[club.tactics.formation];
  const starters = clubPlayers
    .filter((p) => p.isStarter && p.suspended === 0 && p.injured === 0)
    .sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));

  let gkSum = 0;
  let gkCount = 0;
  let defSum = 0;
  let defCount = 0;
  let midSum = 0;
  let midCount = 0;
  let attSum = 0;
  let attCount = 0;

  starters.forEach((p, idx) => {
    const slot = slots[p.slotIndex ?? idx] || slots[idx] || slots[5];
    const compat = getCompatibilityMultiplier(p.pos, slot.reqPos);
    const energyMod = p.energy >= 80 ? 1.0 : 0.72 + (p.energy / 80) * 0.28;
    const starBonus = p.star ? 2.2 : 0;
    const capBonus = club.tactics.captainId === p.id ? 1.5 : 0;
    const eff = p.ovr * compat * energyMod + starBonus + capBonus;

    if (slot.reqPos === 'G') {
      gkSum += eff;
      gkCount++;
    } else if (slot.reqPos === 'Z' || slot.reqPos === 'L') {
      defSum += eff;
      defCount++;
    } else if (slot.reqPos === 'M') {
      midSum += eff;
      midCount++;
    } else {
      attSum += eff;
      attCount++;
    }
  });

  // Penalidade caso escale menos de 11 jogadores aptos ou sem goleiro
  const missingPenalty = Math.max(0, 11 - starters.length) * 6;
  const gk = gkCount > 0 ? gkSum / gkCount : 42;
  let def = (defCount > 0 ? defSum / defCount : 55) * 0.75 + gk * 0.25 - missingPenalty;
  let mid = (midCount > 0 ? midSum / midCount : 55) - missingPenalty;
  let att = (attCount > 0 ? attSum / attCount : 55) * 0.75 + mid * 0.25 - missingPenalty;

  // Modificadores de estilo de jogo
  switch (club.tactics.style) {
    case 'Ataque Total':
      att *= 1.13;
      def *= 0.88;
      break;
    case 'Ofensivo':
      att *= 1.07;
      def *= 0.94;
      break;
    case 'Contra-Ataque':
      def *= 1.05;
      att *= 1.03;
      break;
    case 'Retranca':
      def *= 1.13;
      att *= 0.87;
      break;
  }

  // Modificador de marcação
  let cardFactor = 1.0;
  if (club.tactics.marking === 'Pesada') {
    def *= 1.04;
    cardFactor = 1.85;
  } else if (club.tactics.marking === 'Leve') {
    def *= 0.96;
    cardFactor = 0.55;
  }

  // Fator casa
  if (isHome) {
    const homeBoost = 1.03 + (club.fanbase / 100) * 0.025;
    def *= homeBoost;
    mid *= homeBoost;
    att *= homeBoost;
  }

  // Expulsões em andamento na partida
  if (redCardsInMatch > 0) {
    const redMod = Math.pow(0.87, redCardsInMatch);
    def *= redMod;
    mid *= redMod;
    att *= redMod;
  }

  const overall = Math.round((gk + def + mid + att) / 4);
  return { gk, def, mid, att, overall, cardFactor, starters };
}

export interface LiveMatchState {
  fixture: Fixture;
  homeRedCards: number;
  awayRedCards: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  subsUsedUser: number;
  sentOffPlayerIds: string[];
  injuredPlayerIds: string[];
  yellowPlayerIds: string[]; // rastreia 2º amarelo na mesma partida
}

function pickWeightedPlayer(players: Player[], posWeights: Record<Position, number>, bonusTrait?: Trait): Player {
  if (players.length === 0) {
    return {
      id: 'fallback',
      name: 'Jogador',
      pos: 'A',
      age: 24,
      ovr: 70,
      traits: ['Fin', 'Vel'],
      energy: 90,
      morale: 80,
      yellowCards: 0,
      suspended: 0,
      injured: 0,
      goals: 0,
      assists: 0,
      matches: 0,
      wage: 20000,
      value: 1000000,
      clubId: '',
      isStarter: true,
    };
  }
  const weights = players.map((p) => {
    let w = (posWeights[p.pos] || 1) * (p.ovr / 70);
    if (bonusTrait && p.traits.includes(bonusTrait)) w *= 1.65;
    if (p.star) w *= 1.35;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < players.length; i++) {
    r -= weights[i];
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

export function simulateMatchMinute(
  lm: LiveMatchState,
  minute: number,
  clubsMap: Map<string, Club>,
  playersByClub: Map<string, Player[]>
): { updated: LiveMatchState; goalScoredBy?: string } {
  const home = clubsMap.get(lm.fixture.homeId);
  const away = clubsMap.get(lm.fixture.awayId);
  if (!home || !away) return { updated: lm };

  const homeActive = (playersByClub.get(home.id) || []).filter(
    (p) => p.isStarter && !lm.sentOffPlayerIds.includes(p.id) && !lm.injuredPlayerIds.includes(p.id)
  );
  const awayActive = (playersByClub.get(away.id) || []).filter(
    (p) => p.isStarter && !lm.sentOffPlayerIds.includes(p.id) && !lm.injuredPlayerIds.includes(p.id)
  );

  const hStr = evaluateClubStrength(home, homeActive, true, lm.homeRedCards);
  const aStr = evaluateClubStrength(away, awayActive, false, lm.awayRedCards);

  // Atualiza posse de bola suavemente
  const rawPoss = Math.round((hStr.mid / Math.max(1, hStr.mid + aStr.mid)) * 100);
  const jitter = Math.floor(Math.random() * 7) - 3;
  const homePossession = Math.max(28, Math.min(72, Math.round(lm.homePossession * 0.7 + (rawPoss + jitter) * 0.3)));

  const events = [...lm.fixture.events];
  let homeGoals = lm.fixture.homeGoals;
  let awayGoals = lm.fixture.awayGoals;
  let homeShots = lm.homeShots;
  let awayShots = lm.awayShots;
  let homeRedCards = lm.homeRedCards;
  let awayRedCards = lm.awayRedCards;
  const sentOffPlayerIds = [...lm.sentOffPlayerIds];
  const injuredPlayerIds = [...lm.injuredPlayerIds];
  const yellowPlayerIds = [...lm.yellowPlayerIds];
  let goalScoredBy: string | undefined;

  // Probabilidade de lance ofensivo do mandante e visitante neste minuto
  const hDiff = hStr.att - aStr.def;
  const aDiff = aStr.att - hStr.def;

  const hShotProb = Math.max(0.035, Math.min(0.22, 0.105 + hDiff * 0.0042));
  const aShotProb = Math.max(0.03, Math.min(0.20, 0.092 + aDiff * 0.0042));

  const tryAttack = (
    attClub: Club,
    defClub: Club,
    attPlayers: Player[],
    defPlayers: Player[],
    attStr: TeamStrength,
    defStr: TeamStrength,
    isHomeTeam: boolean
  ) => {
    if (isHomeTeam) homeShots++;
    else awayShots++;

    const diff = attStr.att - defStr.def;
    const baseGoalChance = Math.max(0.11, Math.min(0.42, 0.235 + diff * 0.0065));
    const shooter = pickWeightedPlayer(attPlayers, { G: 0.01, Z: 0.35, L: 0.65, M: 1.8, A: 3.4 }, 'Fin');
    const keeper = defPlayers.find((p) => p.pos === 'G') || defPlayers[0];

    const roll = Math.random();
    if (roll < baseGoalChance) {
      // GOL!
      if (isHomeTeam) homeGoals++;
      else awayGoals++;
      goalScoredBy = attClub.id;

      // Escolhe assistente (72% dos gols têm assistência)
      const possibleAssisters = attPlayers.filter((p) => p.id !== shooter.id && p.pos !== 'G');
      const hasAssist = possibleAssisters.length > 0 && Math.random() < 0.72;
      const assister = hasAssist
        ? pickWeightedPlayer(possibleAssisters, { G: 0.05, Z: 0.3, L: 1.5, M: 2.8, A: 1.5 }, 'Arm')
        : undefined;

      const howDescriptions = shooter.traits.includes('Falta') && Math.random() < 0.18
        ? `em cobrança magistral de falta no ângulo!`
        : shooter.traits.includes('Cab') && Math.random() < 0.28
        ? `subindo no 3º andar de cabeça!`
        : shooter.traits.includes('Dri') && Math.random() < 0.3
        ? `depois de entortar o zagueiro e tocar na saída do goleiro!`
        : assister
        ? `após passe açucarado de ${assister.name}!`
        : `batendo firme no cantinho!`;

      events.push({
        minute,
        clubId: attClub.id,
        type: 'GOAL',
        playerName: shooter.name,
        assistName: assister?.name,
        text: `⚽ GOOOOOL DO ${attClub.shortName.toUpperCase()}! ${shooter.name} marca aos ${minute}' ${howDescriptions}`,
      });
    } else if (roll < baseGoalChance + 0.08 && keeper) {
      events.push({
        minute,
        clubId: defClub.id,
        type: 'SAVE',
        playerName: keeper.name,
        text: `🧤 DEFESAÇA! ${keeper.name} (${defClub.shortName}) espalma chute perigoso de ${shooter.name}!`,
      });
    } else if (roll < baseGoalChance + 0.115) {
      events.push({
        minute,
        clubId: attClub.id,
        type: 'WOODWORK',
        playerName: shooter.name,
        text: `💥 NA TRAVE! ${shooter.name} (${attClub.shortName}) solta uma bomba e carimba o travessão!`,
      });
    }
  };

  if (Math.random() < hShotProb) {
    tryAttack(home, away, homeActive, awayActive, hStr, aStr, true);
  } else if (Math.random() < aShotProb) {
    tryAttack(away, home, awayActive, homeActive, aStr, hStr, false);
  }

  // Cartões e faltas duras
  const cardCheck = (club: Club, active: Player[], cardFactor: number, isHomeTeam: boolean) => {
    if (active.length <= 7) return;
    if (Math.random() < 0.021 * cardFactor) {
      const offender = pickWeightedPlayer(active, { G: 0.1, Z: 2.4, L: 2.0, M: 2.1, A: 0.8 }, 'Mar');
      const alreadyBooked = yellowPlayerIds.includes(offender.id);
      const directRed = Math.random() < 0.08;

      if (directRed || alreadyBooked) {
        sentOffPlayerIds.push(offender.id);
        if (isHomeTeam) homeRedCards++;
        else awayRedCards++;
        events.push({
          minute,
          clubId: club.id,
          type: 'RED',
          playerName: offender.name,
          text: alreadyBooked
            ? `🟥 EXPULSO! ${offender.name} (${club.shortName}) recebe o 2º amarelo e vai mais cedo pro chuveiro!`
            : `🟥 CARTÃO VERMELHO DIRETO! Entrada dura de ${offender.name} (${club.shortName})!`,
        });
      } else {
        yellowPlayerIds.push(offender.id);
        events.push({
          minute,
          clubId: club.id,
          type: 'YELLOW',
          playerName: offender.name,
          text: `🟨 Cartão amarelo para ${offender.name} (${club.shortName}).`,
        });
      }
    }
  };

  cardCheck(home, homeActive, hStr.cardFactor, true);
  cardCheck(away, awayActive, aStr.cardFactor, false);

  // Risco pequeno de contusão
  if (Math.random() < 0.0035) {
    const isH = Math.random() < 0.5;
    const pool = (isH ? homeActive : awayActive).filter((p) => p.pos !== 'G');
    const cl = isH ? home : away;
    if (pool.length > 0) {
      const victim = pool[Math.floor(Math.random() * pool.length)];
      injuredPlayerIds.push(victim.id);
      events.push({
        minute,
        clubId: cl.id,
        type: 'INJURY',
        playerName: victim.name,
        text: `🏥 ${victim.name} (${cl.shortName}) sente fisgada muscular e preocupa o departamento médico!`,
      });
    }
  }

  return {
    updated: {
      ...lm,
      homeRedCards,
      awayRedCards,
      homeShots,
      awayShots,
      homePossession,
      sentOffPlayerIds,
      injuredPlayerIds,
      yellowPlayerIds,
      fixture: {
        ...lm.fixture,
        homeGoals,
        awayGoals,
        events,
      },
    },
    goalScoredBy,
  };
}

export function resolvePenaltyShootout(
  fixture: Fixture,
  clubsMap: Map<string, Club>,
  playersByClub: Map<string, Player[]>
): Fixture {
  if (
    fixture.competition !== 'COPA_BR' ||
    fixture.homeGoals !== fixture.awayGoals ||
    fixture.homePen !== undefined
  ) {
    return fixture;
  }
  const home = clubsMap.get(fixture.homeId)!;
  const away = clubsMap.get(fixture.awayId)!;
  const hPlayers = playersByClub.get(home.id) || [];
  const aPlayers = playersByClub.get(away.id) || [];

  const hGK = hPlayers.find((p) => p.isStarter && p.pos === 'G');
  const aGK = aPlayers.find((p) => p.isStarter && p.pos === 'G');
  const hSaveBonus = hGK?.traits.includes('DefP') ? 0.09 : 0;
  const aSaveBonus = aGK?.traits.includes('DefP') ? 0.09 : 0;

  let hPen = 0;
  let aPen = 0;
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.76 - aSaveBonus) hPen++;
    if (Math.random() < 0.76 - hSaveBonus) aPen++;
  }
  while (hPen === aPen) {
    const hHit = Math.random() < 0.74 - aSaveBonus;
    const aHit = Math.random() < 0.74 - hSaveBonus;
    if (hHit) hPen++;
    if (aHit) aPen++;
  }

  const winnerName = hPen > aPen ? home.shortName : away.shortName;
  const events: MatchEvent[] = [
    ...fixture.events,
    {
      minute: 90,
      clubId: hPen > aPen ? home.id : away.id,
      type: 'GOAL',
      playerName: winnerName,
      text: `🎯 PÊNALTIS: ${home.shortName} ${hPen} x ${aPen} ${away.shortName} — ${winnerName} avança na Copa do Brasil!`,
    },
  ];

  return {
    ...fixture,
    homePen: hPen,
    awayPen: aPen,
    events,
  };
}

export function calculateAttendance(home: Club, away: Club): { attendance: number; income: number } {
  const idealPrice = home.division === 'A' ? 45 + home.fanbase * 0.45 : 25 + home.fanbase * 0.3;
  const priceRatio = home.tactics.ticketPrice / Math.max(15, idealPrice);
  const priceDemand = priceRatio <= 1 ? 0.92 + (1 - priceRatio) * 0.15 : Math.max(0.22, Math.pow(1 / priceRatio, 1.45));
  const prestigeFactor = (home.fanbase * 0.65 + away.fanbase * 0.35) / 100;
  const fillRate = Math.min(0.98, Math.max(0.18, prestigeFactor * priceDemand * (0.88 + Math.random() * 0.18)));
  const attendance = Math.round(home.capacity * fillRate);
  const income = attendance * home.tactics.ticketPrice;
  return { attendance, income };
}

export function finalizeStepResults(
  state: CareerState,
  completedLiveMatches: LiveMatchState[]
): CareerState {
  const clubsMap = new Map(state.clubs.map((c) => [c.id, { ...c }]));
  const playersByClub = new Map<string, Player[]>();
  for (const p of state.players) {
    const list = playersByClub.get(p.clubId) || [];
    list.push({ ...p });
    playersByClub.set(p.clubId, list);
  }

  const finishedFixturesMap = new Map<string, Fixture>();
  const playedClubIds = new Set<string>();
  const newLedger = [...state.ledger];
  const newNews = [...state.news];
  let careerWins = state.careerWins;
  let careerDraws = state.careerDraws;
  let careerLosses = state.careerLosses;
  let managerScore = state.managerScore;

  for (const lm of completedLiveMatches) {
    let fx = resolvePenaltyShootout(lm.fixture, clubsMap, playersByClub);
    const home = clubsMap.get(fx.homeId)!;
    const away = clubsMap.get(fx.awayId)!;
    const { attendance, income } = calculateAttendance(home, away);

    fx = {
      ...fx,
      played: true,
      attendance,
      ticketIncome: income,
    };
    finishedFixturesMap.set(fx.id, fx);
    playedClubIds.add(home.id);
    playedClubIds.add(away.id);

    // Receita de bilheteria para o mandante
    home.cash += income;
    if (home.id === state.userClubId) {
      newLedger.unshift({
        id: `led_tkt_${fx.id}`,
        step: state.currentStep,
        description: `Bilheteria (${attendance.toLocaleString('pt-BR')} pagantes x ${away.shortName})`,
        amount: income,
      });
    }

    // Contabiliza carreira caso seja jogo do usuário
    if (fx.homeId === state.userClubId || fx.awayId === state.userClubId) {
      const isHome = fx.homeId === state.userClubId;
      const myG = isHome ? fx.homeGoals : fx.awayGoals;
      const opG = isHome ? fx.awayGoals : fx.homeGoals;
      if (myG > opG) {
        careerWins++;
        managerScore += 8;
      } else if (myG === opG) {
        careerDraws++;
        managerScore += 2;
      } else {
        careerLosses++;
        managerScore = Math.max(0, managerScore - 4);
      }
    }

    // Premiação da Copa do Brasil
    if (fx.competition === 'COPA_BR') {
      const homeAdvanced =
        fx.homeGoals > fx.awayGoals ||
        (fx.homeGoals === fx.awayGoals && (fx.homePen ?? 0) > (fx.awayPen ?? 0));
      const winner = homeAdvanced ? home : away;
      const loser = homeAdvanced ? away : home;
      const prize = COPA_PRIZES[fx.round] || 3_000_000;
      winner.cash += prize;

      if (fx.round === 5) {
        loser.cash += 20_000_000; // vice-campeão
        newNews.unshift(
          `🏆 ${winner.shortName.toUpperCase()} É CAMPEÃO DA COPA DO BRASIL ${state.year}! Vice: ${loser.shortName}.`
        );
      }

      if (winner.id === state.userClubId) {
        newLedger.unshift({
          id: `led_cup_${fx.id}`,
          step: state.currentStep,
          description: `Premiação CBF - Avanço na ${fx.stageName}`,
          amount: prize,
        });
      }
    }

    // Atualiza estatísticas de jogadores desta partida
    const hList = playersByClub.get(home.id) || [];
    const aList = playersByClub.get(away.id) || [];
    const bothLists = [...hList, ...aList];

    // Decrementa suspensões/lesões antigas de quem NÃO entrou em campo antes de aplicar novas
    for (const p of bothLists) {
      if (!p.isStarter) {
        if (p.suspended > 0) p.suspended--;
        if (p.injured > 0) p.injured--;
        p.energy = Math.min(100, p.energy + 22);
      } else if (p.suspended > 0 || p.injured > 0) {
        if (p.suspended > 0) p.suspended--;
        if (p.injured > 0) p.injured--;
        p.energy = Math.min(100, p.energy + 20);
      } else {
        p.matches++;
        const clubObj = p.clubId === home.id ? home : away;
        const styleDrain = clubObj.tactics.style === 'Ataque Total' ? 5 : clubObj.tactics.style === 'Ofensivo' ? 2 : 0;
        const ageDrain = p.age >= 34 ? 4 : p.age >= 30 ? 2 : 0;
        const posDrain = p.pos === 'G' ? 4 : 11;
        p.energy = Math.max(25, p.energy - (posDrain + styleDrain + ageDrain));
      }
    }

    // Aplica gols, assistências, cartões e lesões ocorridos no jogo
    for (const ev of fx.events) {
      const targetList = ev.clubId === home.id ? hList : aList;
      if (ev.type === 'GOAL') {
        const scorer = targetList.find((p) => p.name === ev.playerName);
        if (scorer) scorer.goals++;
        if (ev.assistName) {
          const assister = targetList.find((p) => p.name === ev.assistName);
          if (assister) assister.assists++;
        }
      } else if (ev.type === 'YELLOW') {
        const booked = targetList.find((p) => p.name === ev.playerName);
        if (booked) {
          booked.yellowCards++;
          if (booked.yellowCards % 3 === 0) {
            booked.suspended += 1;
          }
        }
      } else if (ev.type === 'RED') {
        const sent = targetList.find((p) => p.name === ev.playerName);
        if (sent) sent.suspended += 1;
      } else if (ev.type === 'INJURY') {
        const hurt = targetList.find((p) => p.name === ev.playerName);
        if (hurt) hurt.injured = Math.floor(Math.random() * 3) + 2;
      }
    }
  }

  // Clubes brasileiros que folgaram na rodada (ex: eliminados da Copa) recuperam energia e curam lesões
  for (const c of clubsMap.values()) {
    if (c.division === 'INT') continue;
    const roster = playersByClub.get(c.id) || [];
    if (!playedClubIds.has(c.id)) {
      for (const p of roster) {
        p.energy = Math.min(100, p.energy + 25);
        if (p.injured > 0) p.injured--;
      }
    }

    // Folha salarial e patrocínio apenas em rodadas da Liga (para manter economia equilibrada)
    const isLeagueStep = completedLiveMatches.some(
      (m) => m.fixture.competition === 'SERIE_A' || m.fixture.competition === 'SERIE_B'
    );
    if (isLeagueStep) {
      const wageBill = roster.reduce((acc, p) => acc + p.wage, 0);
      c.cash += c.sponsorPerRound - wageBill;
      if (c.id === state.userClubId) {
        newLedger.unshift(
          {
            id: `led_sp_${state.currentStep}`,
            step: state.currentStep,
            description: `Patrocínio (${c.sponsorName})`,
            amount: c.sponsorPerRound,
          },
          {
            id: `led_wg_${state.currentStep}`,
            step: state.currentStep,
            description: `Folha Salarial do Elenco (${roster.length} atletas)`,
            amount: -wageBill,
          }
        );
      }
    }

    // Re-escala automaticamente todos os clubes da CPU para nunca jogarem com suspensos/lesionados
    if (c.id !== state.userClubId) {
      playersByClub.set(c.id, assignBestLineup(roster, c.tactics.formation));
    } else {
      playersByClub.set(c.id, roster);
    }
  }

  // Atualiza lista de fixtures e avança chaveamento da Copa do Brasil se foi rodada de Copa
  let updatedFixtures = state.fixtures.map((f) => finishedFixturesMap.get(f.id) || f);
  let copaActiveClubIds = [...state.copaActiveClubIds];
  let newTrophies = [...state.trophies];

  const wasCopaStep =
    completedLiveMatches.length > 0 && completedLiveMatches[0].fixture.competition === 'COPA_BR';
  if (wasCopaStep) {
    const currentCupRound = completedLiveMatches[0].fixture.round;
    const winners: string[] = [];
    for (const lm of completedLiveMatches) {
      const fx = finishedFixturesMap.get(lm.fixture.id)!;
      const homeWon =
        fx.homeGoals > fx.awayGoals ||
        (fx.homeGoals === fx.awayGoals && (fx.homePen ?? 0) > (fx.awayPen ?? 0));
      winners.push(homeWon ? fx.homeId : fx.awayId);
    }
    copaActiveClubIds = winners;

    if (currentCupRound < 5 && winners.length >= 2) {
      const nextRound = currentCupRound + 1;
      const placeholder = updatedFixtures.find(
        (f) => f.competition === 'COPA_BR' && f.round === nextRound && f.homeId === 'TBD'
      );
      if (placeholder) {
        const nextStep = placeholder.calendarStep;
        updatedFixtures = updatedFixtures.filter((f) => f.id !== placeholder.id);
        for (let i = 0; i < winners.length; i += 2) {
          if (!winners[i + 1]) break;
          updatedFixtures.push({
            id: `fix_cup_${nextRound}_${i}`,
            calendarStep: nextStep,
            round: nextRound,
            competition: 'COPA_BR',
            stageName: COPA_STAGE_NAMES[nextRound],
            homeId: winners[i],
            awayId: winners[i + 1],
            homeGoals: 0,
            awayGoals: 0,
            played: false,
            events: [],
          });
        }
      }
    } else if (currentCupRound === 5 && completedLiveMatches[0]) {
      const finalFx = finishedFixturesMap.get(completedLiveMatches[0].fixture.id)!;
      const homeWon =
        finalFx.homeGoals > finalFx.awayGoals ||
        (finalFx.homeGoals === finalFx.awayGoals && (finalFx.homePen ?? 0) > (finalFx.awayPen ?? 0));
      const champ = clubsMap.get(homeWon ? finalFx.homeId : finalFx.awayId)!;
      const runner = clubsMap.get(homeWon ? finalFx.awayId : finalFx.homeId)!;
      newTrophies = [
        {
          year: state.year,
          competition: 'Copa do Brasil',
          championId: champ.id,
          championName: champ.shortName,
          runnerUpName: runner.shortName,
        },
        ...newTrophies,
      ];
      if (champ.id === state.userClubId) {
        managerScore += 120;
      }
    }
  }

  // Gera eventual proposta de compra da Europa/Série A por um jogador do usuário
  let incomingOffers = state.incomingOffers.filter(
    (o) => state.currentStep - o.roundCreated <= 3
  );
  const userRoster = playersByClub.get(state.userClubId) || [];
  if (userRoster.length > 14 && Math.random() < 0.28) {
    const candidates = [...userRoster].sort((a, b) => b.ovr - a.ovr).slice(0, 6);
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (target && !incomingOffers.some((o) => o.playerId === target.id)) {
      const richClubs = Array.from(clubsMap.values()).filter(
        (c) => c.id !== state.userClubId && c.cash > target.value * 1.5 && (c.division === 'INT' || c.division === 'A')
      );
      if (richClubs.length > 0) {
        const buyer = richClubs[Math.floor(Math.random() * richClubs.length)];
        const mult = 1.15 + Math.random() * 0.35;
        const offerAmount = Math.round((target.value * mult) / 100000) * 100000;
        incomingOffers = [
          {
            id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            fromClubId: buyer.id,
            fromClubName: buyer.shortName,
            playerId: target.id,
            playerName: target.name,
            amount: Math.max(500_000, offerAmount),
            roundCreated: state.currentStep,
          },
          ...incomingOffers,
        ];
        newNews.unshift(
          `💼 MERCADO: ${buyer.shortName} enviou proposta oficial de ${formatMoney(offerAmount)} por ${target.name}!`
        );
      }
    }
  }

  const allUpdatedPlayers: Player[] = [];
  for (const list of playersByClub.values()) {
    allUpdatedPlayers.push(...list);
  }

  return {
    ...state,
    currentStep: state.currentStep + 1,
    clubs: Array.from(clubsMap.values()),
    players: allUpdatedPlayers,
    fixtures: updatedFixtures,
    copaActiveClubIds,
    incomingOffers,
    ledger: newLedger.slice(0, 60),
    trophies: newTrophies,
    news: newNews.slice(0, 35),
    careerWins,
    careerDraws,
    careerLosses,
    managerScore,
  };
}

export function startNextSeason(state: CareerState): CareerState {
  const standingsA = computeStandings(state.clubs, state.fixtures, 'A');
  const standingsB = computeStandings(state.clubs, state.fixtures, 'B');
  const clubsMap = new Map(state.clubs.map((c) => [c.id, { ...c }]));

  const champA = clubsMap.get(standingsA[0].clubId)!;
  const viceA = clubsMap.get(standingsA[1].clubId)!;
  const champB = clubsMap.get(standingsB[0].clubId)!;
  const viceB = clubsMap.get(standingsB[1].clubId)!;

  // Premiações do Brasileirão Série A e Série B
  standingsA.forEach((row, idx) => {
    const cl = clubsMap.get(row.clubId);
    if (!cl) return;
    const prize = Math.max(4_000_000, Math.round((48_000_000 - idx * 2_200_000) / 100000) * 100000);
    cl.cash += prize;
  });
  standingsB.slice(0, 4).forEach((row, idx) => {
    const cl = clubsMap.get(row.clubId);
    if (!cl) return;
    cl.cash += idx === 0 ? 15_000_000 : 8_000_000;
  });

  const relegatedIds = standingsA.slice(-4).map((r) => r.clubId);
  const promotedIds = standingsB.slice(0, 4).map((r) => r.clubId);

  const relegatedNames = relegatedIds.map((id) => clubsMap.get(id)?.shortName || id);
  const promotedNames = promotedIds.map((id) => clubsMap.get(id)?.shortName || id);

  const copaTrophyThisYear = state.trophies.find(
    (t) => t.year === state.year && t.competition === 'Copa do Brasil'
  );

  const topScorerObj = [...state.players]
    .filter((p) => {
      const c = clubsMap.get(p.clubId);
      return c && (c.division === 'A' || c.division === 'B');
    })
    .sort((a, b) => b.goals - a.goals)[0];

  const userClubBefore = clubsMap.get(state.userClubId)!;
  const userDivBefore = userClubBefore.division as 'A' | 'B';
  const userTable = userDivBefore === 'A' ? standingsA : standingsB;
  const userPos = userTable.findIndex((r) => r.clubId === state.userClubId) + 1;

  let managerScore = state.managerScore;
  if (champA.id === state.userClubId) managerScore += 200;
  else if (champB.id === state.userClubId) managerScore += 90;
  else if (userDivBefore === 'B' && userPos <= 4) managerScore += 60;

  const newTrophies = [
    {
      year: state.year,
      competition: 'Brasileirão Série A',
      championId: champA.id,
      championName: champA.shortName,
      runnerUpName: viceA.shortName,
    },
    {
      year: state.year,
      competition: 'Brasileirão Série B',
      championId: champB.id,
      championName: champB.shortName,
      runnerUpName: viceB.shortName,
    },
    ...state.trophies,
  ];

  const summary: SeasonSummary = {
    year: state.year,
    serieAChampion: champA.shortName,
    serieBChampion: champB.shortName,
    copaChampion: copaTrophyThisYear?.championName || '-',
    promoted: promotedNames,
    relegated: relegatedNames,
    topScorer: topScorerObj ? `${topScorerObj.name} (${topScorerObj.goals} gols)` : '-',
    userPosition: userPos,
    userDivision: userDivBefore,
  };

  // Aplica acesso e rebaixamento
  for (const id of relegatedIds) {
    const c = clubsMap.get(id);
    if (c) {
      c.division = 'B';
      c.leagueId = 'BRA2';
    }
  }
  for (const id of promotedIds) {
    const c = clubsMap.get(id);
    if (c) {
      c.division = 'A';
      c.leagueId = 'BRA1';
    }
  }

  // Evolução anual dos jogadores (idade +1, jovens sobem Força, veteranos caem, estatísticas zeram)
  const evolvedPlayers = state.players.map((p) => {
    const newAge = p.age + 1;
    let delta = 0;
    if (newAge <= 21) delta = Math.random() < 0.65 ? 2 : 1;
    else if (newAge <= 24) delta = Math.random() < 0.55 ? 1 : 0;
    else if (newAge <= 30 && p.goals >= 8) delta = 1;
    else if (newAge >= 34 && Math.random() < 0.55) delta = -1;
    else if (newAge >= 37 && Math.random() < 0.75) delta = -2;

    const newOvr = Math.max(38, Math.min(95, p.ovr + delta));
    return {
      ...p,
      age: newAge,
      ovr: newOvr,
      energy: 100,
      yellowCards: 0,
      suspended: 0,
      injured: 0,
      goals: 0,
      assists: 0,
      matches: 0,
      value: p.clubId === 'FREE' ? 0 : calcMarketValue(newOvr, newAge, p.star),
      wage: calcWage(newOvr, p.star),
    };
  });

  const nextYear = state.year + 1;
  const updatedClubs = Array.from(clubsMap.values());
  const { fixtures, copaParticipants, maxStep } = generateSeasonCalendar(
    updatedClubs,
    state.userClubId,
    state.totalLeagueRounds
  );

  return {
    ...state,
    year: nextYear,
    currentStep: 1,
    maxStep,
    clubs: updatedClubs,
    players: evolvedPlayers,
    fixtures,
    copaActiveClubIds: copaParticipants,
    incomingOffers: [],
    trophies: newTrophies,
    history: [summary, ...state.history],
    youthUsedThisSeason: false,
    managerScore,
    news: [
      `🎆 Temporada ${nextYear} iniciada! ${champA.shortName} defende o título da Série A.`,
      `⬆️ Subiram para a Série A: ${promotedNames.join(', ')}.`,
      `⬇️ Caíram para a Série B: ${relegatedNames.join(', ')}.`,
      ...state.news.slice(0, 15),
    ],
  };
}

const BRAZILIAN_FIRST_NAMES = [
  'Kauã', 'Estevão', 'Rayan', 'Breno', 'João', 'Gabriel', 'Matheus', 'Lucas',
  'Pedro', 'Vitor', 'Ryan', 'Endrick', 'Lorran', 'Thalys', 'Luighi', 'Riquelme',
  'Arthur', 'Davi', 'Caio', 'Igor', 'Murilo', 'Pablo', 'Wesley', 'Nathan',
];
const BRAZILIAN_LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Ferreira', 'Costa',
  'Rodrigues', 'Almeida', 'Nascimento', 'Araújo', 'Ribeiro', 'Carvalho',
  'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Teixeira', 'Mendes', 'Moreira',
];

export function generateYouthWonderkid(club: Club): Player {
  const positions: Position[] = ['G', 'L', 'Z', 'M', 'M', 'A', 'A'];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  const traitPool: Record<Position, Trait[]> = {
    G: ['Ref', 'DefP', 'Col', 'Sai'],
    L: ['Vel', 'Cruz', 'Mar', 'Des'],
    Z: ['Cab', 'Des', 'Mar', 'Col'],
    M: ['Arm', 'Pas', 'Dri', 'Falta', 'Des'],
    A: ['Fin', 'Vel', 'Dri', 'Cab'],
  };
  const pool = traitPool[pos];
  const t1 = pool[Math.floor(Math.random() * pool.length)];
  const t2 = pool.find((t) => t !== t1) || pool[0];

  const first = BRAZILIAN_FIRST_NAMES[Math.floor(Math.random() * BRAZILIAN_FIRST_NAMES.length)];
  const last = BRAZILIAN_LAST_NAMES[Math.floor(Math.random() * BRAZILIAN_LAST_NAMES.length)];
  const age = 16 + Math.floor(Math.random() * 3); // 16-18 anos
  const baseOvr = 65 + club.youthLevel * 2 + Math.floor(Math.random() * 6);
  const star = baseOvr >= 76 || Math.random() < 0.22;

  return {
    id: `youth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${first} ${last}`,
    pos,
    age,
    ovr: Math.min(81, baseOvr),
    traits: [t1, t2],
    star,
    energy: 100,
    morale: 90,
    yellowCards: 0,
    suspended: 0,
    injured: 0,
    goals: 0,
    assists: 0,
    matches: 0,
    wage: calcWage(baseOvr, star),
    value: calcMarketValue(baseOvr, age, star),
    clubId: club.id,
    isStarter: false,
  };
}

export function formatMoney(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(2).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${Math.round(abs / 1_000).toLocaleString('pt-BR')} mil`;
  }
  return `${sign}R$ ${abs.toLocaleString('pt-BR')}`;
}
