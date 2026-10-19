// Builds gtm/accounts.json: 40 mock enterprise accounts for the GTM Operating System prototype.
// Names, reps, calls, projects and usage come from the existing synthetic tables in ../zoom/data.json.
// Dollar figures are generated here so the portfolio totals reconcile exactly: in-flight 480.0, commit 185.0, baseline forecast 210.0, uplift 24.0 ($M).
const fs = require('fs'), path = require('path');
const T = require('../zoom/data.json').tables;
const AS_OF = Date.parse('2026-10-17T00:00:00Z'), DAY = 864e5;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261017), pick = (a) => a[Math.floor(R() * a.length)], r1 = (x) => Math.round(x * 10) / 10;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const days = (iso) => Math.round((Date.parse(iso.slice(0, 10) + 'T00:00:00Z') - AS_OF) / DAY);

// three fictional accounts carry the three narrative risk threads; they replace three real names so no real company is named in a risk story
const RENAME = { 'Franklin Covey': 'Acme Corp', Dyson: 'Northwind Traders', 'Avis Budget Group': 'Contoso Ltd' };
const FORCED = { 'Acme Corp': 'single', 'Northwind Traders': 'business', 'Contoso Ltd': 'stalled' };
const users = Object.fromEntries(T.sf_users.map((u) => [u.user_id, u]));
const base = T.sf_accounts.map((a) => Object.assign({}, a, { name: RENAME[a.account_name] || a.account_name }));

// ---- dollars that reconcile ----
const w0 = base.map((a) => a.arr_current * (0.55 + R() * 0.9)), wS = w0.reduce((s, x) => s + x, 0);
let inFlight = w0.map((x) => r1((x / wS) * 480)); inFlight[inFlight.indexOf(Math.max(...inFlight))] += r1(480 - inFlight.reduce((s, x) => s + x, 0));
const p = base.map(() => 0.2 + R() * 0.4), kc = 185 / inFlight.reduce((s, x, i) => s + x * p[i], 0);
let commit = inFlight.map((x, i) => r1(x * Math.min(0.85, p[i] * kc))); const ci = commit.indexOf(Math.max(...commit)); commit[ci] = r1(commit[ci] + 185 - commit.reduce((s, x) => s + x, 0));
const q = base.map(() => 0.03 + R() * 0.17), k2 = (210 - commit.reduce((s, x) => s + x, 0)) / inFlight.reduce((s, x, i) => s + (x - commit[i]) * q[i], 0);
let fc = inFlight.map((x, i) => r1(commit[i] + (x - commit[i]) * Math.min(1, q[i] * k2))); const fi = fc.indexOf(Math.max(...fc)); fc[fi] = r1(fc[fi] + 210 - fc.reduce((s, x) => s + x, 0));
fc = fc.map((x, i) => Math.min(inFlight[i], Math.max(x, commit[i])));
inFlight = inFlight.map(r1); commit = commit.map(r1); fc = fc.map(r1);
const upl = base.map(() => 0), order = fc.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]).slice(0, 15).map((x) => x[1]), uw = order.map(() => 0.4 + R()), us = uw.reduce((s, x) => s + x, 0);
order.forEach((i, j) => (upl[i] = r1((uw[j] / us) * 24))); upl[order[0]] = r1(upl[order[0]] + 24 - upl.reduce((s, x) => s + x, 0));
upl.forEach((x, i) => (upl[i] = r1(x)));

