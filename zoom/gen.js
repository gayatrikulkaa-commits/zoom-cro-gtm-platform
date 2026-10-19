// Generates the illustrative workbook tables with a fixed seed. Real company names are used as illustrative accounts; every other value is synthetic.
const fs = require('fs'), path = require('path');
const XLSX = require('../tools/node_modules/xlsx');
const { SOURCES, SHEETS, DERIVED, FRONT } = require('./schema');
const ZM = require('./model');
const ZM2 = require('./model2');

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SEED = +(process.env.SEED || 188);
const rnd = mulberry32(SEED);
const R = (a, b) => a + (b - a) * rnd();
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sum = (a, f) => a.reduce((t, x) => t + (f ? f(x) : x), 0);
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const ASOF = '2026-10-17', PILOT = '2026-07-20';
const dms = 864e5, ms = (s) => Date.parse(s + 'T00:00:00Z'), iso = (m) => new Date(m).toISOString().slice(0, 10);
const addD = (s, n) => iso(ms(s) + n * dms);
const REGIONS = ['Americas', 'EMEA', 'APAC'], PRODUCTS = ['Workplace', 'Phone', 'Contact Center', 'AI'];
const STAMP = (src) => SOURCES[src].updated;

// ---------------- users ----------------
const U = [];
const addU = (name, role, region, mgr, hire, pilot) => U.push({ user_id: 'u' + String(U.length + 1).padStart(2, '0'), name, role, region, manager_id: mgr, hire_date: hire, quota_fy27_arr: '', pilot_flag: pilot ? 1 : 0, ramp_months_to_first_win: '' });
addU('Chief Revenue Officer (viewer)', 'CRO', 'Global', '', '2022-03-01', 0);
addU('Gregory Hale', 'Regional Vice President', 'Americas', 'u01', '2021-05-10', 0);
addU('Isabelle Laurent', 'Regional Vice President', 'EMEA', 'u01', '2022-01-17', 0);
addU('Takashi Mori', 'Regional Vice President', 'APAC', 'u01', '2021-09-06', 0);
const AEs = [
  ['Marcus Reyes', 'Americas', '2019-04-08', 1], ['Priya Anand', 'Americas', '2025-02-24', 0], ['Jordan Whitfield', 'Americas', '2020-08-03', 1], ['Elena Castillo', 'Americas', '2021-11-15', 0],
  ['Daniel Okafor', 'Americas', '2018-06-11', 1], ['Sarah Lindqvist', 'Americas', '2024-10-07', 1], ['Tyler Brooks', 'Americas', '2022-03-21', 0], ['Monica Alvarez', 'Americas', '2025-07-14', 0],
  ['Lukas Hartmann', 'EMEA', '2020-02-10', 1], ['Charlotte Dubois', 'EMEA', '2023-05-02', 0], ['Oliver Grant', 'EMEA', '2019-09-23', 0], ['Sofia Marini', 'EMEA', '2025-03-03', 1], ['Henrik Nilsson', 'EMEA', '2022-08-29', 0],
  ['Kenji Watanabe', 'APAC', '2019-11-04', 1], ['Aarav Mehta', 'APAC', '2023-01-16', 0], ['Mei Tan', 'APAC', '2025-04-21', 1],
];
const RVP = { Americas: 'u02', EMEA: 'u03', APAC: 'u04' };
AEs.forEach((a) => addU(a[0], 'Account Executive', a[1], RVP[a[1]], a[2], a[3]));
[['Rachel Kim', 'Americas'], ['Brandon Cole', 'Americas'], ['Alicia Moreno', 'Americas'], ['Anna Kowalski', 'EMEA'], ['Tom Ridley', 'EMEA'], ['Hana Sato', 'APAC'], ['Vikram Rao', 'APAC']].forEach((c) => addU(c[0], 'Customer Success Manager', c[1], RVP[c[1]], pick(['2020-03-09', '2021-06-14', '2022-10-03', '2023-02-20']), 0));
[['Nina Patel', 'Americas'], ['Felix Bauer', 'EMEA'], ['Daniel Lim', 'APAC']].forEach((c) => addU(c[0], 'Solutions Engineer', c[1], RVP[c[1]], pick(['2021-04-12', '2022-09-19', '2023-07-10']), 0));
const aeBy = (r) => U.filter((u) => u.role === 'Account Executive' && u.region === r), csmBy = (r) => U.filter((u) => u.role === 'Customer Success Manager' && u.region === r), seBy = (r) => U.filter((u) => u.role === 'Solutions Engineer' && u.region === r);
// ramp months for hires inside 24 months
U.filter((u) => u.role === 'Account Executive').forEach((u) => { if ((ms(ASOF) - ms(u.hire_date)) / dms < 740) u.ramp_months_to_first_win = r2(R(4.5, 7.5) - (u.pilot_flag ? 0.8 : 0)); });

// ---------------- accounts ----------------
const ACC = [
  ['Nike', 'Americas', 'US', 'Beaverton', 'Apparel and retail', '50,000+', 'E'], ['Humana', 'Americas', 'US', 'Louisville', 'Health insurance', '50,000+', 'E'], ['Contoso Ltd', 'Americas', 'US', 'Parsippany', 'Travel and mobility', '10,000-50,000', 'E'],
  ['Acme Corp', 'Americas', 'US', 'Salt Lake City', 'Professional services', '1,000-10,000', 'S'], ['Target', 'Americas', 'US', 'Minneapolis', 'Retail', '50,000+', 'E'], ['Delta Air Lines', 'Americas', 'US', 'Atlanta', 'Airlines', '50,000+', 'S'],
  ['Kroger', 'Americas', 'US', 'Cincinnati', 'Grocery retail', '50,000+', 'R'], ['Marriott International', 'Americas', 'US', 'Bethesda', 'Hospitality', '50,000+', 'E'], ['Procter & Gamble', 'Americas', 'US', 'Cincinnati', 'Consumer goods', '50,000+', 'E'],
  ['Ford Motor Company', 'Americas', 'US', 'Dearborn', 'Automotive', '50,000+', 'T'], ['Chevron', 'Americas', 'US', 'Houston', 'Energy', '10,000-50,000', 'R'], ['Pfizer', 'Americas', 'US', 'New York', 'Pharmaceuticals', '50,000+', 'T'],
  ['Citigroup', 'Americas', 'US', 'New York', 'Banking', '50,000+', 'S'], ['State Farm', 'Americas', 'US', 'Bloomington', 'Insurance', '50,000+', 'S'], ['Comcast', 'Americas', 'US', 'Philadelphia', 'Media and telecom', '50,000+', 'S'],
  ['Starbucks', 'Americas', 'US', 'Seattle', 'Food service', '50,000+', 'S'], ['Lockheed Martin', 'Americas', 'US', 'Bethesda', 'Aerospace and defense', '50,000+', 'R'], ['Royal Bank of Canada', 'Americas', 'CA', 'Toronto', 'Banking', '50,000+', 'S'],
  ['Shopify', 'Americas', 'CA', 'Ottawa', 'Software', '10,000-50,000', 'S'], ['Mercado Libre', 'Americas', 'AR', 'Buenos Aires', 'E-commerce', '10,000-50,000', 'R'],
  ['Northwind Traders', 'EMEA', 'UK', 'Malmesbury', 'Consumer appliances', '10,000-50,000', 'T'], ['Diageo', 'EMEA', 'UK', 'London', 'Beverages', '10,000-50,000', 'E'], ['Unilever', 'EMEA', 'UK', 'London', 'Consumer goods', '50,000+', 'E'],
  ['Siemens', 'EMEA', 'DE', 'Munich', 'Industrial technology', '50,000+', 'E'], ['Allianz', 'EMEA', 'DE', 'Munich', 'Insurance', '50,000+', 'S'], ['BMW Group', 'EMEA', 'DE', 'Munich', 'Automotive', '50,000+', 'T'],
  ['Nestlé', 'EMEA', 'CH', 'Vevey', 'Food and beverage', '50,000+', 'T'], ['Novartis', 'EMEA', 'CH', 'Basel', 'Pharmaceuticals', '50,000+', 'S'], ['Shell', 'EMEA', 'UK', 'London', 'Energy', '50,000+', 'S'],
  ['Carrefour', 'EMEA', 'FR', 'Massy', 'Grocery retail', '50,000+', 'R'], ['Banco Santander', 'EMEA', 'ES', 'Madrid', 'Banking', '50,000+', 'S'], ['Philips', 'EMEA', 'NL', 'Amsterdam', 'Health technology', '50,000+', 'R'],
  ['Toyota Motor', 'APAC', 'JP', 'Toyota City', 'Automotive', '50,000+', 'S'], ['Samsung Electronics', 'APAC', 'KR', 'Suwon', 'Electronics', '50,000+', 'T'], ['Infosys', 'APAC', 'IN', 'Bengaluru', 'IT services', '50,000+', 'E'],
  ['Tata Consultancy Services', 'APAC', 'IN', 'Mumbai', 'IT services', '50,000+', 'S'], ['Commonwealth Bank of Australia', 'APAC', 'AU', 'Sydney', 'Banking', '10,000-50,000', 'E'], ['Telstra', 'APAC', 'AU', 'Melbourne', 'Telecom', '10,000-50,000', 'R'],
  ['DBS Bank', 'APAC', 'SG', 'Singapore', 'Banking', '10,000-50,000', 'E'], ['Rakuten Group', 'APAC', 'JP', 'Tokyo', 'E-commerce', '10,000-50,000', 'R'],
];
const OWN_P = { E: [0.55, 0.2, 0.3], S: [0.6, 0.2, 0.2], R: [0.5, 0.2, 0.1], T: [0.5, 0.1, 0.15] };
const NRR_BY = { E: [1.12, 0.05], S: [1.01, 0.03], R: [0.92, 0.04], T: [1.0, 0.02] };
const rr = { Americas: 0, EMEA: 0, APAC: 0 }, rc = { Americas: 0, EMEA: 0, APAC: 0 };
let rawArr = ACC.map((a) => clamp(Math.exp(Math.log(8.6) + 0.72 * gauss()), 2.6, 52) * (a[6] === 'R' ? 0.62 : a[6] === 'E' ? 1.08 : 1));
const arrScale = 470 / sum(rawArr);
const accounts = ACC.map((a, i) => {
  const [name, region, country, city, industry, emp, arch] = a;
  const ae = aeBy(region)[rr[region]++ % aeBy(region).length], csm = csmBy(region)[rc[region]++ % csmBy(region).length];
  const arr = r2(rawArr[i] * arrScale), ratio = NRR_BY[arch][0] + NRR_BY[arch][1] * gauss() * 0.6;
  const arr12 = r2(arr / ratio), contr = arch === 'R' ? r2(arr12 * R(0.04, 0.1)) : arch === 'S' ? r2(arr12 * R(0, 0.02)) : 0;
  const op = OWN_P[arch], ph = rnd() < op[0] ? 1 : 0, cc = rnd() < op[1] ? 1 : 0, ai = rnd() < op[2] ? 1 : 0;
  const seats = Math.round((arr * 0.55 * 1e6) / R(160, 230) / 100) * 100;
  const renewal = arch === 'R' ? RI(35, 160) : arch === 'T' ? RI(120, 330) : arch === 'E' ? RI(150, 520) : RI(70, 480);
  return { account_id: 'A' + String(i + 1).padStart(3, '0'), account_name: name, region, country, hq_city: city, industry, segment: arr >= 14 ? 'Global' : 'Strategic', employees_band: emp, owner_id: ae.user_id, csm_id: csm.user_id, arr_current: arr, arr_12m_ago: arr12, contraction_ttm: contr, renewal_date: addD(ASOF, renewal), seats_licensed: seats, owns_workplace: 1, owns_phone: ph, owns_contact_center: cc, owns_ai_addon: ai, phone_seats_licensed: ph ? Math.round(seats * R(0.25, 0.6) / 50) * 50 : '', cc_agents_licensed: cc ? Math.round(R(120, 1800) / 10) * 10 : '', nps: ({ E: 46, S: 30, R: -8, T: 20 }[arch]) + ((i * 37) % 21) - 10, _arch: arch };
});
const IND_MAP = { 'Apparel and retail': 'Retail and consumer', Retail: 'Retail and consumer', 'Grocery retail': 'Retail and consumer', 'Consumer goods': 'Retail and consumer', 'Consumer appliances': 'Retail and consumer', Beverages: 'Retail and consumer', 'Food and beverage': 'Retail and consumer', 'Food service': 'Retail and consumer', 'E-commerce': 'Retail and consumer', Banking: 'Financial services', Insurance: 'Financial services', 'Health insurance': 'Healthcare and life sciences', Pharmaceuticals: 'Healthcare and life sciences', 'Health technology': 'Healthcare and life sciences', Software: 'Technology and telecom', 'IT services': 'Technology and telecom', 'Media and telecom': 'Technology and telecom', Telecom: 'Technology and telecom', Electronics: 'Technology and telecom', Automotive: 'Industrial and energy', Energy: 'Industrial and energy', 'Aerospace and defense': 'Industrial and energy', 'Industrial technology': 'Industrial and energy', 'Travel and mobility': 'Travel and services', Airlines: 'Travel and services', Hospitality: 'Travel and services', 'Professional services': 'Travel and services' };
accounts.forEach((a) => { a.industry_group = IND_MAP[a.industry]; if (!a.industry_group) throw new Error('no industry group for ' + a.industry); });
const A = Object.fromEntries(accounts.map((a) => [a.account_id, a]));

