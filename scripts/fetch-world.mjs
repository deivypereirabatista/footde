// Coleta elencos, escudos e dados dos clubes do mundo a partir da Wikipedia/Wikidata.
// Uso pessoal / não comercial.  Executar:  node scripts/fetch-world.mjs
// Resultado bruto: scripts/.cache/raw-world.json  (depois rode build-world.mjs)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LEAGUES } from './leagues.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache', 'http');
const RAW_OUT = path.join(__dirname, '.cache', 'raw-world.json');
const LOGO_DIR = path.join(__dirname, '..', 'public', 'logos');
fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(LOGO_DIR, { recursive: true });

const UA = 'footde-personal-game/0.2 (uso pessoal, nao comercial)';
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const NO_CACHE_LEAGUES = process.argv.includes('--refresh');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastCall = {};
async function throttle(host, ms) {
  const now = Date.now();
  const wait = (lastCall[host] || 0) + ms - now;
  if (wait > 0) await sleep(wait);
  lastCall[host] = Date.now();
}

function cacheFile(key) {
  return path.join(CACHE_DIR, crypto.createHash('sha1').update(key).digest('hex') + '.json');
}

async function getJSON(url, { host = 'wiki', interval = 900, body, useCache = true } = {}) {
  const key = url + (body || '');
  const cf = cacheFile(key);
  if (useCache && fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  for (let attempt = 0; attempt < 7; attempt++) {
    await throttle(host, interval);
    try {
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body,
      });
      const text = await res.text();
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      const json = JSON.parse(text);
      if (json.error?.code === 'maxlag') throw new Error('maxlag');
      fs.writeFileSync(cf, JSON.stringify(json));
      return json;
    } catch (e) {
      const backoff = 2000 * Math.pow(2, attempt);
      process.stdout.write(`  ! ${e.message} — nova tentativa em ${backoff / 1000}s\n`);
      await sleep(backoff);
    }
  }
  throw new Error('Falhou: ' + url);
}

const WIKI = 'https://en.wikipedia.org/w/api.php?';
function wikiApi(params, opts) {
  return getJSON(WIKI + new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params }), opts);
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Busca wikitext de várias páginas (até 50 por requisição), resolvendo redirects.
async function fetchPages(titles, opts) {
  const result = new Map(); // título pedido -> { title, text }
  for (const group of chunk([...new Set(titles)], 50)) {
    const j = await wikiApi(
      { action: 'query', prop: 'revisions|pageprops', ppprop: 'wikibase_item', rvprop: 'content', rvslots: 'main', titles: group.join('|'), redirects: '1' },
      opts
    );
    const alias = new Map();
    for (const n of j.query?.normalized || []) alias.set(n.to, n.from);
    for (const r of j.query?.redirects || []) alias.set(r.to, alias.get(r.from) || r.from);
    for (const p of j.query?.pages || []) {
      if (p.missing) continue;
      const entry = { title: p.title, text: p.revisions?.[0]?.slots?.main?.content || '', qid: p.pageprops?.wikibase_item };
      result.set(p.title, entry);
      // mapeia de volta todos os aliases (redirect/normalização) até o título pedido
      let k = p.title;
      const seen = new Set();
      while (alias.has(k) && !seen.has(k)) {
        seen.add(k);
        k = alias.get(k);
        result.set(k, entry);
      }
    }
  }
  return result;
}

