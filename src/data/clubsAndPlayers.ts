import { Club, FormationId, League, Player, Position, Trait, BadgePattern } from '../types/brasfoot';
import { FORMATIONS } from './formations';
// Base mundial gerada por scripts/fetch-world.mjs + scripts/build-world.mjs
// (elencos da Wikipedia/Wikidata — temporada 2026 / 2026-27).
import WORLD from './world.json';

type WorldPlayer = [clubIdx: number, name: string, pos: Position, age: number, ovr: number, t1: Trait, t2: Trait, star: 0 | 1, nat: string];
type FreeAgentTuple = [name: string, pos: Position, age: number, ovr: number, t1: Trait, t2: Trait, star?: boolean];

interface WorldClub {
  id: string;
  league: string;
  state: string;
  name: string;
  short: string;
  abbr: string;
  stadium: string;
  cap: number;
  colors: [string, string, string];
  pattern: BadgePattern;
  logo: string | null;
  rating: number;
  fan: number;
  cash: number;
  sponsor: string;
  sponsorPR: number;
  youth: number;
  coach: string;
  formation: FormationId;
}

interface WorldData {
  generatedAt: string;
  leagues: League[];
  clubs: WorldClub[];
  players: WorldPlayer[];
  freeAgents: FreeAgentTuple[];
}

const world = WORLD as unknown as WorldData;

export const WORLD_LEAGUES: League[] = world.leagues;
export const WORLD_GENERATED_AT = world.generatedAt;
export const LEAGUE_BY_ID: Record<string, League> = Object.fromEntries(world.leagues.map((l) => [l.id, l]));

export function calcMarketValue(ovr: number, age: number, star?: boolean): number {
  const base = Math.pow(Math.max(1, ovr - 48), 3.15) * 95;
  const ageFactor = age <= 21 ? 1.35 : age <= 25 ? 1.2 : age <= 29 ? 1.0 : age <= 33 ? 0.72 : 0.45;
  const starFactor = star ? 1.28 : 1.0;
  return Math.round((base * ageFactor * starFactor) / 50000) * 50000;
}

export function calcWage(ovr: number, star?: boolean): number {
  const raw = Math.pow(Math.max(1, ovr - 45), 2.55) * 14 * (star ? 1.2 : 1.0);
  return Math.max(8000, Math.round(raw / 1000) * 1000);
}

export function assignBestLineup(players: Player[], formation: FormationId): Player[] {
  const slots = FORMATIONS[formation];
  const available = players.filter((p) => p.suspended === 0 && p.injured === 0);
  const pickedIds = new Set<string>();
  const slotAssignment = new Map<string, number>();

  // Escolhe o melhor jogador compatível para cada slot
  for (const slot of slots) {
    let best: Player | undefined;
    let bestScore = -999;
    for (const p of available) {
      if (pickedIds.has(p.id)) continue;
      const samePos = p.pos === slot.reqPos;
      const gPenalty = (p.pos === 'G') !== (slot.reqPos === 'G') ? -60 : 0;
      const posBonus = samePos ? 18 : 0;
      const energyFactor = p.energy / 100;
      const score = p.ovr * energyFactor + posBonus + gPenalty;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best) {
      pickedIds.add(best.id);
      slotAssignment.set(best.id, slot.index);
    }
  }

  return players.map((p) => {
    if (slotAssignment.has(p.id)) {
      return { ...p, isStarter: true, slotIndex: slotAssignment.get(p.id) };
    }
    return { ...p, isStarter: false, slotIndex: undefined };
  });
}

function divisionFor(leagueId: string): Club['division'] {
  if (leagueId === 'BRA1') return 'A';
  if (leagueId === 'BRA2') return 'B';
  return 'INT';
}

function newPlayer(id: string, clubId: string, name: string, pos: Position, age: number, ovr: number, t1: Trait, t2: Trait, star: boolean, nat?: string): Player {
  return {
    id,
    name,
    pos,
    age,
    ovr,
    traits: [t1, t2],
    star,
    energy: 100,
    morale: clubId === 'FREE' ? 75 : 80,
    yellowCards: 0,
    suspended: 0,
    injured: 0,
    goals: 0,
    assists: 0,
    matches: 0,
    wage: calcWage(ovr, star),
    value: clubId === 'FREE' ? 0 : calcMarketValue(ovr, age, star),
    clubId,
    nat: nat || undefined,
    isStarter: false,
  };
}

export function buildInitialDatabase(): { clubs: Club[]; players: Player[] } {
  const clubs: Club[] = [];
  const allPlayers: Player[] = [];
  const rosterByIdx = new Map<number, Player[]>();
  let pid = 1;

  for (const [clubIdx, name, pos, age, ovr, t1, t2, star, nat] of world.players) {
    const wc = world.clubs[clubIdx];
    const list = rosterByIdx.get(clubIdx) || [];
    list.push(newPlayer(`p_${pid++}`, wc.id, name, pos, age, ovr, t1, t2, star === 1, nat));
    rosterByIdx.set(clubIdx, list);
  }

  world.clubs.forEach((wc, idx) => {
    const league = LEAGUE_BY_ID[wc.league];
    const division = divisionFor(wc.league);
    const linedUp = assignBestLineup(rosterByIdx.get(idx) || [], wc.formation);
    allPlayers.push(...linedUp);

    const starters = linedUp.filter((p) => p.isStarter);
    const bestLeader = [...starters].sort((a, b) => b.ovr + b.age * 0.25 - (a.ovr + a.age * 0.25))[0];
    const bestFK = starters.find((p) => p.traits.includes('Falta')) || [...starters].sort((a, b) => b.ovr - a.ovr)[0];
    const defaultTicket = division === 'A' ? (wc.fan >= 85 ? 70 : 50) : wc.fan >= 70 ? 40 : 30;

    clubs.push({
      id: wc.id,
      name: wc.name,
      shortName: wc.short,
      abbr: wc.abbr,
      state: wc.state || league?.country || '',
      division,
      primaryColor: wc.colors[0],
      secondaryColor: wc.colors[1],
      accentColor: wc.colors[2],
      pattern: wc.pattern,
      stadium: wc.stadium,
      capacity: wc.cap,
      cash: wc.cash,
      sponsorName: wc.sponsor,
      sponsorPerRound: wc.sponsorPR,
      fanbase: wc.fan,
      youthLevel: wc.youth,
      coachName: wc.coach,
      leagueId: wc.league,
      country: league?.country,
      continent: league?.continent,
      logo: wc.logo || undefined,
      rating: wc.rating,
      tactics: {
        formation: wc.formation,
        style: 'Equilibrado',
        passing: 'Misto',
        marking: 'Normal',
        captainId: bestLeader?.id,
        setPieceId: bestFK?.id,
        ticketPrice: defaultTicket,
      },
    });
  });

  for (const [name, pos, age, ovr, t1, t2, star] of world.freeAgents) {
    allPlayers.push(newPlayer(`p_${pid++}`, 'FREE', name, pos, age, ovr, t1, t2, !!star));
  }

  return { clubs, players: allPlayers };
}