// ---------------- contacts ----------------
const FN = ['Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Avery', 'Quinn', 'Reese', 'Sasha', 'Devon', 'Noor', 'Mateo', 'Ingrid', 'Kenji', 'Leila', 'Anders', 'Chiara', 'Pavel', 'Amara', 'Luca', 'Maya', 'Omar', 'Elise', 'Rohan', 'Yuki'];
const LN = ['Alvarez', 'Whitman', 'Nakamura', 'Okoye', 'Lindgren', 'Haddad', 'Moretti', 'Larsen', 'Baptiste', 'Kowalski', 'Sato', 'Reyes', 'Duval', 'Petrov', 'Hughes', 'Iyer', 'Brandt', 'Costa', 'Mueller', 'Tran', 'Singh', 'Fischer', 'Novak', 'Ellis'];
const PERS = { 'Economic buyer': ['Chief Information Officer', 'SVP Technology', 'VP Infrastructure and Workplace'], 'IT and collaboration owner': ['Director, Collaboration Platforms', 'Head of Unified Communications'], 'Customer experience leader': ['VP Customer Experience', 'Head of Contact Center Operations'], Procurement: ['Senior Manager, Strategic Sourcing', 'Director of Procurement'], Champion: ['Head of Digital Workplace', 'Director, Employee Technology'], Security: ['Director of Information Security', 'Head of Third-Party Risk'] };
const STANCE_BY = { E: ['Supportive', 'Supportive', 'Supportive', 'Neutral'], S: ['Supportive', 'Neutral', 'Neutral', 'Skeptical'], R: ['Skeptical', 'Neutral', 'Skeptical', 'Supportive'], T: ['Neutral', 'Supportive', 'Neutral', 'Skeptical'] };
const contacts = [];
accounts.forEach((a, i) => {
  const n = i < 20 ? 4 : 3, personas = shuffle(['IT and collaboration owner', 'Champion', 'Procurement', 'Security', 'Customer experience leader']).slice(0, n - 1);
  ['Economic buyer'].concat(personas).forEach((p) => {
    const exec = p === 'Economic buyer' || (p === 'Customer experience leader' && rnd() < 0.5);
    const idle = a._arch === 'R' || a._arch === 'T' ? RI(12, 80) : RI(2, 40);
    contacts.push({ contact_id: 'C' + String(contacts.length + 1).padStart(4, '0'), account_id: a.account_id, name: pick(FN) + ' ' + pick(LN), title: pick(PERS[p]), persona: p, is_executive: exec ? 1 : 0, stance: pick(STANCE_BY[a._arch]), last_activity_date: addD(ASOF, -idle) });
  });
});

// ---------------- Grafana usage ----------------
const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const ACT_PATH = { E: [0.62, 0.81], S: [0.7, 0.72], R: [0.76, 0.5], T: [0.66, 0.67] };
const grafana = [];
accounts.forEach((a) => {
  const p = ACT_PATH[a._arch];
  MONTHS.forEach((m, k) => {
    const lic = Math.round(a.seats_licensed * (1 + 0.004 * k * (a._arch === 'E' ? 3 : 1)) / 10) * 10, act = clamp(p[0] + ((p[1] - p[0]) * k) / 5 + 0.015 * gauss(), 0.25, 0.97);
    const active = Math.round(lic * act);
    grafana.push({ account_id: a.account_id, month: m, licensed_seats: lic, active_seats: active, meeting_minutes: Math.round(active * R(900, 1500)), phone_minutes: a.owns_phone ? Math.round(+a.phone_seats_licensed * R(420, 900) * (0.9 + act * 0.2)) : 0, cc_interactions: a.owns_contact_center ? Math.round(+a.cc_agents_licensed * R(160, 330)) : 0, p1_incidents: a._arch === 'R' && k >= 3 ? RI(0, 2) : rnd() < 0.05 ? 1 : 0, call_quality_score: r2(a._arch === 'R' ? R(3.7, 4.05) : R(4.1, 4.55)) });
  });
});

// ---------------- monday.com projects ----------------
const PROJ_PRODUCT = ['Workplace rollout', 'Phone migration', 'Contact Center implementation', 'Rooms deployment', 'AI enablement'];
const PHASES = ['Kickoff', 'Design', 'Build', 'Pilot', 'Go-live', 'Hypercare'];
const BLOCK = ['Waiting on customer security review', 'Number porting delayed with the carrier', 'Integration with Salesforce not yet scoped', 'Customer IT change freeze through quarter end', 'Site readiness for room systems', 'Admin training not scheduled', 'Single sign-on configuration pending'];
const ST_P = { E: [0.1, 0.1, 0.8], S: [0.12, 0.05, 0.83], R: [0.35, 0.3, 0.35], T: [0.35, 0.2, 0.45] }; // at risk, blocked, on track/done
const plan = { E: 17, S: 12, R: 13, T: 12 };
const projects = [];
const cnt = {};
accounts.forEach((a) => { const base = { E: 1, S: a.account_id.charCodeAt(3) % 3 === 0 ? 1 : 0, R: 2, T: 2 }[a._arch]; cnt[a.account_id] = base; });
accounts.filter((a) => a._arch === 'E').slice(0, 5).forEach((a) => (cnt[a.account_id] += 1));
accounts.filter((a) => a._arch === 'R').slice(5, 8).forEach((a) => (cnt[a.account_id] -= 1));
accounts.forEach((a) => {
  for (let k = 0; k < cnt[a.account_id]; k++) {
    const sp = ST_P[a._arch], u = rnd(), status0 = u < sp[0] ? 'At risk' : u < sp[0] + sp[1] ? 'Blocked' : rnd() < 0.35 ? 'Done' : 'On track';
    const start = addD(ASOF, -RI(40, 200)), plannedDur = RI(70, 150), target = addD(start, plannedDur), lateRisk = status0 === 'At risk' || status0 === 'Blocked';
    let phase = status0 === 'Done' ? 'Hypercare' : pick(PHASES.slice(1, 5));
    const target2 = lateRisk && ms(target) > ms(ASOF) ? addD(ASOF, -RI(3, 40)) : target; // blocked projects have missed their date
    projects.push({ project_id: 'P' + String(projects.length + 1).padStart(3, '0'), account_id: a.account_id, product: pick(a.owns_contact_center ? PROJ_PRODUCT : PROJ_PRODUCT.filter((x) => !/Contact/.test(x)) .concat(a._arch === 'E' ? ['Contact Center implementation'] : [])), phase, status: status0, start_date: start, target_go_live: target2, actual_go_live: status0 === 'Done' ? addD(target2, RI(-6, 12)) : '', blocker: lateRisk ? pick(BLOCK) : '', project_owner: rnd() < 0.5 ? pick(seBy(a.region)).user_id : a.csm_id });
  }
});
projects.forEach((p, i) => (p.project_id = 'P' + String(i + 1).padStart(3, '0')));

