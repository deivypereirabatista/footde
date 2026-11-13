export type Position = 'G' | 'L' | 'Z' | 'M' | 'A';

export type Trait =
  | 'Ref'   // Reflexo (G)
  | 'Col'   // Colocação (G/Z)
  | 'DefP'  // Defesa de Pênalti (G)
  | 'Sai'   // Saída de Gol (G)
  | 'Des'   // Desarme (L/Z/M)
  | 'Mar'   // Marcação (L/Z/M)
  | 'Cab'   // Cabeceio (Z/A)
  | 'Cruz'  // Cruzamento (L/M)
  | 'Vel'   // Velocidade (L/M/A)
  | 'Pas'   // Passe (M)
  | 'Arm'   // Armação (M)
  | 'Dri'   // Drible (M/A)
  | 'Fin'   // Finalização (A/M)
  | 'Falta'; // Bola Parada

export const TRAIT_NAMES: Record<Trait, string> = {
  Ref: 'Reflexo',
  Col: 'Colocação',
  DefP: 'Def. Pênalti',
  Sai: 'Saída de Gol',
  Des: 'Desarme',
  Mar: 'Marcação',
  Cab: 'Cabeceio',
  Cruz: 'Cruzamento',
  Vel: 'Velocidade',
  Pas: 'Passe',
  Arm: 'Armação',
  Dri: 'Drible',
  Fin: 'Finalização',
  Falta: 'Bola Parada',
};

export const POS_NAMES: Record<Position, string> = {
  G: 'Goleiro',
  L: 'Lateral',
  Z: 'Zagueiro',
  M: 'Meia',
  A: 'Atacante',
};

export interface Player {
  id: string;
  name: string;
  pos: Position;
  age: number;
  ovr: number; // Força 1-99
  traits: [Trait, Trait];
  star?: boolean;
  energy: number; // 0-100
  morale: number; // 0-100
  yellowCards: number;
  suspended: number; // jogos suspenso
  injured: number; // rodadas contundido
  goals: number;
  assists: number;
  matches: number;
  wage: number; // salário por rodada em R$
  value: number; // valor de mercado em R$
  clubId: string; // 'FREE' para sem contrato
  nat?: string; // código FIFA da nacionalidade (ex.: BRA, ARG)
  isStarter: boolean;
  slotIndex?: number; // 0..10 para titulares na formação
}

export type FormationId =
  | '4-4-2'
  | '4-3-3'
  | '4-2-3-1'
  | '3-5-2'
  | '4-5-1'
  | '3-4-3'
  | '5-3-2';

export type PlayStyle =
  | 'Equilibrado'
  | 'Ofensivo'
  | 'Ataque Total'
  | 'Contra-Ataque'
  | 'Retranca';

export type PassStyle = 'Misto' | 'Toque de Bola' | 'Bola Longa' | 'Pelos Lados';

export type MarkingStyle = 'Leve' | 'Normal' | 'Pesada';

export interface Tactics {
  formation: FormationId;
  style: PlayStyle;
  passing: PassStyle;
  marking: MarkingStyle;
  captainId?: string;
  setPieceId?: string;
  ticketPrice: number;
}

export type BadgePattern = 'stripes-h' | 'stripes-v' | 'sash' | 'halves' | 'solid' | 'tricolor';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  state: string;
  division: 'A' | 'B' | 'INT';
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  pattern: BadgePattern;
  stadium: string;
  capacity: number;
  cash: number;
  sponsorName: string;
  sponsorPerRound: number;
  fanbase: number; // 1-100 tamanho da torcida
  youthLevel: number; // 1-5 nível da base
  coachName: string;
  tactics: Tactics;
  leagueId?: string; // ex.: ENG1, BRA1 (ver src/data/world.json)
  country?: string;
  continent?: string;
  logo?: string; // caminho do escudo em public/ (ex.: logos/arsenal-f-c.png)
  rating?: number; // força média estimada do clube
}

export interface League {
  id: string;
  name: string;
  country: string;
  cc: string;
  continent: string;
  tier: number;
}

export type CompetitionType = 'SERIE_A' | 'SERIE_B' | 'COPA_BR';

export interface MatchEvent {
  minute: number;
  clubId: string;
  type: 'GOAL' | 'YELLOW' | 'RED' | 'INJURY' | 'MISS_PEN' | 'WOODWORK' | 'SAVE' | 'SUB';
  playerName: string;
  assistName?: string;
  text: string;
}

export interface Fixture {
  id: string;
  calendarStep: number; // índice sequencial da data na temporada
  round: number; // rodada da liga ou fase da copa
  competition: CompetitionType;
  stageName: string;
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  homePen?: number;
  awayPen?: number;
  played: boolean;
  attendance?: number;
  ticketIncome?: number;
  events: MatchEvent[];
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('V' | 'E' | 'D')[];
}

export interface IncomingOffer {
  id: string;
  fromClubId: string;
  fromClubName: string;
  playerId: string;
  playerName: string;
  amount: number;
  roundCreated: number;
}

export interface LedgerEntry {
  id: string;
  step: number;
  description: string;
  amount: number; // positivo receita, negativo despesa
}

export interface TrophyRecord {
  year: number;
  competition: string;
  championId: string;
  championName: string;
  runnerUpName: string;
}

export interface SeasonSummary {
  year: number;
  serieAChampion: string;
  serieBChampion: string;
  copaChampion: string;
  promoted: string[];
  relegated: string[];
  topScorer: string;
  userPosition: number;
  userDivision: 'A' | 'B';
}

export interface CareerState {
  version: number;
  coachName: string;
  userClubId: string;
  year: number;
  totalLeagueRounds: 19 | 38;
  currentStep: number; // índice no calendário da temporada
  maxStep: number;
  clubs: Club[];
  players: Player[];
  fixtures: Fixture[];
  copaActiveClubIds: string[]; // clubes vivos na fase atual da Copa do Brasil
  incomingOffers: IncomingOffer[];
  ledger: LedgerEntry[];
  trophies: TrophyRecord[];
  history: SeasonSummary[];
  news: string[];
  managerScore: number;
  careerWins: number;
  careerDraws: number;
  careerLosses: number;
  youthUsedThisSeason: boolean;
}
