// Converte scripts/.cache/raw-world.json -> src/data/world.json (base usada pelo jogo).
// As notas (força 1-99) são ESTIMADAS: liga + desempenho do clube na tabela + fama do
// jogador (nº de artigos na Wikipedia em vários idiomas) + idade. Ajustes finos ficam em
// scripts/rating-overrides.json  ({ "Nome do Jogador": 90 }).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAGUES } from './leagues.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '.cache', 'raw-world.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-br-meta.json'), 'utf8'));
const overridesFile = path.join(__dirname, 'rating-overrides.json');
const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
const OUT = path.join(__dirname, '..', 'src', 'data', 'world.json');
const REF_DATE = new Date('2026-07-01');
const MAX_SQUAD = 30;

const leagueById = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))) || 1; };

// ---------- metadados legados dos clubes brasileiros ----------
const BR_ALIASES = {
  'atletico mg': ['atletico mineiro'], vasco: ['vasco da gama'], 'athletico pr': ['athletico paranaense'],
  'rb bragantino': ['red bull bragantino', 'bragantino'], 'atletico go': ['atletico goianiense'],
  'america mg': ['america mineiro'], 'operario pr': ['operario ferroviario', 'operario'],
  'botafogo sp': ['botafogo sp', 'botafogo ribeirao preto'], 'athletic mg': ['athletic', 'athletic club'],
  sport: ['sport recife', 'sport'], 'sao bernardo': ['sao bernardo'], novorizontino: ['gremio novorizontino', 'novorizontino'],
};
const legacyBR = legacy.clubs.filter((c) => c.division !== 'INT');
function findLegacy(label, title) {
  const n = norm(label);
  const t = norm(title);
  return legacyBR.find((c) => {
    const k = norm(c.shortName);
    const names = [k, ...(BR_ALIASES[k] || [])];
    return names.some((x) => x === n || t.includes(x) && x.length > 5) || norm(c.name) === t;
  });
}

function legacyRating(meta, name) {
  if (!meta?.ratings) return null;
  const n = norm(name);
  for (const [ln, r] of Object.entries(meta.ratings)) {
    const l = norm(ln);
    if (l === n || (l.length >= 4 && (n.endsWith(' ' + l) || n.startsWith(l + ' ') || l.endsWith(' ' + n)))) return r;
  }
  return null;
}

// ---------- posições e características ----------
function mapPos(p, h) {
  const wp = (p.wpos || '').toLowerCase();
  switch (p.pos) {
    case 'GK': return 'G';
    case 'DF':
      if (/full-back|wing-back|left back|right back|left-back|right-back|fullback|wingback/.test(wp)) return 'L';
      if (/centre-back|center-back|central defender|sweeper/.test(wp)) return 'Z';
      return null; // decidido depois para equilibrar o elenco
    case 'MF': return 'M';
    case 'FW': return 'A';
    default:
      if (/goalkeeper/.test(wp)) return 'G';
      if (/back|defender/.test(wp)) return h < 0.4 ? 'L' : 'Z';
      if (/midfield/.test(wp)) return 'M';
      if (/forward|striker|winger/.test(wp)) return 'A';
      return null;
  }
}

function pick2(list, h) {
  const a = Math.floor(h * list.length) % list.length;
  let b = Math.floor(((h * 7919) % 1) * list.length) % list.length;
  if (b === a) b = (a + 1) % list.length;
  return [list[a], list[b]];
}
function traitsFor(pos, wpos, h) {
  const wp = (wpos || '').toLowerCase();
  if (pos === 'G') return pick2(['Ref', 'Col', 'DefP', 'Sai'], h);
  if (pos === 'L') return /wing-back/.test(wp) ? ['Vel', 'Cruz'] : pick2(['Vel', 'Cruz', 'Mar', 'Des'], h);
  if (pos === 'Z') return pick2(['Des', 'Mar', 'Cab', 'Col'], h);
  if (pos === 'M') {
    if (/defensive/.test(wp)) return pick2(['Des', 'Mar', 'Pas'], h);
    if (/attacking|playmaker/.test(wp)) return pick2(['Arm', 'Dri', 'Falta', 'Fin'], h);
    if (/winger|wing half/.test(wp)) return pick2(['Vel', 'Dri', 'Cruz'], h);
    return pick2(['Pas', 'Arm', 'Des', 'Dri', 'Falta'], h);
  }
  if (/winger/.test(wp)) return pick2(['Vel', 'Dri', 'Fin'], h);
  if (/centre-forward|striker/.test(wp)) return pick2(['Fin', 'Cab', 'Fin', 'Dri'], h);
  return pick2(['Fin', 'Dri', 'Vel', 'Cab'], h);
}