// ---------------- opportunities: open ----------------
const ARCH_OPPS = { E: [3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 2, 2], S: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1], R: [2, 1, 1, 2, 1, 1, 2, 1], T: [4, 3, 3, 3, 3, 3] };
const archIdx = { E: 0, S: 0, R: 0, T: 0 };
const oppCount = {};
accounts.forEach((a) => (oppCount[a.account_id] = ARCH_OPPS[a._arch][archIdx[a._arch]++]));
const STALE = { E: [0, 8], S: [1, 12], T: [8, 32], R: [3, 20] }, SPON = { E: 0.72, S: 0.56, T: 0.2, R: 0.35 }, THREAD = { E: [3, 5], S: [2, 4], T: [1, 2], R: [1, 3] }, COMP = { E: 0.1, S: 0.15, T: 0.2, R: 0.45 };
const COMPETITORS = ['Microsoft Teams', 'Webex by Cisco', 'Google Meet', 'Five9', 'Genesys', 'RingCentral'];
const LEAD = ['Sales-sourced', 'Marketing', 'Partner', 'Expansion'];
const AMT = { Workplace: [0.3, 2.2], Phone: [0.4, 2.8], 'Contact Center': [0.8, 4.8], AI: [0.2, 1.4] };
function productFor(a) {
  const unowned = PRODUCTS.filter((p) => p !== 'Workplace' && !+a[ZM.OWN_COL[p]]);
  if (a._arch === 'R') return pick(['Workplace', 'Phone']);
  if (a._arch === 'T') return unowned.length ? (unowned.includes('Contact Center') ? 'Contact Center' : pick(unowned)) : pick(['Contact Center', 'Phone']);
  if (unowned.length && rnd() < 0.8) return pick(unowned.concat(unowned.includes('Contact Center') ? ['Contact Center', 'Contact Center'] : []));
  return pick(['Workplace', 'Phone', 'AI']);
}
const open = [];
const q3Count = { Americas: 12, EMEA: 6, APAC: 4 };
const dealsByRegion = (r) => accounts.filter((a) => a.region === r).flatMap((a) => Array(oppCount[a.account_id]).fill(a));
const q3flags = new Set();
REGIONS.forEach((r) => { const list = shuffle(dealsByRegion(r).map((a, i) => i)).slice(0, q3Count[r]); list.forEach((i) => q3flags.add(r + '|' + i)); });
REGIONS.forEach((r) => {
  dealsByRegion(r).forEach((a, idx) => {
    const isQ3 = q3flags.has(r + '|' + idx), arch = a._arch;
    const stage = isQ3 ? pick(['Contracting', 'Contracting', 'Negotiation', 'Negotiation', 'Negotiation', 'Proposal']) : pick(['Discovery', 'Discovery', 'Validate', 'Validate', 'Validate', 'Proposal', 'Proposal', 'Negotiation', 'Contracting']);
    const dtc = isQ3 ? RI(1, 14) : { Contracting: [15, 40], Negotiation: [15, 60], Proposal: [30, 90], Validate: [45, 105], Discovery: [60, 105] }[stage].map((x) => x).reduce((lo, hi) => RI(lo, hi));
    const product = productFor(a), ownerIsAcc = rnd() < 0.8, owner = ownerIsAcc ? A[a.account_id].owner_id : pick(aeBy(r)).user_id, ou = U.find((u) => u.user_id === owner);
    const created = addD(ASOF, -clamp(RI(30, 190), 0, 195) + (stage === 'Discovery' ? 90 : 0)), cd = ms(created) > ms(ASOF) - 3 * dms ? addD(ASOF, -RI(5, 30)) : created;
    const guided = ou.pilot_flag && ms(cd) >= ms(PILOT) && rnd() < 0.85 ? 1 : 0;
    const sp = clamp(SPON[arch] + (stage === 'Contracting' ? 0.15 : stage === 'Discovery' ? -0.2 : 0) + (guided ? 0.12 : 0), 0.05, 0.95);
    const th = THREAD[arch], contactsEng = clamp(RI(th[0], th[1]) + (guided ? (rnd() < 0.5 ? 1 : 0) : 0), 1, 6);
    const stale = RI(STALE[arch][0], STALE[arch][1]) + (stage === 'Contracting' ? -3 : 0);
    const cat = stage === 'Contracting' || (stage === 'Negotiation' && rnd() < 0.7) ? 'Commit' : stage === 'Negotiation' || stage === 'Proposal' ? 'Best Case' : 'Pipeline';
    const type = arch === 'R' ? 'Renewal uplift' : (!+a[ZM.OWN_COL[product]] && product !== 'Workplace') ? (rnd() < 0.2 ? 'New logo' : 'Expansion') : 'Expansion';
    open.push({ opp_id: 'O' + String(1000 + open.length), account_id: a.account_id, owner_id: owner, product_line: product, type: type === 'New logo' ? 'Expansion' : type, stage, amount_arr: r2(R(AMT[product][0], AMT[product][1])), created_date: cd, close_date: addD(ASOF, dtc), forecast_category: cat, rep_probability: { Commit: 0.9, 'Best Case': 0.4, Pipeline: 0.1 }[cat], lead_source: pick(LEAD), discount_pct: Math.round(R(6, 30)), competitor: rnd() < COMP[arch] ? pick(COMPETITORS) : 'None', last_activity_date: addD(ASOF, -clamp(stale, 0, 40)), exec_sponsor: rnd() < sp ? 1 : 0, contacts_engaged: contactsEng, databook_guided: guided, _q3: isQ3 });
  });
});
open.sort((a, b) => a.close_date.localeCompare(b.close_date));
open.forEach((o, i) => (o.opp_id = 'O' + String(1000 + i)));

// ---------------- Gong calls ----------------
const TOPICS_BY = { E: ['Contact center', 'AI Companion', 'Phone migration', 'Rooms', 'Integration with Salesforce', 'Onboarding'], S: ['Renewal', 'Pricing', 'Phone migration', 'Onboarding', 'Integration with Salesforce', 'Rooms'], R: ['Pricing', 'Renewal', 'Quality of service', 'Teams interoperability', 'Security review', 'Onboarding'], T: ['Security review', 'Integration with Salesforce', 'Onboarding', 'Pricing', 'Contact center', 'Rooms'] };
const SENT = { E: 0.55, S: 0.3, R: -0.15, T: 0.2 }, EXECP = { E: 0.55, S: 0.35, R: 0.12, T: 0.15 }, NEXTP = { E: 0.72, S: 0.6, R: 0.35, T: 0.4 }, CALLN = { E: 7, S: 5, R: 4, T: 5 };
const calls = [];
accounts.forEach((a) => {
  const n = CALLN[a._arch] + (rnd() < 0.5 ? 1 : 0), myOpen = open.filter((o) => o.account_id === a.account_id);
  for (let k = 0; k < n; k++) {
    const arch = a._arch, comp = rnd() < (arch === 'R' ? 0.45 : 0.1) ? pick(COMPETITORS.slice(0, 4)) : '';
    const tp = shuffle(TOPICS_BY[arch]).slice(0, RI(1, 3)).join(';');
    calls.push({ call_id: 'G' + String(10000 + calls.length), account_id: a.account_id, opp_id: myOpen.length && rnd() < 0.7 ? pick(myOpen).opp_id : '', call_date: addD(ASOF, -RI(1, 89)), rep_id: rnd() < 0.85 ? a.owner_id : a.csm_id, duration_min: RI(20, 65), external_participants: RI(2, 9), executive_present: rnd() < EXECP[arch] ? 1 : 0, sentiment: r2(clamp(SENT[arch] + 0.22 * gauss(), -0.9, 0.95)), topics: tp, competitors_mentioned: comp, next_step_agreed: rnd() < NEXTP[arch] ? 1 : 0 });
  }
});
while (calls.length > 240) calls.splice(RI(0, calls.length - 1), 1);
while (calls.length < 240) { const a = pick(accounts), arch = a._arch; calls.push({ call_id: 'G' + String(10000 + calls.length), account_id: a.account_id, opp_id: '', call_date: addD(ASOF, -RI(1, 89)), rep_id: a.owner_id, duration_min: RI(20, 65), external_participants: RI(2, 9), executive_present: rnd() < EXECP[arch] ? 1 : 0, sentiment: r2(clamp(SENT[arch] + 0.22 * gauss(), -0.9, 0.95)), topics: shuffle(TOPICS_BY[arch]).slice(0, 2).join(';'), competitors_mentioned: '', next_step_agreed: rnd() < NEXTP[arch] ? 1 : 0 }); }
calls.sort((x, y) => x.call_date.localeCompare(y.call_date)); calls.forEach((c, i) => (c.call_id = 'G' + String(10000 + i)));