// ---- cross-system signals from the existing tables ----
const STAGE_RANK = ['Discovery', 'Validate', 'Proposal', 'Negotiation', 'Contracting'];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const abbr = (s) => s.split(/[\s&.-]+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 4);
const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const sfid = () => '006' + Array.from({ length: 15 }, () => B62[Math.floor(R() * 62)]).join('');
const accounts = base.map((a, i) => {
  const calls = T.gong_calls.filter((c) => c.account_id === a.account_id).sort((x, y) => (x.call_date < y.call_date ? 1 : -1));
  const last3 = calls.slice(0, 3), flags = [];
  if (last3.length && last3.every((c) => !+c.executive_present)) flags.push({ k: 'noexec', label: 'No executive on last 3 calls' });
  if (calls.slice(0, 5).some((c) => c.competitors_mentioned)) flags.push({ k: 'comp', label: 'Competitor named' });
  if (calls[0] && !+calls[0].next_step_agreed) flags.push({ k: 'nonext', label: 'No next step agreed' });
  if (last3.length && last3.reduce((s, c) => s + +c.sentiment, 0) / last3.length < 0.1) flags.push({ k: 'neg', label: 'Cooling sentiment' });
  const gap = calls[0] ? -days(calls[0].call_date) : 99; if (gap > 21) flags.push({ k: 'gap', label: 'No call in ' + gap + ' days' });
  const pr = T.monday_projects.filter((x) => x.account_id === a.account_id), rk = { Blocked: 3, 'At risk': 2, 'On track': 1, Done: 0 }, top = pr.slice().sort((x, y) => rk[y.status] - rk[x.status])[0];
  const us = T.grafana_usage.filter((x) => x.account_id === a.account_id).sort((x, y) => (x.month < y.month ? -1 : 1)), la = us[us.length - 1], pv = us[us.length - 2];
  const delta = la && pv ? Math.round(((la.active_seats - pv.active_seats) / Math.max(1, pv.active_seats)) * 100) : 0;
  const opps = T.sf_opportunities.filter((o) => o.account_id === a.account_id && STAGE_RANK.includes(o.stage)).sort((x, y) => STAGE_RANK.indexOf(y.stage) - STAGE_RANK.indexOf(x.stage)), opp = opps[0];
  let thread = FORCED[a.name] || null;
  const fl = (k) => flags.some((x) => x.k === k);
  if (!thread) thread = fl('noexec') && fl('comp') && fl('nonext') ? 'single' : top && top.status === 'Blocked' && ['Proposal', 'Negotiation', 'Contracting'].includes(opp ? opp.stage : '') ? 'business' : (gap > 21 && delta <= -5) || delta <= -10 ? 'stalled' : null;
  const f = FORCED[a.name];
  if (f === 'single' && !flags.some((x) => x.k === 'noexec')) flags.unshift({ k: 'noexec', label: 'No meeting with the new decision-maker' });
  if (f === 'stalled') { if (!flags.some((x) => x.k === 'gap')) flags.push({ k: 'gap', label: 'No executive meeting in 14 days' }); }
  return {
    id: a.account_id, name: a.name, parent: a.name.replace(/[,.]+$/, '') + ' Group Holdings', duns: (() => { const d = String(Math.floor(R() * 1e9)).padStart(9, '0'); return d.slice(0, 2) + '-' + d.slice(2, 5) + '-' + d.slice(5); })(),
    region: a.region, industry: a.industry_group, rep: users[a.owner_id].name, repId: a.owner_id, sfdcOppId: sfid(), leadSource: opp ? opp.lead_source : 'Sales-sourced', stage: opp ? opp.stage : 'Proposal', product: opp ? opp.product_line : 'Workplace',
    owns: { workplace: !!+a.owns_workplace, phone: !!+a.owns_phone, contactCenter: !!+a.owns_contact_center, ai: !!+a.owns_ai_addon }, segment: a.segment, rival: (() => { const c = {}; opps.forEach((o) => { if (o.competitor && o.competitor !== 'None') c[o.competitor] = (c[o.competitor] || 0) + 1; }); const t = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return t ? t[0] : null; })(),
    inFlight: inFlight[i], commit: commit[i], forecast: fc[i], uplift: upl[i],
    mix: (() => { const m = { Workplace: 0, Phone: 0, 'Contact Center': 0, AI: 0 }; opps.forEach((o) => (m[o.product_line] += +o.amount_arr)); const s = Object.values(m).reduce((x, y) => x + y, 0); if (!s) { m[opp ? opp.product_line : 'Workplace'] = 1; return m; } Object.keys(m).forEach((k) => (m[k] = Math.round((m[k] / s) * 1000) / 1000)); return m; })(),
    gong: { calls: calls.length, flags, lastCallDays: gap, sentiment: last3.length ? Math.round((last3.reduce((s, c) => s + +c.sentiment, 0) / last3.length) * 100) / 100 : null },
    monday: top ? { state: top.status, phase: top.phase, product: top.product, blocker: top.blocker || '' } : { state: 'No project', phase: '', product: '', blocker: '' },
    usage: { deltaPct: delta, activePct: la ? Math.round((la.active_seats / la.licensed_seats) * 100) : 0 }, renewalDays: days(a.renewal_date),
    legacyExpiryDays: R() < 0.38 ? Math.round(30 + R() * 210) : null, thread
  };
});