function ageOf(p, h) {
  if (p.dob) {
    const d = new Date(p.dob);
    if (!isNaN(d)) return Math.floor((REF_DATE - d) / (365.25 * 86400000));
  }
  return null;
}
function ageAdj(age) {
  if (age <= 17) return -8;
  if (age === 18) return -6;
  if (age === 19) return -4;
  if (age === 20) return -2;
  if (age === 21) return -1;
  if (age <= 30) return 0;
  if (age <= 32) return -1;
  if (age <= 34) return -2;
  if (age <= 36) return -4;
  return -6;
}

// ---------- abreviações ----------
const usedAbbr = new Map();
function abbrFor(club, leagueId) {
  let a = (club.key || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  if (a.length < 3) a = norm(club.label).replace(/\s/g, '').toUpperCase().slice(0, 3);
  const k = leagueId + a;
  usedAbbr.set(k, (usedAbbr.get(k) || 0) + 1);
  return a;
}

// ---------- processamento ----------
const outLeagues = [];
const outClubs = [];
const outPlayers = [];
const usedClubIds = new Set();
const report = [];

const clubsByLeague = new Map();
for (const c of raw.clubs) {
  if (!leagueById[c.league]) continue;
  if (!clubsByLeague.has(c.league)) clubsByLeague.set(c.league, []);
  clubsByLeague.get(c.league).push(c);
}

for (const lg of LEAGUES) {
  const clubs = (clubsByLeague.get(lg.id) || []).filter((c) => c.squad.length >= 11);
  if (!clubs.length) { report.push(`${lg.id}: SEM DADOS`); continue; }
  outLeagues.push({ id: lg.id, name: lg.name, country: lg.country, cc: lg.cc, continent: lg.continent, tier: lg.tier });

  // força do clube: pontos por jogo (z) + fama do clube (z)
  const ppg = clubs.map((c) => { const g = (c.stats.w ?? 0) + (c.stats.d ?? 0) + (c.stats.l ?? 0); return g >= 3 ? (3 * c.stats.w + c.stats.d) / g : null; });
  const ppgVals = ppg.filter((x) => x !== null);
  const fame = clubs.map((c) => Math.log1p(c.sl || 0));
  const pm = mean(ppgVals), ps = std(ppgVals), fm = mean(fame), fsd = std(fame);
  const hasPpg = ppgVals.length >= clubs.length * 0.6;

  clubs.forEach((c, i) => {
    const zF = (fame[i] - fm) / fsd;
    const zP = ppg[i] !== null ? (ppg[i] - pm) / ps : zF * 0.5;
    const score = hasPpg ? 0.55 * zP + 0.45 * zF : zF;
    const rating = lg.base + clamp(score * 3.4, -7, 9);
    const legacyMeta = lg.cc === 'BRA' ? findLegacy(c.label, c.title) : null;

    let id = legacyMeta?.id || c.slug || norm(c.title).replace(/\s/g, '-');
    while (usedClubIds.has(id)) id += '2';
    usedClubIds.add(id);

    // ---- elenco ----
    let squad = c.squad.map((p) => ({ ...p, h: hash(p.name + c.title) }));
    if (squad.length > MAX_SQUAD) squad = [...squad].sort((a, b) => (b.sl || 0) - (a.sl || 0) || (a.h - b.h)).slice(0, MAX_SQUAD);
    for (const p of squad) {
      p.age = ageOf(p) ?? 18 + Math.floor(p.h * 6);
      p.gp = mapPos(p, p.h);
      p.f = Math.log1p(p.sl || 0);
    }
    // equilibra zagueiros/laterais quando a posição é genérica ("defender")
    const defs = squad.filter((p) => p.pos === 'DF' || (!p.gp && /back|defender/.test(p.wpos || '')));
    let nL = squad.filter((p) => p.gp === 'L').length;
    for (const p of defs.filter((d) => !d.gp).sort((a, b) => a.h - b.h)) {
      if (nL < Math.max(3, Math.round(defs.length * 0.42))) { p.gp = 'L'; nL++; } else p.gp = 'Z';
    }
    for (const p of squad) if (!p.gp) p.gp = 'M';
    // garante pelo menos 2 goleiros
    if (squad.filter((p) => p.gp === 'G').length === 0) report.push(`  ! ${c.title} sem goleiro`);

    // nota: posição relativa no elenco (por fama) + fama absoluta + idade
    const groups = [squad.filter((p) => p.gp === 'G'), squad.filter((p) => p.gp !== 'G')];
    for (const g of groups) {
      const sorted = [...g].sort((a, b) => b.f - a.f || b.age - a.age);
      sorted.forEach((p, idx) => { p.pct = sorted.length > 1 ? idx / (sorted.length - 1) : 0; });
    }
    const squadFame = mean(squad.map((p) => p.f));
    for (const p of squad) {
      const isGK = p.gp === 'G';
      const rel = isGK ? 3 - (p.pct < 0.34 ? 0 : p.pct < 0.67 ? 7 : 11) : 4 - 11 * p.pct;
      const abs = clamp((p.f - squadFame) * 1.1, -3, 3) + clamp((p.f - 4.0) * 1.0, -2, 2.5);
      const noise = (p.h - 0.5) * 3;
      let ovr = Math.round(rating + rel + abs + ageAdj(p.age) + noise);
      if (!p.qid) ovr -= 2; // sem artigo: geralmente jovem da base / pouco conhecido
      ovr = clamp(ovr, 38, 94);
      // notas legadas (feitas à mão) dos clubes brasileiros: mistura com a estimativa
      const leg = legacyRating(legacyMeta, p.name);
      if (leg !== null) ovr = Math.round(0.5 * ovr + 0.5 * (leg - 3));
      // ajuste manual só para jogadores famosos (evita homônimos como "Alisson" ou "Rodri")
      if (overrides[p.name] !== undefined && (p.sl || 0) >= 30) ovr = overrides[p.name];
      p.ovr = ovr;
    }
    const topTwo = [...squad].sort((a, b) => b.ovr - a.ovr).slice(0, 2).map((p) => p.name);
    for (const p of squad) {
      p.star = p.ovr >= 87 || (p.ovr >= rating + 5 && topTwo[0] === p.name);
      const [t1, t2] = traitsFor(p.gp, p.wpos, p.h);
      outPlayers.push([outClubs.length, p.name, p.gp, p.age, p.ovr, t1, t2, p.star ? 1 : 0, p.nat || '']);
    }

    // ---- dados do clube ----
    const colors = c.info.colors || [];
    let primary = legacyMeta?.primaryColor || colors[0] || '#334155';
    let secondary = legacyMeta?.secondaryColor || colors.find((x) => x !== primary) || '#FFFFFF';
    const fanbase = legacyMeta?.fanbase ?? clamp(Math.round(30 + (fame[i] - fm) / fsd * 15 + (lg.base - 60) * 1.6 + (rating - lg.base) * 2), 10, 99);
    const money = Math.pow(1.13, rating - 60); // escala econômica
    outClubs.push({
      id,
      league: lg.id,
      state: legacyMeta?.state || '',
      name: legacyMeta?.name || c.info.fullname || c.title.replace(/\s*\(.*?\)\s*/g, ''),
      short: legacyMeta?.shortName || c.label,
      abbr: legacyMeta?.abbr || abbrFor(c, lg.id),
      stadium: c.info.ground || legacyMeta?.stadium || `Estádio do ${c.label}`,
      cap: c.info.capacity || legacyMeta?.capacity || 15000,
      colors: [primary, secondary, legacyMeta?.accentColor || colors[2] || '#FFFFFF'],
      pattern: legacyMeta?.pattern || 'solid',
      logo: c.logo || null,
      rating: Math.round(rating * 10) / 10,
      fan: fanbase,
      cash: legacyMeta?.cash ?? Math.round((money * 9_000_000) / 100_000) * 100_000,
      sponsor: legacyMeta?.sponsorName || 'Patrocinador Master',
      sponsorPR: legacyMeta?.sponsorPerRound ?? Math.round((money * 160_000) / 10_000) * 10_000,
      youth: legacyMeta?.youthLevel ?? clamp(Math.round(1 + (rating - 58) / 6), 1, 5),
      coach: c.info.manager || legacyMeta?.coachName || 'Técnico',
      formation: legacyMeta?.formation || ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2'][Math.floor(hash(c.title) * 4)],
      wiki: c.title,
    });
  });
  report.push(`${lg.id.padEnd(5)} ${String(clubs.length).padStart(3)} clubes  ${hasPpg ? 'tabela+fama' : 'só fama'}`);
}

// jogadores livres legados que não estão em nenhum clube
const allNames = new Set(outPlayers.map((p) => norm(p[1])));
const freeAgents = legacy.freeAgents.filter((f) => !allNames.has(norm(f[0])));

fs.writeFileSync(OUT, JSON.stringify({ generatedAt: raw.generatedAt, leagues: outLeagues, clubs: outClubs, players: outPlayers, freeAgents }));
console.log(report.join('\n'));
console.log(`\nligas ${outLeagues.length} · clubes ${outClubs.length} · jogadores ${outPlayers.length} · livres ${freeAgents.length}`);
console.log(`escudos: ${outClubs.filter((c) => c.logo).length}/${outClubs.length}`);
console.log(`BR mapeados p/ metadados antigos: ${outClubs.filter((c) => legacyBR.some((l) => l.id === c.id)).length}/${outClubs.filter((c) => c.league.startsWith('BRA')).length}`);
console.log(`-> ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