// ---------------- external signals ----------------
const SIG = {
  News: ['Announced plans to consolidate collaboration tools across regions', 'Opened a new regional hub, adding offices and staff', 'Launched a customer service modernisation programme', 'Announced a multi-year workplace technology refresh'],
  'Executive move': ['Appointed a new Chief Information Officer', 'New head of customer experience joined from a technology company', 'Chief Financial Officer announced a cost-efficiency review', 'New head of procurement appointed'],
  Hiring: ['Posted 12 roles in contact center operations and workforce management', 'Hiring a collaboration platform owner', 'Hiring for AI and automation in customer service', 'Posted roles for unified communications engineering'],
  Technology: ['Technology profile lists Microsoft Teams Phone', 'Technology profile lists Zoom Workplace', 'Technology profile lists a rival contact center platform', 'Public job posts reference a Cisco Webex migration'],
  Earnings: ['Management cited cost discipline and productivity in the latest results call', 'Management highlighted investment in customer experience', 'Management flagged vendor consolidation as a priority'],
};
const SIG_BIAS = { E: ['News', 'Hiring', 'Hiring', 'Earnings', 'Technology'], S: ['News', 'Executive move', 'Earnings', 'Technology'], R: ['Technology', 'Technology', 'Executive move', 'Earnings'], T: ['Executive move', 'Earnings', 'News', 'Technology'] };
const SRC_BY = { News: 'Licensed news feed (illustrative)', 'Executive move': 'Executive moves feed (illustrative)', Hiring: 'Job postings (illustrative)', Technology: 'Technographics vendor (illustrative)', Earnings: 'Company filings and calls (illustrative)' };
const signals = [];
accounts.forEach((a) => { const n = 3; for (let k = 0; k < n; k++) { const t = pick(SIG_BIAS[a._arch]); let text = pick(SIG[t]); if (t === 'Technology' && a._arch === 'E' && rnd() < 0.5) text = 'Technology profile lists Zoom Workplace'; signals.push({ signal_id: 'S' + String(signals.length + 1).padStart(4, '0'), account_id: a.account_id, type: t, text: text + ' (illustrative)', source: SRC_BY[t], published_date: addD(ASOF, -RI(2, a._arch === 'R' && t === 'Executive move' ? 25 : 80)), license_type: t === 'Earnings' ? 'Public' : 'Licensed' }); } });
while (signals.length < 120) { const a = pick(accounts), t = pick(SIG_BIAS[a._arch]); signals.push({ signal_id: 'S' + String(signals.length + 1).padStart(4, '0'), account_id: a.account_id, type: t, text: pick(SIG[t]) + ' (illustrative)', source: SRC_BY[t], published_date: addD(ASOF, -RI(2, 80)), license_type: t === 'Earnings' ? 'Public' : 'Licensed' }); }
signals.sort((x, y) => x.published_date.localeCompare(y.published_date)); signals.forEach((s, i) => (s.signal_id = 'S' + String(i + 1).padStart(4, '0')));

// ---------------- targets ----------------
const SHARE_R = { Americas: 0.54, EMEA: 0.29, APAC: 0.17 }, SHARE_P = { Workplace: 0.22, Phone: 0.26, 'Contact Center': 0.34, AI: 0.18 };
const QPLAN27 = { 'Q1 FY27': 12, 'Q2 FY27': 14, 'Q3 FY27': 16, 'Q4 FY27': 18 }, QPLAN26 = { 'Q1 FY26': 10, 'Q2 FY26': 11, 'Q3 FY26': 11.5, 'Q4 FY26': 13 };
const targets = [];
Object.keys(QPLAN27).forEach((q) => REGIONS.forEach((r) => PRODUCTS.forEach((p) => targets.push({ fiscal_quarter: q, region: r, product_line: p, plan_arr: r2(QPLAN27[q] * SHARE_R[r] * SHARE_P[p]) }))));

// ---------------- closed opportunities, 7 quarters ----------------
const QS = [['Q1 FY26', '2025-02-01', '2025-04-30'], ['Q2 FY26', '2025-05-01', '2025-07-31'], ['Q3 FY26', '2025-08-01', '2025-10-31'], ['Q4 FY26', '2025-11-01', '2026-01-31'], ['Q1 FY27', '2026-02-01', '2026-04-30'], ['Q2 FY27', '2026-05-01', '2026-07-31'], ['Q3 FY27', '2026-08-01', '2026-10-16']];
const ATT = { 'Q1 FY26': [0.93, 0.88, 0.95], 'Q2 FY26': [0.97, 0.91, 0.85], 'Q3 FY26': [1.02, 0.96, 0.9], 'Q4 FY26': [0.98, 1.01, 0.93], 'Q1 FY27': [0.95, 0.97, 0.9], 'Q2 FY27': [0.99, 0.94, 0.87], 'Q3 FY27': [0.66, 0.72, 0.56] };
const PLANQ = Object.assign({}, QPLAN26, QPLAN27);
const closed = [];
const skill = {}; U.filter((u) => u.role === 'Account Executive').forEach((u) => (skill[u.user_id] = R(0.6, 1.5)));
const pilotMs = ms(PILOT);
QS.forEach(([q, s, e]) => {
  const len = (ms(e) - ms(s)) / dms + 1;
  REGIONS.forEach((r, ri) => {
    const nBase = Math.round(55 * SHARE_R[r] * (q === 'Q3 FY27' ? 0.85 : 1)), N = nBase + RI(-1, 2);
    const accs = accounts.filter((a) => a.region === r), wts = accs.map((a) => a.arr_current);
    const rows = [];
    for (let k = 0; k < N; k++) {
      let u = rnd() * sum(wts), ai = 0; while (u > wts[ai] && ai < accs.length - 1) { u -= wts[ai]; ai++; }
      const a = accs[ai];
      let owner = rnd() < 0.8 ? a.owner_id : (() => { const l = aeBy(r), w = l.map((x) => skill[x.user_id]); let t = rnd() * sum(w), i = 0; while (t > w[i] && i < l.length - 1) { t -= w[i]; i++; } return l[i].user_id; })();
      const ou = U.find((x) => x.user_id === owner), off = Math.floor(len * Math.pow(rnd(), 0.6)), close = addD(s, Math.min(off, len - 1));
      const product = (() => { let t = rnd(), c = 0; for (const p of PRODUCTS) { c += SHARE_P[p]; if (t <= c) return p; } return 'AI'; })();
      const inWin = ms(close) >= pilotMs, guided = ou.pilot_flag && inWin && rnd() < 0.85 ? 1 : 0;
      rows.push({ account_id: a.account_id, owner_id: owner, product_line: product, close_date: close, guided, inWin, region: r, q, _raw: Math.exp(Math.log(0.85) + 0.65 * gauss()) * (AMT[product][1] / 2.1) });
    }
    rows.forEach((x) => closed.push(x));
  });
});
// outcomes: exact counts inside the pilot window by group, per-cell wins elsewhere
const ow = (o) => U.find((u) => u.user_id === o.owner_id).pilot_flag;
const winG = closed.filter((o) => o.inWin && o.guided), winC = closed.filter((o) => o.inWin && !ow(o));
const pickWins = (arr, k) => { shuffle(arr.map((_, i) => i)).slice(0, k).forEach((i) => (arr[i].won = true)); };
pickWins(winG, Math.round(0.31 * winG.length)); pickWins(winC, Math.round(0.28 * winC.length));
closed.filter((o) => o.inWin && ow(o) && !o.guided).forEach((o) => (o.won = rnd() < 0.3));
QS.forEach(([q]) => REGIONS.forEach((r) => { const cell = closed.filter((o) => o.q === q && o.region === r && !o.inWin); pickWins(cell, Math.max(2, Math.round(0.28 * cell.length))); }));
// guarantee at least two wins in each quarter and region
QS.forEach(([q]) => REGIONS.forEach((r) => { const cell = closed.filter((o) => o.q === q && o.region === r), w = cell.filter((o) => o.won); let need = 2 - w.length; cell.filter((o) => !o.won).sort((x, y) => y._raw - x._raw).slice(0, Math.max(0, need)).forEach((o) => (o.won = true)); }));
// current quarter: spread product lines across the closed-won deals, then fit region and product totals together
(() => {
  const q = 'Q3 FY27', won = closed.filter((o) => o.q === q && o.won);
  const order = shuffle(won.map((_, i) => i)), cyc = ['Contact Center', 'Phone', 'Workplace', 'AI', 'Contact Center', 'Phone', 'AI', 'Workplace', 'Contact Center', 'Workplace', 'Phone', 'AI', 'Contact Center', 'Phone'];
  order.forEach((idx, k) => { won[idx].product_line = cyc[k % cyc.length]; });
  const regT = {}; REGIONS.forEach((r, ri) => (regT[r] = PLANQ[q] * SHARE_R[r] * ATT[q][ri]));
  const total = sum(Object.values(regT)), pw = { Workplace: 0.66, Phone: 0.7, 'Contact Center': 0.74, AI: 0.55 }, pt = {}; const psum = sum(PRODUCTS, (p) => pw[p] * PLANQ[q] * SHARE_P[p]);
  PRODUCTS.forEach((p) => (pt[p] = (pw[p] * PLANQ[q] * SHARE_P[p] * total) / psum));
  won.forEach((o) => (o._w = o._raw));
  for (let it = 0; it < 60; it++) {
    REGIONS.forEach((r) => { const rows = won.filter((o) => o.region === r), t = sum(rows, (o) => o._w); if (t) rows.forEach((o) => (o._w *= regT[r] / t)); });
    PRODUCTS.forEach((p) => { const rows = won.filter((o) => o.product_line === p), t = sum(rows, (o) => o._w); if (t) rows.forEach((o) => (o._w *= pt[p] / t)); });
  }
  REGIONS.forEach((r) => { const rows = won.filter((o) => o.region === r), t = sum(rows, (o) => o._w); if (t) rows.forEach((o) => (o._w *= regT[r] / t)); });
  won.forEach((o) => (o._raw = o._w));
})();
// amounts: scale each won set to the actual for the quarter and region
QS.forEach(([q]) => REGIONS.forEach((r, ri) => {
  const cell = closed.filter((o) => o.q === q && o.region === r), won = cell.filter((o) => o.won), target = PLANQ[q] * SHARE_R[r] * ATT[q][ri];
  const k = target / sum(won, (o) => o._raw); cell.forEach((o) => { o.amount_arr = r2(Math.max(0.05, o._raw * k * (o.won ? 1 : 1.15))); });
}));
const closedRows = closed.sort((x, y) => x.close_date.localeCompare(y.close_date)).map((o, i) => {
  const a = A[o.account_id], arch = a._arch, ou = U.find((u) => u.user_id === o.owner_id);
  const cycle = o.won ? Math.round(R(72, 150) - (o.guided ? 6 : 0)) : Math.round(R(40, 165));
  const sponsor = rnd() < (o.won ? SPON[arch] + 0.12 : SPON[arch] - 0.12) + (o.guided ? 0.12 : 0), threads = clamp(RI(THREAD[arch][0], THREAD[arch][1]) + (o.won ? 1 : 0) + (o.guided && rnd() < 0.5 ? 1 : 0), 1, 6);
  return { opp_id: 'O' + String(2000 + i), account_id: o.account_id, owner_id: o.owner_id, product_line: o.product_line, type: pick(['Expansion', 'Expansion', 'Renewal uplift']), stage: o.won ? 'Closed Won' : 'Closed Lost', amount_arr: o.amount_arr, created_date: addD(o.close_date, -cycle), close_date: o.close_date, forecast_category: 'Closed', rep_probability: '', lead_source: pick(LEAD), discount_pct: Math.round(o.won ? R(6, 30) : R(10, 34)), competitor: rnd() < (o.won ? 0.15 : 0.45) ? pick(COMPETITORS) : 'None', last_activity_date: o.close_date, exec_sponsor: sponsor ? 1 : 0, contacts_engaged: threads, databook_guided: o.guided };
});