// ---- entity resolution: 120 cross-system links (Gong, monday.com, Grafana against Salesforce) ----
const SRC = ['gong', 'monday', 'grafana'];
const links = []; accounts.forEach((a, i) => SRC.forEach((s) => links.push([i, s])));
const legacySet = new Set(shuffle(links.map((_, i) => i)).slice(0, 47)), unresolved = links.map((_, i) => i).filter((i) => !legacySet.has(i)), review = unresolved[Math.floor(R() * unresolved.length)];
links.forEach(([i, s], n) => {
  const a = accounts[i], ok = legacySet.has(n), nm = a.name;
  const alias = { gong: ok ? nm.toUpperCase() : pick([nm.split(' ')[0] + ' Corp. (EMEA)', abbr(nm) + ' Intl', nm.replace(/ (Inc|Corp|Ltd|Group).*$/, '') + ' Subsidiary LLC']), monday: ok ? nm + ' - ' + (a.monday.product || 'Rollout') : 'PRJ-' + abbr(nm) + '-' + (100 + Math.floor(R() * 800)), grafana: ok ? slug(nm) + '-prod' : slug(nm).slice(0, 6) + '-tenant-' + String(10 + Math.floor(R() * 89)) }[s];
  a.sources = a.sources || { salesforce: { name: a.name } };
  a.sources[s] = { name: alias, legacy: ok, databook: n !== review };
});
const legacyRate = links.filter((_, n) => legacySet.has(n)).length / links.length, databookRate = (links.length - 1) / links.length;

const sum = (k) => r1(accounts.reduce((s, a) => s + a[k], 0));
const meta = { asOf: '2026-10-17', accounts: accounts.length, inFlight: sum('inFlight'), commit: sum('commit'), forecast: sum('forecast'), uplift: sum('uplift'), links: links.length, legacyResolved: legacySet.size, databookResolved: links.length - 1, legacyRate, databookRate, upliftByQuarter: [['Q4 FY26', 3.2], ['Q1 FY27', 8.9], ['Q2 FY27', 16.1], ['Q3 FY27', 24.0]] };
const bad = [['inFlight', 480], ['commit', 185], ['forecast', 210], ['uplift', 24]].filter(([k, v]) => Math.abs(meta[k] - v) > 0.05);
if (bad.length) { console.error('totals do not reconcile', bad, meta); process.exit(1); }
if (accounts.some((a) => a.commit > a.forecast + 1e-9 || a.forecast > a.inFlight + 1e-9)) { console.error('per-account ordering broken'); process.exit(1); }
fs.writeFileSync(path.join(__dirname, 'accounts.json'), JSON.stringify({ meta, accounts }, null, 1));
console.log('accounts.json', accounts.length, JSON.stringify({ inFlight: meta.inFlight, commit: meta.commit, forecast: meta.forecast, uplift: meta.uplift, legacy: meta.legacyResolved + '/' + meta.links, databook: meta.databookResolved + '/' + meta.links }), 'threads', accounts.filter((a) => a.thread).length);