// ---------- Parsing de wikitext ----------
function stripLink(s) {
  if (!s) return { link: null, label: '' };
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '');
  const sort = s.match(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|([^|}]*))?[^}]*\}\}/i);
  if (sort) {
    const label = `${sort[1].trim()} ${sort[2].trim()}`.trim();
    const link = sort[3] && !/^nolink/i.test(sort[3]) && sort[3].trim() ? sort[3].trim() : label;
    return { link: sort[3] === undefined || sort[3].trim() ? link : null, label };
  }
  const m = s.match(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/);
  if (m) return { link: m[1].trim(), label: (m[2] || m[1]).replace(/\(.*?\)/g, '').trim() };
  return { link: null, label: s.replace(/'''?|\{\{[^}]*\}\}|\[|\]/g, '').trim() };
}

// Divide parâmetros de um template de nível superior, respeitando {{ }} e [[ ]]
function splitTemplateParams(inner) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if ((two === '}}' || two === ']]') && depth > 0) { depth--; cur += two; i++; continue; }
    if (inner[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += inner[i];
  }
  parts.push(cur);
  const named = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) named[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return named;
}

// Encontra templates {{Nome ...}} (com aninhamento) e devolve [inicio, conteúdo interno]
function findTemplates(text, nameRe) {
  const out = [];
  const re = new RegExp('\\{\\{\\s*(' + nameRe + ')\\s*[|}]', 'gi');
  let m;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index;
    for (; i < text.length; i++) {
      if (text.startsWith('{{', i)) { depth++; i++; }
      else if (text.startsWith('}}', i)) { depth--; i++; if (depth === 0) break; }
    }
    out.push({ start: m.index, inner: text.slice(m.index + 2, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

const INCLUDE_HEAD = /squad|players|plantel|elenco|team|current|roster/i;
const EXCLUDE_HEAD = /loan|reserve|youth|academy|under[- ]?\d|\bu-?\d\d|\bII\b|\bB\b|women|ladies|notable|retired|former|other players|development|second team|affiliat|staff|record|histor|captain|award|coach|manag|famous|legend|internation|hall of fame|personnel|ownership|transfers?|kit|stadium/i;

function parseSquad(text) {
  // mapa de posição no texto -> cabeçalho vigente
  const heads = [...text.matchAll(/^(={2,5})\s*([^=\n]+?)\s*\1\s*$/gm)].map((m) => ({ pos: m.index, level: m[1].length, title: m[2] }));
  const breaks = [...text.matchAll(/\{\{\s*(fs break|fs mid|football squad break)\s*\|([^}]*)\}\}/gi)].map((m) => ({ pos: m.index, title: m[2] }));
  const players = [];
  const seen = new Set();
  for (const t of findTemplates(text, 'fs player|football squad player|fs2 player')) {
    // pilha de cabeçalhos até aqui
    const stack = [];
    for (const h of heads) {
      if (h.pos > t.start) break;
      while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
      stack.push(h);
    }
    if (stack.length) {
      const last = stack[stack.length - 1].title;
      if (EXCLUDE_HEAD.test(last)) continue;
      if (!stack.some((h) => INCLUDE_HEAD.test(h.title))) continue;
      const lastHeadPos = stack[stack.length - 1].pos;
      const brk = breaks.filter((b) => b.pos > lastHeadPos && b.pos < t.start).pop();
      if (brk && EXCLUDE_HEAD.test(brk.title)) continue;
    }
    const prm = splitTemplateParams(t.inner);
    const { link, label } = stripLink(prm.name || '');
    if (!label || label.length < 2) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({
      name: label,
      link,
      pos: (prm.pos || '').replace(/[^A-Za-z]/g, '').toUpperCase(),
      nat: (prm.nat || prm.nation || '').replace(/\{\{.*?\}\}/g, '').trim().slice(0, 3).toUpperCase(),
      no: prm.no || '',
      other: (prm.other || '').replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2').replace(/<[^>]+>|\{\{[^}]*\}\}/g, '').trim(),
    });
  }
  return players;
}

function parseInfobox(text) {
  const ib = findTemplates(text, 'infobox football club|infobox club de futebol|infobox football club season|infobox sports team')[0];
  if (!ib) return {};
  const p = splitTemplateParams(ib.inner);
  const clean = (s) => (s || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').trim();
  let image = clean(p.image || p.logo || p.badge || p.crest).replace(/^(File|Image):/i, '').replace(/\|.*$/, '').replace(/\[\[|\]\]/g, '').trim();
  if (!/\.(svg|png|jpe?g|gif|webp)$/i.test(image)) image = '';
  const ground = stripLink(clean(p.ground || p.stadium || p.arena).split(/<br|\n|,\s*\[\[/)[0]).label;
  const capMatch = clean(p.capacity).replace(/<[^>]+>|\{\{[^}]*\}\}/g, ' ').match(/(\d{1,3}(?:[,. ]\d{3})+|\d{3,6})/);
  const hex = (v) => {
    const m = clean(v).match(/#?([0-9a-fA-F]{6})\b/);
    return m ? '#' + m[1].toUpperCase() : null;
  };
  return {
    image,
    ground: ground && ground.length < 80 ? ground : '',
    capacity: capMatch ? parseInt(capMatch[1].replace(/[,. ]/g, ''), 10) : 0,
    colors: [hex(p.body1), hex(p.shorts1), hex(p.socks1), hex(p.body2)].filter(Boolean),
    founded: (clean(p.founded).match(/\b(1[89]\d\d|20[0-2]\d)\b/) || [])[1] || '',
    fullname: stripLink(clean(p.fullname)).label.replace(/\{\{.*?\}\}/g, '').trim(),
    manager: stripLink(clean(p.manager || p['head coach'] || p.coach || p.headcoach).split(/<br|\n|\(/)[0]).label.replace(/\{\{.*?\}\}/g, '').trim().slice(0, 40),
  };
}

// Extrai clubes de uma tabela "Sports table" (name_XXX = [[...]]) + estatísticas
function parseLeagueTable(text) {
  const clubs = new Map();
  for (const m of text.matchAll(/\|\s*name_([^\s=|]+)\s*=\s*([^\n|]*\[\[[^\]]+\]\][^\n|]*)/g)) {
    const key = m[1];
    const { link, label } = stripLink(m[2]);
    if (!link || clubs.has(key)) continue;
    const num = (k) => {
      const r = text.match(new RegExp('\\|\\s*' + k + '_' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*(\\d+)'));
      return r ? parseInt(r[1], 10) : null;
    };
    clubs.set(key, { key, link, label, w: num('win'), d: num('draw'), l: num('loss'), gf: num('gf'), ga: num('ga') });
  }
  return [...clubs.values()];
}

async function fetchLeague(lg) {
  const titles = [lg.article, ...(lg.alt || [])];
  for (const t of titles) {
    const pages = await fetchPages([t], { useCache: !NO_CACHE_LEAGUES });
    const page = pages.get(t);
    if (!page) continue;
    let text = page.text;
    let rows = parseLeagueTable(text);
    const withStats = rows.filter((r) => r.w !== null).length;
    if (rows.length < lg.size * 0.7 || withStats < lg.size * 0.7) {
      // tabela transcluída de um template, ex.: {{2026–27 La Liga table}}
      const trans = [...text.matchAll(/\{\{\s*(?:#section-h:|#lst:|#lsth:)?\s*([^{}|\n]*?(?:table|Table)[^{}|\n]*?)\s*[|}]/g)]
        .map((m) => m[1].trim())
        .filter((x) => !/^#invoke|sports table|rbr|^table/i.test(x));
      const tplTitles = [...new Set(trans)].flatMap((x) => (x.includes(':') ? [x] : ['Template:' + x, x]));
      if (tplTitles.length) {
        const tpages = await fetchPages(tplTitles, { useCache: !NO_CACHE_LEAGUES });
        for (const tp of tpages.values()) {
          text += '\n' + tp.text;
        }
        rows = parseLeagueTable(text);
      }
    }
    // dedupe por link
    const byLink = new Map();
    for (const r of rows) {
      const prev = byLink.get(r.link);
      if (!prev || (r.w !== null && prev.w === null)) byLink.set(r.link, r);
    }
    rows = [...byLink.values()];
    if (rows.length) return { article: page.title, rows };
  }
  return { article: null, rows: [] };
}

// ---------------------------------------------------------------
async function main() {
  const leagues = ONLY ? LEAGUES.filter((l) => ONLY.includes(l.id)) : LEAGUES;
  const prev = fs.existsSync(RAW_OUT) ? JSON.parse(fs.readFileSync(RAW_OUT, 'utf8')) : { leagues: [], clubs: [], players: {} };

  console.log(`\n== 1/5 Ligas (${leagues.length}) ==`);
  const leagueOut = [];
  for (const lg of leagues) {
    const { article, rows } = await fetchLeague(lg);
    let clubsRows = rows;
    if (rows.length > lg.size * 1.4) {
      // muitos nomes (tabelas extras): prioriza quem tem estatísticas
      const withStats = rows.filter((r) => r.w !== null);
      if (withStats.length >= lg.size * 0.7) clubsRows = withStats;
    }
    console.log(`${lg.id.padEnd(5)} ${String(clubsRows.length).padStart(3)} clubes  (${article || 'NÃO ENCONTRADO'})`);
    leagueOut.push({ ...lg, article, clubs: clubsRows });
  }

  console.log('\n== 2/5 Páginas dos clubes ==');
  const allClubLinks = leagueOut.flatMap((l) => l.clubs.map((c) => c.link));
  const clubPages = await fetchPages(allClubLinks);
  // templates de elenco transcluídos ({{X squad}})
  const needTpl = [];
  for (const link of allClubLinks) {
    const pg = clubPages.get(link);
    if (!pg) continue;
    const squad = parseSquad(pg.text);
    if (squad.length < 15) {
      const tpls = [...pg.text.matchAll(/\{\{\s*([^{}|\n]*?(?:squad|Squad|current squad|first team)[^{}|\n]*?)\s*\}\}/g)].map((m) => m[1].trim()).filter((x) => !/sidebar|on pitch|navbox/i.test(x));
      for (const t of tpls) needTpl.push(t.startsWith('Template:') ? t : 'Template:' + t);
      pg.tpls = tpls.map((t) => (t.startsWith('Template:') ? t : 'Template:' + t));
    }
  }
  const tplPages = needTpl.length ? await fetchPages(needTpl) : new Map();

  const clubs = [];
  for (const lg of leagueOut) {
    for (const row of lg.clubs) {
      const pg = clubPages.get(row.link);
      if (!pg) {
        console.log(`  - sem página: ${row.link}`);
        continue;
      }
      let squad = parseSquad(pg.text);
      if (squad.length < 15 && pg.tpls) {
        for (const t of pg.tpls) {
          const tp = tplPages.get(t);
          if (tp) {
            const s2 = parseSquad('== Players ==\n' + tp.text);
            if (s2.length > squad.length) squad = s2;
          }
        }
      }
      const info = parseInfobox(pg.text);
      clubs.push({ league: lg.id, title: pg.title, qid: pg.qid, key: row.key, label: row.label, stats: { w: row.w, d: row.d, l: row.l, gf: row.gf, ga: row.ga }, info, squad });
    }
  }
  const weak = clubs.filter((c) => c.squad.length < 15);
  console.log(`clubes: ${clubs.length}, jogadores listados: ${clubs.reduce((s, c) => s + c.squad.length, 0)}, clubes com elenco fraco (<15): ${weak.length}`);
  for (const w of weak) console.log(`  · ${w.league} ${w.title}: ${w.squad.length}`);

  console.log('\n== 3/5 IDs Wikidata dos jogadores ==');
  const links = [...new Set(clubs.flatMap((c) => c.squad.map((p) => p.link).filter(Boolean)))];
  const linkToQid = new Map();
  let done = 0;
  for (const group of chunk(links, 50)) {
    const j = await wikiApi({ action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', titles: group.join('|'), redirects: '1' });
    const alias = new Map();
    for (const n of j.query?.normalized || []) alias.set(n.to, n.from);
    for (const r of j.query?.redirects || []) alias.set(r.to, alias.get(r.from) || r.from);
    for (const p of j.query?.pages || []) {
      if (p.missing || !p.pageprops?.wikibase_item) continue;
      let k = p.title;
      linkToQid.set(k, p.pageprops.wikibase_item);
      const seen = new Set();
      while (alias.has(k) && !seen.has(k)) { seen.add(k); k = alias.get(k); linkToQid.set(k, p.pageprops.wikibase_item); }
    }
    done += group.length;
    if (done % 1000 < 50) process.stdout.write(`  ${done}/${links.length}\n`);
  }
  console.log(`  ${linkToQid.size}/${links.length} com Wikidata`);

  console.log('\n== 4/5 Wikidata (nascimento, posição, fama) ==');
  const qids = [...new Set([...linkToQid.values(), ...clubs.map((c) => c.qid).filter(Boolean)])];
  const wd = {};
  for (const group of chunk(qids, 250)) {
    const query = `SELECT ?item (SAMPLE(?dob) AS ?d) (GROUP_CONCAT(DISTINCT ?posL; separator="|") AS ?ps) (SAMPLE(?sl) AS ?s) (SAMPLE(?h) AS ?hh) WHERE {
      VALUES ?item { ${group.map((q) => 'wd:' + q).join(' ')} }
      OPTIONAL { ?item wdt:P569 ?dob }
      OPTIONAL { ?item wdt:P2048 ?h }
      OPTIONAL { ?item wdt:P413 ?pos . ?pos rdfs:label ?posL . FILTER(LANG(?posL) = "en") }
      OPTIONAL { ?item wikibase:sitelinks ?sl }
    } GROUP BY ?item`;
    const j = await getJSON('https://query.wikidata.org/sparql', { host: 'wdqs', interval: 1200, body: new URLSearchParams({ query, format: 'json' }).toString() });
    for (const b of j.results.bindings) {
      const q = b.item.value.split('/').pop();
      wd[q] = { dob: b.d?.value?.slice(0, 10) || null, pos: b.ps?.value || '', sl: b.s ? parseInt(b.s.value, 10) : 0 };
    }
  }
  console.log(`  ${Object.keys(wd).length} entidades`);

  console.log('\n== 5/5 Escudos ==');
  const files = [...new Set(clubs.map((c) => c.info.image).filter(Boolean))];
  const fileUrl = new Map();
  for (const group of chunk(files, 50)) {
    const j = await wikiApi({ action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '128', titles: group.map((f) => 'File:' + f).join('|') });
    const norm = new Map((j.query?.normalized || []).map((n) => [n.to, n.from]));
    for (const p of j.query?.pages || []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const asked = (norm.get(p.title) || p.title).replace(/^File:/, '');
      fileUrl.set(asked, ii.thumburl || ii.url);
      fileUrl.set(p.title.replace(/^File:/, ''), ii.thumburl || ii.url);
    }
  }
  let dl = 0;
  for (const c of clubs) {
    c.slug = slugify(c.title);
    const url = fileUrl.get(c.info.image) || fileUrl.get(c.info.image.replace(/_/g, ' '));
    if (!url) continue;
    const ext = url.match(/\.(png|jpe?g|gif|webp)(?:$|\?)/i)?.[1]?.toLowerCase() || 'png';
    const dest = path.join(LOGO_DIR, `${c.slug}.${ext === 'jpeg' ? 'jpg' : ext}`);
    c.logo = `logos/${path.basename(dest)}`;
    if (fs.existsSync(dest)) continue;
    for (let attempt = 0; attempt < 4; attempt++) {
      await throttle('upload', 250);
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        dl++;
        break;
      } catch (e) {
        await sleep(2000 * (attempt + 1));
        if (attempt === 3) { console.log(`  ! escudo falhou: ${c.title} (${e.message})`); delete c.logo; }
      }
    }
  }
  console.log(`  ${clubs.filter((c) => c.logo).length}/${clubs.length} escudos (${dl} baixados agora)`);

  // monta saída bruta (mescla com ligas não re-coletadas quando --only)
  for (const c of clubs) {
    for (const p of c.squad) {
      const q = p.link ? linkToQid.get(p.link) : null;
      if (q && wd[q]) Object.assign(p, { qid: q, dob: wd[q].dob, wpos: wd[q].pos, sl: wd[q].sl });
    }
    if (c.qid && wd[c.qid]) c.sl = wd[c.qid].sl;
  }
  const leagueIds = new Set(leagueOut.map((l) => l.id));
  const out = {
    generatedAt: new Date().toISOString(),
    leagues: [...prev.leagues.filter((l) => !leagueIds.has(l.id)), ...leagueOut.map(({ clubs: cl, ...l }) => ({ ...l, clubCount: cl.length }))],
    clubs: [...prev.clubs.filter((c) => !leagueIds.has(c.league)), ...clubs],
  };
  fs.writeFileSync(RAW_OUT, JSON.stringify(out));
  console.log(`\nOK -> ${RAW_OUT}`);
}

function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