// ---------------- calibrate open amounts against plan so the quarter reads plausibly ----------------
let T0 = { sf_accounts: accounts, sf_contacts: contacts, sf_opportunities: open.concat(closedRows), sf_users: U, sf_history: [], gong_calls: calls, grafana_usage: grafana, monday_projects: projects, external_signals: signals, targets, assumptions: [] };
const m0 = ZM.buildModel(T0, {});
const Q3_ATT = [0.96, 0.98, 0.9], PCOV = { Workplace: 2.9, Phone: 3.2, 'Contact Center': 3.8, AI: 2.6 }, RF = [0.95, 1.2, 0.8];
REGIONS.forEach((r, ri) => {
  const q3 = m0.open.filter((o) => o.fq === 'Q3 FY27' && o.account.region === r), won = ZM.sum(m0.closed.filter((o) => o.won && o.fq === 'Q3 FY27' && o.account.region === r), (o) => o.amount);
  const planQ3 = QPLAN27['Q3 FY27'] * SHARE_R[r], need = Q3_ATT[ri] * planQ3 - won, have = ZM.sum(q3, (o) => o.aiCall), k3 = need / have;
  q3.forEach((o) => { const raw = open.find((x) => x.opp_id === o.opp_id); raw.amount_arr = r2(raw.amount_arr * k3); });
  PRODUCTS.forEach((p) => {
    const q4 = m0.open.filter((o) => o.fq === 'Q4 FY27' && o.account.region === r && o.product_line === p); if (!q4.length) return;
    const planCell = QPLAN27['Q4 FY27'] * SHARE_R[r] * SHARE_P[p], k4 = (PCOV[p] * RF[ri] * planCell) / ZM.sum(q4, (o) => o.amount);
    q4.forEach((o) => { const raw = open.find((x) => x.opp_id === o.opp_id); raw.amount_arr = r2(raw.amount_arr * k4); });
  });
});

// ---------------- quotas, history, assumptions ----------------
const aeList = U.filter((u) => u.role === 'Account Executive');
const fyStartD = '2026-02-01', frac = ((ms(ASOF) - ms(fyStartD)) / dms + 1) / 365;
const paceSet = shuffle([1.38, 1.2, 1.1, 1.04, 1.0, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.66, 0.58, 0.5, 0.42]);
aeList.forEach((u, i) => { const ytd = sum(closedRows.filter((o) => o.owner_id === u.user_id && o.stage === 'Closed Won' && o.close_date >= fyStartD), (o) => o.amount_arr); u._ytd = ytd; u.quota_fy27_arr = ytd > 0.4 ? ytd / (paceSet[i] * frac) : 0; });
const withQ = aeList.filter((u) => u.quota_fy27_arr > 0), meanQ = sum(withQ, (u) => u.quota_fy27_arr) / withQ.length;
aeList.forEach((u) => { if (!u.quota_fy27_arr) u.quota_fy27_arr = meanQ * 0.5; });
const qScale = 60 / sum(aeList, (u) => u.quota_fy27_arr); aeList.forEach((u) => (u.quota_fy27_arr = r2(u.quota_fy27_arr * qScale)));
const history = [];
const histQs = ['Q1 FY26', 'Q2 FY26', 'Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27'];
const T1 = { sf_accounts: accounts, sf_contacts: contacts, sf_opportunities: open.concat(closedRows), sf_users: U, sf_history: [], gong_calls: calls, grafana_usage: grafana, monday_projects: projects, external_signals: signals, targets, assumptions: [] };
histQs.forEach((q) => REGIONS.forEach((r, ri) => { const actual = r2(sum(closedRows.filter((o) => o.stage === 'Closed Won' && ZM.fiscal(o.close_date).label === q && A[o.account_id].region === r), (o) => o.amount_arr)); history.push({ quarter: q, region: r, plan: r2(PLANQ[q] * SHARE_R[r]), commit: r2(actual * (1 + R(-0.03, 0.09))), actual }); }));
const assumptions = [
  ['q4_in_quarter_creation_share', 0.2, 0.1, 0.3, 'share of plan', 'Share of the next quarter plan that is created and closed inside the quarter; set from how much of recent quarters closed from deals created in the same quarter.'],
  ['pilot_win_rate_lift_pts', 3, 0, 6, 'points', 'Guided preparation improves discovery and threading, a modest effect; with about 30 deals a group the interval is far wider than the lift, so it is shown as not yet significant.'],
  ['pilot_exec_engagement_lift_pts', 17, 10, 25, 'points', 'Briefs name the executive and the reason to call; this leading indicator moves within weeks.'],
  ['account_plan_hours_guided', 4, 3, 5, 'hours', 'Research is automated; discovery and judgement stay with the seller.'],
  ['account_plan_hours_control', 10, 8, 12, 'hours', 'Typical manual research and planning time for a strategic account plan.'],
  ['rollout_uplift_pct_of_enterprise_revenue', 1.0, 0.5, 1.5, 'percent', 'A small share of revenue is easier to defend than a headline multiple; shown as a range.'],
  ['enterprise_revenue_fy26_usd_m', 2934.1, 2934.1, 2934.1, '$M', 'Reported by Zoom, fiscal year ended January 31, 2026.'],
  ['enterprise_nder_fy26', 0.98, 0.98, 0.98, 'ratio', 'Reported by Zoom: Enterprise net dollar expansion rate, trailing 12 months, below 100 percent.'],
  ['customers_over_100k_fy26', 4468, 4468, 4468, 'customers', 'Reported by Zoom: customers contributing more than $100,000 in trailing 12 months revenue.'],
  ['zoom_fy27_revenue_guidance_low_usd_m', 5065, 5065, 5065, '$M', 'Zoom fiscal 2027 total revenue guidance, low end.'],
  ['zoom_fy27_revenue_guidance_high_usd_m', 5075, 5075, 5075, '$M', 'Zoom fiscal 2027 total revenue guidance, high end.'],
  ['sponsor_push_success_rate', 0.5, 0.3, 0.7, 'share', 'Share of open deals without a customer executive sponsor where a sponsor is secured within the quarter; half is a cautious assumption.'],
  ['renewal_rescue_save_rate', 0.4, 0.25, 0.55, 'share', 'Share of at-risk renewal ARR that a rescue plan saves; rescue plans work best when started 90 days or more before renewal.'],
  ['expansion_conversion_rate', 0.25, 0.15, 0.35, 'share', 'Share of unopened expansion whitespace that converts to bookings within two quarters once an opportunity is opened.'],
  ['gross_margin_workplace', 0.78, 0.74, 0.82, 'ratio', 'Illustrative gross margin on Workplace subscriptions; software margins are high and stable.'],
  ['gross_margin_phone', 0.72, 0.66, 0.76, 'ratio', 'Illustrative gross margin on Zoom Phone, which carries carrier and number costs.'],
  ['gross_margin_contact_center', 0.66, 0.6, 0.72, 'ratio', 'Illustrative gross margin on Contact Center, which carries more services and usage cost.'],
  ['gross_margin_ai', 0.58, 0.5, 0.68, 'ratio', 'Illustrative gross margin on paid AI add-ons, which carry model compute cost.'],
  ['forecast_precision_band', 0.05, 0.03, 0.05, 'ratio', 'A forecast is treated as precise when the commit lands within this band of actual.'],
  ['coverage_norm', 3, 2.5, 3.5, 'x', 'Common planning norm for pipeline against the gap to plan.'],
  ['health_cutoff', 55, 50, 60, 'score', 'Accounts below this health score are treated as needing a rescue plan.'],
].map((r) => ({ key: r[0], value: r[1], low: r[2], high: r[3], unit: r[4], rationale: r[5] }));

['q4_in_quarter_creation_share', 'sponsor_push_success_rate', 'renewal_rescue_save_rate', 'expansion_conversion_rate', 'forecast_precision_band', 'coverage_norm', 'health_cutoff'].forEach((k) => { const i = assumptions.findIndex((r) => r.key === k); if (i >= 0) assumptions.splice(i, 1); }); // now levers on the front tabs

// ---------------- promotions and marketing funnel (deterministic, no random draws) ----------------
const PROMOS = [
  ['PR01', 'AI Companion 90-day trial', 'AI', 'Free trial', 0, 'Product marketing'], ['PR02', 'AI plus Workplace bundle', 'AI', 'Bundle', 6, 'Product marketing'],
  ['PR03', 'Contact Center pilot credit', 'Contact Center', 'Free trial', 5, 'Customer experience marketing'], ['PR04', 'Phone plus Contact Center bundle', 'Contact Center', 'Bundle', 7, 'Customer experience marketing'],
  ['PR05', 'Phone multi-year price lock', 'Phone', 'Price lock', 4, 'Phone product marketing'], ['PR06', 'Partner-led Phone migration offer', 'Phone', 'Bundle', 6, 'Partner marketing'],
  ['PR07', 'Workplace seat ramp', 'Workplace', 'Seat ramp', 5, 'Workplace product marketing'], ['PR08', 'Quarter-end buying program', 'All', 'Timed program', 8, 'Revenue marketing'],
];
const byProdPromo = { AI: ['PR01', 'PR02'], 'Contact Center': ['PR03', 'PR04'], Phone: ['PR05', 'PR06'], Workplace: ['PR07', 'PR07'] };
const qEndWin = (d) => { const q = ZM.fiscal(d), b = ZM.quarterBounds(q.label); return ZM.days(d, b.end) <= 21; };
let kw = 0, kl = 0, ko = 0;
closedRows.forEach((o) => { o.promo_id = ''; const won = o.stage === 'Closed Won', k = won ? kw++ : kl++, on = won ? k % 20 < 9 : k % 5 < 2; if (on) { const list = byProdPromo[o.product_line]; o.promo_id = qEndWin(o.close_date) && k % 3 === 0 ? 'PR08' : list[k % 2]; } if (o.promo_id) o.discount_pct = Math.min(35, o.discount_pct + (PROMOS.find((p) => p[0] === o.promo_id)[4] > 0 ? Math.round(PROMOS.find((p) => p[0] === o.promo_id)[4] / 2) : 0)); });
open.forEach((o) => { o.promo_id = ''; const k = ko++; if (k % 3 === 0) o.promo_id = qEndWin(o.close_date) && k % 2 ? 'PR08' : byProdPromo[o.product_line][k % 2]; });
const promotions = PROMOS.map((p) => ({ promo_id: p[0], name: p[1], product_line: p[2], offer_type: p[3], start_date: p[0] === 'PR08' ? '2026-02-01' : '2025-11-01', end_date: p[0] === 'PR08' ? '2027-01-31' : '2026-10-31', extra_discount_pct: p[4], owner: p[5] }));
const CHANNELS = ['Sales-sourced', 'Marketing', 'Partner', 'Expansion'], RATIO = { Marketing: [40, 10, 3.4], Partner: [14, 5, 2.3], 'Sales-sourced': [9, 4, 2], Expansion: [4, 2.5, 1.7] }, COSTR = { Marketing: 0.42, Partner: 0.18, 'Sales-sourced': 0.3, Expansion: 0.08 };
const allOpps = open.concat(closedRows), FQ = ['Q1 FY26', 'Q2 FY26', 'Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27', 'Q3 FY27'];
const funnel = [];
FQ.forEach((q, qi) => CHANNELS.forEach((c, ci) => {
  const os = allOpps.filter((o) => ZM.fiscal(o.created_date).label === q && o.lead_source === c), won = os.filter((o) => o.stage === 'Closed Won'), mod = 1 + (((qi * 3 + ci * 5) % 7) - 3) / 40, rt = RATIO[c];
  const n = os.length, pipe = sum(os, (o) => o.amount_arr), bk = sum(won, (o) => o.amount_arr);
  funnel.push({ fiscal_quarter: q, channel: c, leads: Math.round(n * rt[0] * mod), mqls: Math.round(n * rt[1] * mod), sqls: Math.round(n * rt[2] * mod), opps_created: n, opps_won: won.length, pipeline_created: r2(pipe), bookings_won: r2(bk), spend_usd_m: r2(bk * COSTR[c] * (2 - mod)) });
}));

// ---------------- row-level provenance, then assemble ----------------
const strip = (r) => { const o = {}; Object.keys(r).forEach((k) => { if (k[0] !== '_') o[k] = r[k]; }); return o; };

// ================= round 2: new sheets. A separate random stream keeps every table above identical to the first build. =================
const rnd2 = mulberry32(977), R2 = (a, b) => a + (b - a) * rnd2();
const baseT = { sf_accounts: accounts.map(strip), sf_contacts: contacts, sf_opportunities: open.concat(closedRows).map(strip), sf_users: U, sf_history: history, gong_calls: calls, grafana_usage: grafana, monday_projects: projects, external_signals: signals, targets, assumptions, promotions, marketing_funnel: funnel };
const Mi = ZM.buildModel(baseT, {});

// weekly forecast snapshots: the last four completed quarters and the quarter in flight
const forecast_snapshots = [];
const wonTo = (q, r, d) => r2(sum(closedRows.filter((o) => o.stage === 'Closed Won' && ZM.fiscal(o.close_date).label === q && A[o.account_id].region === r && o.close_date <= d), (o) => o.amount_arr));
const BIAS = { Americas: [0.015, 0.02, 0.015, 0.01, 0.005, 0], EMEA: [0.035, 0.04, 0.03, 0.02, 0.01, 0], APAC: [0.07, 0.075, 0.065, 0.045, 0.025, 0] };
const DECAY = { Americas: [1, 0.85, 0.62, 0.38, 0.16, 0.03], EMEA: [1, 0.9, 0.72, 0.5, 0.26, 0.06], APAC: [1, 0.96, 0.86, 0.7, 0.46, 0.12] };
['Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27'].forEach((q) => REGIONS.forEach((r) => {
  const h = history.find((x) => x.quarter === q && x.region === r), b = ZM.quarterBounds(q), scale = R2(0.6, 1.3);
  [20, 34, 48, 62, 76, 90].forEach((off, k) => { const d = addD(b.start, off), f = k === 0 ? h.commit : h.actual * (1 + BIAS[r][k] * scale) + (h.commit - h.actual) * DECAY[r][k]; forecast_snapshots.push({ snapshot_date: d, fiscal_quarter: q, week_of_quarter: [3, 5, 7, 9, 11, 13][k], region: r, forecast_landing: r2(f), closed_to_date: wonTo(q, r, d) }); });
}));
const C0 = { Americas: 0.9, EMEA: 0.85, APAC: 0.88 };
REGIONS.forEach((r) => {
  const row = Mi.rows.find((x) => x.region === r), plan = row.q3plan, first = plan * C0[r], last = row.q3repfc, b = ZM.quarterBounds('Q3 FY27');
  [20, 34, 48, 62, 77].forEach((off, k, arr) => { const d = addD(b.start, off), t = k / (arr.length - 1), f = k === 0 ? first : k === arr.length - 1 ? last : first + (last - first) * t + plan * 0.006 * (rnd2() - 0.5); forecast_snapshots.push({ snapshot_date: d, fiscal_quarter: 'Q3 FY27', week_of_quarter: [3, 5, 7, 9, 12][k], region: r, forecast_landing: r2(f), closed_to_date: wonTo('Q3 FY27', r, d) }); });
});
forecast_snapshots.sort((x, y) => x.snapshot_date.localeCompare(y.snapshot_date) || x.region.localeCompare(y.region));

const SIGNALS = [
  ['2026-09-22', 'Microsoft Teams', 'EMEA', 'Phone', 'Bundling', 'Win-loss note (synthetic)', 'Medium', 'A seller recorded that the buyer said Teams Phone was included in their enterprise licence renewal', 'The buyer may see Phone as free, which weakens a separate Phone case', 'Not verified with the customer; one note; licence terms unknown', 'Lead with call quality and carrier choice; test a Phone plus Contact Center package'],
  ['2026-09-10', 'Microsoft Teams', 'APAC', 'Workplace', 'Bundling', 'Call mention (synthetic)', 'Low', 'A rival AI assistant was mentioned as included in the base licence on one call', 'AI may be seen as part of the base price', 'Single mention; no document seen', 'Show paid-AI usage proof at renewal; test an AI bundle'],
  ['2026-08-28', 'Google Meet', 'APAC', 'Workplace', 'Pricing', 'Call mention (synthetic)', 'Low', 'A buyer cited a lower per-seat quote from a rival on two calls', 'Price pressure on multi-year renewals', 'Quote not seen; seat counts may differ', 'Hold the discount line; trade term length for price'],
  ['2026-09-30', 'Genesys', 'Americas', 'Contact Center', 'Pricing', 'Win-loss note (synthetic)', 'Medium', 'Two lost contact center deals recorded a rival with a lower price as the reason', 'Price may be a factor in displacement deals', 'Loss reasons are self-reported by sellers', 'Do not match on price; lead with Phone attach; offer a pilot'],
  ['2026-10-06', 'Five9', 'Americas', 'Contact Center', 'Product', 'Partner feedback (synthetic)', 'Low', 'A partner reported a rival launching agent-assist features', 'May raise buyer expectations for AI in contact center', 'Feature set and availability not verified', 'Show AI features inside Contact Center; offer paid-AI pilots where Contact Center is already owned'],
  ['2026-08-14', 'RingCentral', 'EMEA', 'Phone', 'Channel', 'Partner feedback (synthetic)', 'Medium', 'Two regional carriers were reported to be reselling a rival hosted phone service', 'The rival may reach buyers through carriers Zoom does not use', 'Reseller terms unknown', 'Test a partner-led Phone migration offer with carriers'],
  ['2026-09-18', 'Webex by Cisco', 'Americas', 'Phone', 'Pricing', 'Win-loss note (synthetic)', 'Low', 'A buyer mentioned migration credits from a rival for legacy phone estates', 'Legacy estates may be a rival target', 'Offer terms not seen', 'Target the same estates with a migration plan and a price lock'],
  ['2026-07-30', 'Webex by Cisco', 'EMEA', 'Workplace', 'Product', 'Call mention (synthetic)', 'Low', 'Rival room systems were mentioned in two hybrid-work refresh discussions', 'Rooms may decide which platform the buyer picks', 'Room installed base unknown', 'Lead with Workplace plus Rooms and a seat ramp'],
  ['2026-10-09', 'Google Meet', 'EMEA', 'AI', 'Bundling', 'Call mention (synthetic)', 'Low', 'A buyer said a rival AI assistant came bundled with their productivity suite', 'Free AI may reduce willingness to pay for an AI add-on', 'Customer not confirmed', 'Offer the AI trial where a rival is named; show activation'],
  ['2026-09-05', 'Microsoft Teams', 'Americas', 'Workplace', 'Channel', 'Win-loss note (synthetic)', 'Medium', 'Procurement at two accounts asked to consolidate vendors inside an enterprise agreement', 'Consolidation may favor the incumbent suite', 'Agreement terms not seen', 'Win the phone, rooms and contact center use cases; engage procurement early'],
  ['2026-10-12', 'Genesys', 'APAC', 'Contact Center', 'Channel', 'Partner feedback (synthetic)', 'Low', 'A partner reported expanding integrator partnerships', 'The rival may gain reach', 'Partner names and scale unknown', 'Sign two integrators; start from the Phone base'],
  ['2026-08-20', 'Five9', 'EMEA', 'Contact Center', 'Pricing', 'Call mention (synthetic)', 'Low', 'Entry pricing for mid-size contact centers was mentioned once', 'Mid-size accounts may be price sensitive', 'No quote seen', 'Protect Large accounts; use seat ramps for Medium'],
];
const competitive_signals = SIGNALS.map((m, i) => ({ signal_id: 'CS' + String(i + 1).padStart(2, '0'), date: m[0], competitor: m[1], region: m[2], product_line: m[3], signal_type: m[4], source: m[5], confidence: m[6], observed: m[7], interpretation: m[8], known_gaps: m[9], suggested_response: m[10] }));

// front tabs: levers, group levers, what-if deals and accounts
const levers = ZM2.leverRows();
const NRRF = { Americas: 1.0, EMEA: 1.0, APAC: 1.0, 'Retail and consumer': 1.0, 'Financial services': 1.0, 'Healthcare and life sciences': 1.0, 'Technology and telecom': 1.0, 'Industrial and energy': 1.0, 'Travel and services': 1.0, Large: 1.0, Medium: 1.0, Small: 1.0 };
try { Object.assign(NRRF, JSON.parse(fs.readFileSync(path.join(__dirname, 'nrrf.json'), 'utf8'))); } catch (e) {}
const NOTES = { Americas: 'Try a 6% retention shock: the Americas revenue light drops and its sales light follows', EMEA: 'EMEA is already red on retention, which is why its sales light is held at yellow. Switch retention_bump off on the levers tab to see the difference', APAC: 'Try a plan scale of 0.85: the APAC plan and commit shrink and its sales light moves up', 'Financial services': 'Try a 10% retention shock to see one industry leak across all three regions', Large: 'Try a 5% retention shock to see what losing large-account revenue does' };
const lever_groups = [];
REGIONS.forEach((r) => lever_groups.push({ group_type: 'Region', group: r, plan_scale: 1, nrr_forecast: NRRF[r], retention_shock_pct: 0, note: NOTES[r] || '' }));
ZM2.IND_ORDER.forEach((g) => lever_groups.push({ group_type: 'Industry', group: g, plan_scale: '', nrr_forecast: NRRF[g], retention_shock_pct: 0, note: NOTES[g] || '' }));
ZM2.SIZES.forEach((g) => lever_groups.push({ group_type: 'Size', group: g, plan_scale: '', nrr_forecast: NRRF[g], retention_shock_pct: 0, note: NOTES[g] || '' }));
const wiDeals = [], wiAccts = [];
const dealRow = (o) => ({ opp_id: o.opp_id, account_name: o.account.account_name, region: o.account.region, product_line: o.product_line, current_stage: o.stage, current_amount_arr: o.amount, current_close_date: o.close_date, current_exec_sponsor: +o.exec_sponsor, current_competitor: o.competitor, new_stage: '', new_amount_arr: '', new_close_date: '', new_exec_sponsor: '', new_competitor: '' });
const acctRow = (a) => ({ account_id: a.account_id, account_name: a.account_name, region: a.region, current_arr: a.arr_current, current_renewal_date: a.renewal_date, current_products: a.products.join(', '), new_arr_current: '', new_renewal_date: '', new_owns_phone: '', new_owns_contact_center: '', new_owns_ai_addon: '' });
const nearQ = (o) => o.fq === Mi.curQ || o.fq === Mi.nextQ;
REGIONS.forEach((r) => {
  Mi.open.filter((o) => nearQ(o) && o.account.region === r).sort((a, b) => b.amount - a.amount).slice(0, 3).forEach((o) => wiDeals.push(dealRow(o)));
  Mi.accounts.filter((a) => a.region === r).sort((a, b) => b.arr_current * (100 - b.health) - a.arr_current * (100 - a.health)).slice(0, 3).forEach((a) => wiAccts.push(acctRow(a)));
});
// deals where a sponsor would move the forecast most, and weak accounts whose renewal is still far off: good candidates to try
const haveD = new Set(wiDeals.map((x) => x.opp_id)), haveA = new Set(wiAccts.map((x) => x.account_id));
Mi.open.filter((o) => nearQ(o) && !+o.exec_sponsor && !haveD.has(o.opp_id)).sort((a, b) => b.recov - a.recov).slice(0, 3).forEach((o) => wiDeals.push(dealRow(o)));
Mi.accounts.filter((a) => a.health < Mi.cfg.healthCut + 5 && a.renewalDays > 270 && !haveA.has(a.account_id)).sort((a, b) => b.arr_current - a.arr_current).slice(0, 3).forEach((a) => wiAccts.push(acctRow(a)));
wiAccts.sort((a, b) => b.current_arr - a.current_arr);
wiDeals.sort((a, b) => b.current_amount_arr - a.current_amount_arr);

const tables = {
  sf_accounts: accounts.map(strip), sf_contacts: contacts, sf_opportunities: open.concat(closedRows).map(strip), sf_users: U.map(strip), sf_history: history, forecast_snapshots, gong_calls: calls, grafana_usage: grafana, monday_projects: projects, external_signals: signals, promotions, marketing_funnel: funnel, targets, competitive_signals, assumptions, levers, lever_groups, whatif_deals: wiDeals, whatif_accounts: wiAccts,
};
// last-updated spread so no dataset looks mass-stamped
const jitter = (stamp, i) => new Date(Date.parse(stamp) - (i % 7) * 600e3).toISOString().replace('.000Z', 'Z');
Object.keys(tables).forEach((name) => {
  const sh = SHEETS[name];
  if (sh.front) return; // front tabs are for editing: no provenance columns
  tables[name] = tables[name].map((r, i) => { const row = Object.assign({}, r); row.source_system = SOURCES[sh.src].system; row.source_record_id = sh.prefix + '-' + String(i + 1).padStart(4, '0'); row.last_updated_at = jitter(SOURCES[sh.src].updated, i); row.data_flag = name === 'sf_accounts' ? (['Acme Corp', 'Northwind Traders', 'Contoso Ltd'].includes(r.account_name) ? 'fictional company name; synthetic data' : 'real company name; synthetic data') : name === 'assumptions' ? (/reported/i.test(r.rationale) ? 'reported by Zoom' : 'illustrative assumption') : name === 'competitive_signals' ? 'synthetic scenario; not reporting' : 'synthetic'; return row; });
});
// a manual-upload example for provenance: the oldest Grafana month was loaded by hand
tables.grafana_usage.forEach((r) => { if (r.month === '2026-04') { r.source_system = 'Grafana (manual upload)'; r.last_updated_at = '2026-09-02T15:20:00Z'; } });

// lineage + dictionary
const lineage = [], dictionary = [];
Object.keys(SHEETS).forEach((name) => {
  const sh = SHEETS[name], src = SOURCES[sh.src];
  sh.cols.forEach(([f, type, meaning, access]) => {
    lineage.push({ sheet: name, field: f, field_kind: 'sourced', source_system: src.system, source_object: sh.object, system_owner: src.owner, data_steward: src.steward, access_group: access, refresh_cadence: src.cadence, last_updated_at: src.updated, change_point: src.change, real_or_synthetic: name === 'assumptions' ? 'assumption' : name === 'sf_accounts' && f === 'account_name' ? 'real name' : sh.front ? 'editable input' : 'synthetic' });
    dictionary.push({ sheet: name, field: f, type, meaning, formula: '', real_or_synthetic: name === 'sf_accounts' && f === 'account_name' ? 'company name used as an illustrative account (real, except Acme Corp, Northwind Traders and Contoso Ltd, which are fictional)' : name === 'assumptions' ? 'assumption' : sh.front ? 'editable input' : name === 'competitive_signals' ? 'synthetic scenario' : 'synthetic' });
  });
  if (sh.front) return;
  ['source_system', 'source_record_id', 'last_updated_at', 'data_flag'].forEach((f) => { lineage.push({ sheet: name, field: f, field_kind: 'provenance', source_system: 'Workbook', source_object: 'Row provenance', system_owner: src.owner, data_steward: src.steward, access_group: 'cro,rvp,ae,csm,se,revops,finance', refresh_cadence: src.cadence, last_updated_at: src.updated, change_point: 'Regenerated with the extract', real_or_synthetic: 'synthetic' }); dictionary.push({ sheet: name, field: f, type: 'text', meaning: { source_system: 'System the row came from', source_record_id: 'Record key in that system', last_updated_at: 'When the row last changed in the source', data_flag: 'Whether the row is real, reported or synthetic' }[f], formula: '', real_or_synthetic: 'synthetic' }); });
});
DERIVED.forEach(([f, scope, meaning, formula, from]) => { lineage.push({ sheet: 'derived', field: f, field_kind: 'derived', source_system: 'Databook model', source_object: scope, system_owner: 'Databook deployment team', data_steward: 'Databook strategist', access_group: 'cro,rvp,revops,finance', refresh_cadence: 'on change', last_updated_at: '2026-10-17T12:00:00Z', change_point: 'Change the formula or threshold in the levers tab; the CRO approves', real_or_synthetic: 'derived from ' + from }); dictionary.push({ sheet: 'derived', field: f, type: scope, meaning, formula, real_or_synthetic: 'derived' }); });
tables.lineage = lineage; tables.dictionary = dictionary;

// ---------------- checks and report ----------------
const prep = ZM2.prepare(tables), M = ZM.buildModel(prep.T, prep.cfg); ZM2.enrich(M, prep.T);
const f = (x, d = 2) => x.toFixed(d);
console.log('rows', Object.fromEntries(Object.keys(tables).map((k) => [k, tables[k].length])));
console.log('book ARR', f(M.book.arr), 'NRR', f(M.book.nrr * 100, 1) + '%', 'GRR', f(M.book.grr * 100, 1) + '%', 'at risk ARR', f(M.book.atRisk), 'whitespace', f(M.book.whitespace), 'accounts below cut', M.book.atRiskCount);
console.log('Q3 plan', f(M.cur.plan), 'won', f(M.cur.won), 'AI', f(M.cur.ai), 'forecast', f(M.cur.fc), f(M.cur.att * 100, 1) + '%', 'rep fc', f(M.cur.repfc), f(M.cur.repAtt * 100, 1) + '%', 'days left', M.cur.daysLeft);
M.rows.forEach((r) => console.log(r.region, 'q3 plan', f(r.q3plan), 'won', f(r.q3won), 'fc', f(r.q3fc), f(r.q3att * 100, 0) + '%', 'q3cov', f(r.q3cov, 1), 'q4cov', f(r.q4cov, 1), 'q4 ai', f(r.q4ai)));
console.log('FY plan', f(M.fy.plan), 'ytd', f(M.fy.ytdWon), 'known', f(M.fy.knownLanding), 'landing', f(M.fy.landing));
console.log('byProduct', M.byProduct.map((p) => p.product + ' ' + f(p.won) + '/' + f(p.plan) + ' att ' + f(p.att * 100, 0) + '%').join(' | '));
console.log('hist', M.histQ.map((h) => h.quarter + ' actual ' + f(h.actual) + ' commit ' + f(h.commit) + ' miss ' + f(h.miss * 100, 1) + '%').join(' | '));
console.log('hist checks', M.hist.every((h) => Math.abs(h.actualCalc - h.actual) < 0.011));
const c = M.cohort; console.log('pilot', c.pilot.n, f(c.pilot.win * 100, 0) + '%', 'control', c.control.n, f(c.control.win * 100, 0) + '%', 'exec pilot', f(c.pilot.exec * 100, 0), 'ctl', f(c.control.exec * 100, 0));
console.log('AEs at pace', M.atPace, 'of', M.aeRows.length);
console.log('open', M.open.length, 'tasks', M.tasks.length, 'top task impacts', M.tasks.slice(0, 5).map((t) => t.type + ' ' + f(t.impact)).join(' | '));
// round 2 report
console.log('--- status matrix ---');
const cellTxt = (c) => (c.status === 'ok' ? 'G' : c.status === 'warn' ? 'A' : c.status === 'bad' ? 'R' : c.status === 'na' ? '-' : '?') + (c.value != null ? ' ' + (c.value * 100).toFixed(0) + '%' : '') + (c.conf ? ' ' + c.conf[0] : '');
['region', 'industry', 'size', 'product'].forEach((l) => M.matrix[l].concat(l === 'region' ? [M.matrix.all] : []).forEach((g) => console.log(l.padEnd(8), g.label.padEnd(30), 'n', String(g.n).padStart(2), '| perf', cellTxt(g.perf).padEnd(9), 'fcst', cellTxt(g.fcst).padEnd(9), 'ret', cellTxt(g.ret).padEnd(9), 'grow', cellTxt(g.grow).padEnd(9), 'comp', cellTxt(g.comp).padEnd(9))));
console.log('bookedShare', f(M.bookedShare, 3));
Object.keys(M.bridge).forEach((k) => { const b = M.bridge[k]; console.log('bridge', k.padEnd(9), 'plan', f(b.plan, 1), 'closed', f(b.closed, 1), 'weighted', f(b.weighted, 1), 'creation', f(b.creation, 1), 'landing', f(b.landing, 1), 'gap', f(b.gap, 1), '| gross open', f(b.grossOpen, 1), 'asks', f(b.asksG, 1), 'fix', f(b.fixAct, 1), 'askIn', f(b.askIn, 1), 'scenario', f(b.scenario, 1), 'ok', b.ok); });
console.log('actions', M.actions.map((a) => a.h + ':' + a.id + (a.modeled != null ? ' ' + f(a.modeled, 1) : '')).join(' | '));
console.log('lost4', f(M.comp.totalLost, 1), 'open named', M.comp.openNamed.length, f(ZM.sum(M.comp.openNamed, (o) => o.amount), 1), 'wr', f(M.comp.winRateNamed, 2), f(M.comp.winRateClear, 2), 'n named decided', M.comp.nDecidedNamed);
console.log('lag', M.lag.forecast.map((x) => x.region + ' ' + f(x.avg, 1)).join(', '), '| err', M.lag.errRows.map((r) => 'w' + r.week + ' ' + (r.bias * 100).toFixed(1) + '/' + (r.mae * 100).toFixed(1) + ' n' + r.n).join(' '));
console.log('dq', M.dq.rows.map((r) => r[1] + '/' + r[2]).join(' '));
console.log('size tiers', ZM2.SIZES.map((s) => s + ' ' + M.accounts.filter((a) => a.size_tier === s).length).join(', '));

// ---------------- write outputs ----------------
const ORDER = ['levers', 'lever_groups', 'whatif_deals', 'whatif_accounts', 'sf_accounts', 'sf_contacts', 'sf_opportunities', 'sf_users', 'sf_history', 'forecast_snapshots', 'gong_calls', 'grafana_usage', 'monday_projects', 'external_signals', 'promotions', 'marketing_funnel', 'targets', 'competitive_signals', 'assumptions', 'lineage', 'dictionary'];
const colsOf = (k) => (k === 'lineage' ? Object.keys(lineage[0]) : k === 'dictionary' ? Object.keys(dictionary[0]) : SHEETS[k].cols.map((c) => c[0]).concat(SHEETS[k].front ? [] : ['source_system', 'source_record_id', 'last_updated_at', 'data_flag']));
fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify({ tables, order: ORDER, front: FRONT, sheetInfo: Object.fromEntries(Object.keys(SHEETS).map((k) => [k, { src: SHEETS[k].src, desc: SHEETS[k].desc }])), sources: SOURCES, derived: DERIVED, cols: Object.fromEntries(Object.keys(SHEETS).map((k) => [k, colsOf(k)])) }));
console.log('wrote data.json', (fs.statSync(path.join(__dirname, 'data.json')).size / 1024).toFixed(0) + ' KB');
