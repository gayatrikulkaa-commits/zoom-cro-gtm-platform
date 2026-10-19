// Synthetic, seeded dataset for the CRO Command Center prototype.
// Everything on the dashboard is derived from these rows, so totals always reconcile.
// Customer, seller and deal names are fictional. Plan figures are calibrated to public FY26 guidance ($3.5-3.6B).
const fs = require('fs');
const path = require('path');

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261017);
const R = (a, b) => a + (b - a) * rnd();
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const ASOF = '2026-10-17';
const asOfDate = new Date(ASOF + 'T00:00:00Z');
const addDays = (n) => new Date(asOfDate.getTime() + n * 864e5).toISOString().slice(0, 10);

const REGIONS = ['Americas', 'EMEA', 'APAC'];
const SEGMENTS = [
  { id: 'EDS', name: 'Essential Dental Solutions', short: 'Essential Dental', q4Target: 392 },
  { id: 'CTS', name: 'Connected Technology Solutions', short: 'Connected Tech', q4Target: 262 },
  { id: 'OIS', name: 'Orthodontic & Implant Solutions', short: 'Ortho & Implant', q4Target: 183 },
  { id: 'WH', name: 'Wellspect Healthcare', short: 'Wellspect', q4Target: 88 },
];
const SHARE = { // regional split of each segment's Q4 target
  EDS: [0.44, 0.38, 0.18], CTS: [0.42, 0.36, 0.22], OIS: [0.40, 0.40, 0.20], WH: [0.40, 0.50, 0.10],
};
// run-rate base as share of target (rest of the target depends on pipeline)
const BASE_RATIO = { EDS: 0.84, CTS: 0.60, OIS: 0.68, WH: 0.92 };

// ---------- Sellers ----------
const sellerSeed = [
  ['Maya Thompson', 'Americas', 'Strategic Account Director', 1, 96], ['Carlos Rivera', 'Americas', 'Strategic Account Director', 0, 74],
  ['Priya Natarajan', 'Americas', 'Enterprise Account Executive', 1, 38], ['Ethan Brooks', 'Americas', 'Enterprise Account Executive', 0, 52],
  ['Danielle Okafor', 'Americas', 'Strategic Account Director', 1, 88], ['Jason Whitfield', 'Americas', 'Enterprise Account Executive', 0, 61],
  ['Rachel Kim', 'Americas', 'Enterprise Account Executive', 0, 9], ['Tyler Moreno', 'Americas', 'Enterprise Account Executive', 1, 27],
  ['Hannah Goldberg', 'Americas', 'Strategic Account Director', 0, 110], ['Andre Baptiste', 'Americas', 'Enterprise Account Executive', 0, 44],
  ['Olivia Chen', 'Americas', 'Enterprise Account Executive', 0, 14],
  ['Lukas Brandt', 'EMEA', 'Strategic Account Director', 1, 82], ['Amélie Fournier', 'EMEA', 'Enterprise Account Executive', 0, 33],
  ['Giulia Ferraro', 'EMEA', 'Enterprise Account Executive', 1, 41], ['Oliver Hargreaves', 'EMEA', 'Strategic Account Director', 0, 99],
  ['Elena Vidal', 'EMEA', 'Enterprise Account Executive', 0, 58], ['Henrik Sørensen', 'EMEA', 'Enterprise Account Executive', 1, 47],
  ['Fatima Al-Mansouri', 'EMEA', 'Enterprise Account Executive', 0, 11], ['Tomasz Wrona', 'EMEA', 'Enterprise Account Executive', 0, 36],
  ['Hiroshi Tanaka', 'APAC', 'Strategic Account Director', 1, 91], ['Mei-Ling Wong', 'APAC', 'Enterprise Account Executive', 0, 29],
  ['Jacob Mitchell', 'APAC', 'Enterprise Account Executive', 1, 24], ['Ji-woo Park', 'APAC', 'Enterprise Account Executive', 0, 17],
  ['Aditi Rao', 'APAC', 'Enterprise Account Executive', 0, 8],
];
const sellers = sellerSeed.map((s, i) => {
  const pilot = !!s[3];
  const base = clamp(52 + (Math.min(s[4], 100) / 100) * 22 + R(-8, 10), 38, 84); // maturity before pilot
  const gain = pilot ? R(6, 13) : R(-1.5, 2.5);
  const maturity = Math.round(clamp(base + gain, 35, 93));
  const comps = ['planning', 'multithread', 'exec', 'discovery', 'forecast'].reduce((o, k) => { o[k] = Math.round(clamp(maturity + R(-12, 12), 25, 98)); return o; }, {});
  return {
    id: 's' + String(i + 1).padStart(2, '0'), name: s[0], region: s[1], role: s[2], pilot, tenureMonths: s[4],
    maturity, maturityPrev: Math.round(base), comps,
    adoption: pilot ? Math.round(R(58, 92)) : 0, // % of account plans / meeting preps run through guided workflows
    planHours: pilot ? r1(R(2.5, 4.5)) : r1(R(8, 15)), // hours to build an account plan
    attainYTD: 0, q4Quota: 0,
  };
});
const sellersByRegion = (r) => sellers.filter((s) => s.region === r);

// ---------- Accounts ----------
// [name, region, type, country/hq, ttm range lo, hi]
const acctSeed = [
  ['Meridian Dental Partners', 'Americas', 'DSO', 'US', 48, 64], ['Cascadia Smile Group', 'Americas', 'DSO', 'US', 22, 34],
  ['Lone Star Dental Alliance', 'Americas', 'DSO', 'US', 28, 40], ['Great Lakes Family Dental', 'Americas', 'DSO', 'US', 14, 22],
  ['Peachtree Dental Collective', 'Americas', 'DSO', 'US', 16, 24], ['Summit Ridge Dental Group', 'Americas', 'DSO', 'US', 12, 19],
  ['Harbor Point Dental', 'Americas', 'DSO', 'US', 9, 15], ['Bluegrass Dental Partners', 'Americas', 'DSO', 'US', 8, 13],
  ['Nordlicht Zahnzentren', 'EMEA', 'DSO', 'DE', 24, 36], ['Thames Valley Dental Group', 'EMEA', 'DSO', 'UK', 18, 28],
  ['Iberia Sonrisa Clinics', 'EMEA', 'DSO', 'ES', 11, 18], ['Lombardia Dental Care', 'EMEA', 'DSO', 'IT', 10, 16],
  ['Rhône Dentaire Réseau', 'EMEA', 'DSO', 'FR', 12, 19], ['Skandia Tandvård Group', 'EMEA', 'DSO', 'SE', 9, 14],
  ['Pacifica Smile Network', 'APAC', 'DSO', 'AU', 14, 22], ['Kansai Dental Holdings', 'APAC', 'DSO', 'JP', 16, 25],
  ['Seoul Bright Dental Group', 'APAC', 'DSO', 'KR', 9, 15], ['Straits Dental Group', 'APAC', 'DSO', 'SG', 6, 10],
  ['Northstar Dental Supply', 'Americas', 'Distributor', 'US', 120, 175], ['Keystone Dental Distribution', 'Americas', 'Distributor', 'US', 90, 140],
  ['Atlas Dental Wholesale', 'Americas', 'Distributor', 'US', 55, 85], ['Maple Leaf Dental Supply', 'Americas', 'Distributor', 'CA', 28, 46],
  ['Medi-Euro Dental Handel', 'EMEA', 'Distributor', 'DE', 70, 105], ['Britannia Dental Supplies', 'EMEA', 'Distributor', 'UK', 40, 64],
  ['Oceania Dental Distribution', 'APAC', 'Distributor', 'AU', 24, 38],
  ['Midwest Dental Education Institute', 'Americas', 'Education', 'US', 6, 10], ['Continental Dental Laboratories', 'Americas', 'Lab network', 'US', 20, 32],
  ['Precision Prosthetics Labs', 'EMEA', 'Lab network', 'NL', 12, 19], ['Nordic Hospital Group', 'EMEA', 'Health system', 'DK', 14, 22],
  ['Atlantic Health Systems', 'Americas', 'Health system', 'US', 16, 26],
];
const FAMILIES = [
  { id: 'cadcam', name: 'Digital impressions & CAD/CAM' },
  { id: 'imaging', name: 'Imaging' },
  { id: 'implants', name: 'Implants & prosthetics' },
  { id: 'ortho', name: 'Clear aligners & ortho' },
  { id: 'consumables', name: 'Restorative & preventive' },
  { id: 'software', name: 'Software & cloud workflow' },
];
const OWN_PROB = { DSO: [0.55, 0.45, 0.4, 0.3, 0.85, 0.35], Education: [0.7, 0.6, 0.35, 0.3, 0.7, 0.45], 'Lab network': [0.8, 0.2, 0.55, 0.15, 0.6, 0.5] };
const WS_WEIGHT = [0.14, 0.07, 0.16, 0.09, 0.05, 0.06]; // whitespace $ as multiple of TTM, by family

const sellerRR = { Americas: 0, EMEA: 0, APAC: 0 };
const accounts = acctSeed.map((a, i) => {
  const [name, region, type, hq, lo, hi] = a;
  const rs = sellersByRegion(region);
  const owner = rs[sellerRR[region]++ % rs.length];
  const ttm = r1(R(lo, hi));
  const wh = type === 'Health system';
  // health components
  const usage = Math.round(R(38, 92)), engagement = Math.round(R(35, 92)), sentiment = Math.round(R(40, 92)), commercial = Math.round(R(45, 95));
  const health = Math.round(usage * 0.3 + engagement * 0.25 + sentiment * 0.25 + commercial * 0.2);
  let owns = {};
  if (type === 'Distributor' || wh) FAMILIES.forEach((f) => (owns[f.id] = null)); // n/a
  else FAMILIES.forEach((f, k) => (owns[f.id] = rnd() < OWN_PROB[type][k] ? 1 : 0));
  let whitespace = 0;
  if (owns.cadcam !== null) FAMILIES.forEach((f, k) => { if (!owns[f.id]) whitespace += ttm * WS_WEIGHT[k] * R(0.8, 1.25); });
  whitespace = r1(whitespace);
  const expansion = Math.round(clamp(health * 0.55 + (whitespace / Math.max(ttm, 1)) * 60 + R(-6, 8), 12, 96));
  const atRiskRev = r1(ttm * clamp((70 - health) / 100, 0, 0.45) * 0.6);
  const out = {
    id: 'a' + String(i + 1).padStart(2, '0'), name, region, type, hq, ownerId: owner.id, ttm, health, usage, engagement, sentiment, commercial,
    owns, whitespace, expansion, atRiskRev,
  };
  if (type === 'Distributor') {
    out.sellInWeeks = r1(R(5, 11)); out.sellThroughWeeks = r1(out.sellInWeeks - R(-1.2, 3.2));
    // inventory-weeks proxy: >9 flags channel stuffing risk
    out.inventoryWeeks = r1(R(6.5, 12.5));
  }
  return out;
});

// ---------- Deals (open, enterprise) ----------
const SEG_FOR_TYPE = { DSO: ['CTS', 'CTS', 'OIS', 'EDS', 'OIS'], Distributor: ['EDS', 'EDS', 'CTS'], Education: ['CTS', 'OIS'], 'Lab network': ['OIS', 'CTS'], 'Health system': ['WH'] };
const NAMES = {
  CTS: ['Chairside digital workflow rollout', 'Intraoral scanner refresh', 'Imaging upgrade program', 'Lab-to-chair connected workflow', 'Cloud workflow subscription bundle'],
  OIS: ['Implant system standardization', 'Clear aligner partnership program', 'Guided surgery bundle', 'Prosthetics lab agreement', 'Implant-to-restoration pathway'],
  EDS: ['Annual consumables agreement', 'Restorative & preventive bundle renewal', 'Brand-mix and volume-tier agreement'],
  WH: ['Continence care contract renewal', 'Hospital formulary expansion'],
};
const STAGES = [
  { id: 'Qualify', p: 0.12, days: [70, 160] }, { id: 'Develop', p: 0.28, days: [50, 120] }, { id: 'Propose', p: 0.5, days: [30, 85] },
  { id: 'Negotiate', p: 0.7, days: [15, 62] }, { id: 'Contracting', p: 0.86, days: [8, 36] },
];
const CAT = { Qualify: 'Pipeline', Develop: 'Pipeline', Propose: 'Best case', Negotiate: 'Commit', Contracting: 'Commit' };
const CAT_W = { Commit: 0.8, 'Best case': 0.3, Pipeline: 0.08 }; // how reps weight each call
const RECOG = { CTS: 0.8, OIS: 0.55, EDS: 0.45, WH: 0.4 };
const AMT = { CTS: [3, 22], OIS: [2.5, 18], EDS: [4, 30], WH: [1.5, 7] };

const CELL_COUNT = { EDS: [6, 5, 3], CTS: [6, 5, 3], OIS: [6, 4, 2], WH: [2, 2, 0] };
const ELIGIBLE = { EDS: ['DSO', 'Distributor'], CTS: ['DSO', 'Distributor', 'Education', 'Lab network'], OIS: ['DSO', 'Lab network', 'Education'], WH: ['Health system'] };
const dealNameCount = {};
let dealSeq = 0;
const deals = [];
SEGMENTS.forEach((sg) => REGIONS.forEach((region, ri) => {
  const n = CELL_COUNT[sg.id][ri];
  const elig = accounts.filter((a) => a.region === region && ELIGIBLE[sg.id].includes(a.type));
  const accPool = shuffle(elig);
  for (let k = 0; k < n; k++) {
    const a = accPool[k % accPool.length];
    const stage = pick(['Qualify', 'Develop', 'Develop', 'Propose', 'Propose', 'Propose', 'Negotiate', 'Negotiate', 'Negotiate', 'Contracting', 'Contracting']);
    const st = STAGES.find((x) => x.id === stage);
    const dtc = RI(st.days[0], st.days[1]);
    const nm = pick(NAMES[sg.id]);
    const key = a.id + nm; dealNameCount[key] = (dealNameCount[key] || 0) + 1;
    const owner = rnd() < 0.8 ? sellers.find((s) => s.id === a.ownerId) : pick(sellersByRegion(region));
    deals.push({
      id: 'D-' + (4100 + dealSeq++ * 7 + RI(0, 5)), name: nm + (dealNameCount[key] > 1 ? ' (phase 2)' : ''), accountId: a.id, region, segment: sg.id, stage, category: CAT[stage],
      amount: R(AMT[sg.id][0], AMT[sg.id][1]), closeDate: addDays(dtc), daysToClose: dtc, ownerId: owner.id,
      threads: clamp(Math.round(R(0.6, 4.6)), 1, 5),
      execSponsor: rnd() < (stage === 'Contracting' ? 0.88 : stage === 'Negotiate' ? 0.68 : 0.45),
      staleDays: Math.round(R(0, stage === 'Negotiate' || stage === 'Contracting' ? 26 : 20)),
      competitor: rnd() < 0.22, budgetShift: rnd() < 0.12, guided: owner.pilot && rnd() < 0.82,
      type: pick(['New logo', 'Expansion', 'Expansion', 'Renewal']), ageDays: RI(25, 210),
    });
  }
}));

function aiProb(d) {
  const base = STAGES.find((s) => s.id === d.stage).p;
  let p = base + 0.05 * (d.threads - 2.5) + (d.execSponsor ? 0.07 : -0.11) - Math.min(0.24, d.staleDays * 0.009) + (d.guided ? 0.04 : 0) - (d.competitor ? 0.05 : 0) - (d.budgetShift ? 0.06 : 0);
  return clamp(p, 0.04, 0.96);
}
function q4rev(d) {
  if (d.daysToClose > 75) return 0;
  return d.amount * RECOG[d.segment] * (1 - 0.45 * (d.daysToClose / 75));
}

// ---------- Calibrate each segment x region cell to a chosen attainment ----------
const ATT = { EDS: [0.975, 0.985, 0.95], CTS: [0.955, 0.985, 0.93], OIS: [0.865, 0.975, 0.985], WH: [1.0, 1.02, 1.0] };
const T = {}; SEGMENTS.forEach((s) => { T[s.id] = {}; REGIONS.forEach((r, k) => (T[s.id][r] = r1(s.q4Target * SHARE[s.id][k]))); });
const totalTarget = SEGMENTS.reduce((t, s) => t + s.q4Target, 0);
const matrix = [];
SEGMENTS.forEach((sg) => REGIONS.forEach((r, ri) => {
  const target = T[sg.id][r];
  const ds = deals.filter((d) => d.segment === sg.id && d.region === r);
  const base = r1(target * BASE_RATIO[sg.id] * (sg.id === 'OIS' && r === 'Americas' ? 0.86 : 1));
  const w = ds.reduce((t, d) => t + q4rev(d) * aiProb(d), 0);
  const want = ATT[sg.id][ri] * target - base;
  if (ds.length && w > 0) { const f = clamp(want / w, 0.3, 6); ds.forEach((d) => { d.amount *= f; }); }
  matrix.push({ segment: sg.id, region: r, target, base });
}));
deals.forEach((d) => { d.amount = r1(d.amount); d.q4rev = r1(q4rev(d)); d.aiProb = Math.round(aiProb(d) * 100) / 100; d.repProb = CAT_W[d.category]; });
const SCALE = 1.5;
// ---------- Seller Q4 quota + YTD attainment ----------
sellers.forEach((s) => {
  const mine = deals.filter((d) => d.ownerId === s.id);
  const w = mine.reduce((t, d) => t + d.q4rev * d.aiProb, 0);
  const att = clamp(0.66 + (s.maturity - 50) / 100 * 0.9 + R(-0.12, 0.12), 0.52, 1.18);
  s.q4Quota = r1(Math.max(4, (w + R(1.5, 6)) / clamp(att + R(-0.05, 0.08), 0.6, 1.15)));
  s.attainYTD = Math.round(att * 100);
});

// ---------- Closed deal history (last 4 quarters) ----------
const PILOT_START = '2026-07-20';
const closed = [];
const pilotStartMs = new Date(PILOT_START + 'T00:00:00Z').getTime();
const histStart = new Date('2025-10-20T00:00:00Z').getTime();
const pilotSellers = sellers.filter((s) => s.pilot), ctrlSellers = sellers.filter((s) => !s.pilot);
function mk(i, after, s, guided) {
  const t = after ? pilotStartMs + rnd() * (asOfDate.getTime() - pilotStartMs) : histStart + rnd() * (pilotStartMs - histStart);
  const seg = pick(['CTS', 'CTS', 'OIS', 'EDS', 'EDS', 'OIS', 'WH']);
  const amt = r1(R(AMT[seg][0], AMT[seg][1]) * SCALE * (guided ? R(1.08, 1.32) : R(0.88, 1.12)));
  const cycle = Math.round(R(78, 168) * (guided ? 0.86 : 1));
  return { id: 'C-' + (3000 + i), ownerId: s.id, region: s.region, segment: seg, amount: amt, won: false, cycleDays: cycle, guided, closedDate: new Date(t).toISOString().slice(0, 10), after };
}
// cohorts: [count, wins]
const groups = [
  { n: 26, wins: 11, after: true, pool: pilotSellers, guided: true }, // pilot sellers, since pilot start
  { n: 38, wins: 11, after: true, pool: ctrlSellers, guided: false }, // control, since pilot start
  { n: 14, wins: 4, after: false, pool: pilotSellers, guided: false }, // pilot sellers, before pilot
  { n: 22, wins: 6, after: false, pool: ctrlSellers, guided: false }, // control, before pilot
];
let ci = 0;
groups.forEach((g) => {
  const rows = [];
  for (let k = 0; k < g.n; k++) rows.push(mk(ci++, g.after, pick(g.pool), g.guided));
  shuffle(rows.map((_, i) => i)).slice(0, g.wins).forEach((i) => (rows[i].won = true));
  rows.forEach((r) => closed.push(r));
});
closed.sort((a, b) => a.closedDate.localeCompare(b.closedDate));

// ---------- Weekly series ----------
const weeks = [];
for (let w = 0; w < 13; w++) {
  const d = new Date(pilotStartMs + w * 7 * 864e5).toISOString().slice(5, 10);
  const lift = Math.min(1, w / 6) * 0.28;
  weeks.push({ label: d, pilot: Math.round(100 * (1 + lift + R(-0.05, 0.05))), control: Math.round(100 * (1 + R(-0.07, 0.07) + (w > 8 ? 0.01 : 0))) });
}

// ---------- Quarterly history ----------
const quarters = [
  { q: "Q1 '25", actual: 879 }, { q: "Q2 '25", actual: 936 }, { q: "Q3 '25", actual: 904 }, { q: "Q4 '25", actual: 961 },
  { q: "Q1 '26", actual: 872 }, { q: "Q2 '26", actual: 898 }, { q: "Q3 '26", actual: 884 },
];

// ---------- Narrative pools for the Customer Context Graph ----------
const POOLS = {
  DSO: {
    priorities: ['Standardize chairside digital workflow across acquired practices to cut remake rates', 'Lift same-store production per clinician while clinician supply stays tight', 'Consolidate vendors to simplify procurement across newly acquired clinics', 'Grow implant and clear-aligner case acceptance inside existing patient base'],
    financial: ['Sponsor-backed; leverage covenants push for fast payback (under 24 months) on equipment spend', 'EBITDA growth tied to same-store production, not just new clinic count', 'Capex approvals centralized after Q2; large rollouts need CFO sign-off', 'Debt refinancing window next year raises scrutiny on multi-year commitments'],
    intent: ['Management says it wants one scanner-to-lab workflow in every clinic by next year', 'COO has asked for a vendor scorecard before the next consolidation round', 'Clinical leadership favors open workflows and integrates with existing practice software', 'Leadership signaled interest in guided implant planning to keep cases in-network'],
    competitive: ['Rival digital impression vendor is piloting in two regions with aggressive promo pricing', 'Competing implant system holds the incumbent position in 40% of clinics', 'Aligner start-ups are courting the same clinicians with direct-to-consumer partnerships', 'Distributor-bundled offers are pulling attention away from direct programs'],
    timing: ['Budget cycle closes in 6 weeks; decisions after that slip to Q1', 'Integration of the latest acquisition completes in Q1, a natural window for standardization', 'Annual vendor review is in November', 'Clinical advisory board meets in December and shapes next-year standards'],
    plays: ['Lead with a clinic-level ROI model (remake rate and chair time) and a phased rollout that starts with the three highest-volume regions', 'Bring the CFO a 24-month payback case with financing options; pair with a clinical champion reference from a peer DSO', 'Position the connected workflow as the standard for acquired clinics; offer an onboarding sprint for the next acquisition'],
  },
  Distributor: {
    priorities: ['Protect margin while reducing working capital tied to equipment inventory', 'Grow private-label and brand-mix in consumables without losing key manufacturer terms', 'Expand digital equipment sales force to attach software and services', 'Win more DSO national contracts against rival distributors'],
    financial: ['Gross margin pressure as DSOs consolidate and negotiate directly', 'Inventory days elevated; finance wants tighter sell-through discipline', 'Rebate tier thresholds drive end-of-quarter buying behavior', 'Interest costs raise the bar on inventory carrying'],
    intent: ['Leadership wants fewer, deeper manufacturer partnerships', 'Equipment specialist team is being expanded', 'Plans to co-invest in demos and training for digital workflow', 'Asked for shared sell-through visibility to plan promotions'],
    competitive: ['Competing manufacturer is offering higher rebates for exclusive shelf space', 'A rival distributor is bundling equipment financing', 'Direct-to-DSO selling by manufacturers is a recurring channel conflict', 'Private-label growth is cannibalizing branded consumables'],
    timing: ['Annual rebate agreement renews January 1', 'Mid-year sales kickoff is the moment to retrain reps on new workflows', 'Quarter-end buying window opens in 4 weeks', 'Inventory true-up planned for December'],
    plays: ['Share a sell-through and inventory view by SKU family and agree on promotion cadence that avoids quarter-end loading', 'Co-plan the DSO national account list with the distributor and clarify who leads each pursuit', 'Offer certified equipment-specialist training tied to rebate tiers'],
  },
  Education: {
    priorities: ['Train students on current digital workflows so graduates are job-ready', 'Replace aging simulation and imaging equipment under a fixed grant', 'Grow research partnerships tied to materials and implants'],
    financial: ['Capital funded by grants and donor programs with fixed deadlines', 'Procurement requires competitive bids above a threshold'],
    intent: ['Dean has made digital dentistry a flagship curriculum priority', 'Faculty want vendor-neutral workflows plus strong training support'],
    competitive: ['Rival vendors offer deep academic discounts and student-ambassador programs', 'Incumbent equipment is reaching end of service'],
    timing: ['Grant spending window ends in December', 'New cohort begins in January'],
    plays: ['Package equipment, curriculum and student licenses as a single academic program with a grant-aligned timeline'],
  },
  'Lab network': {
    priorities: ['Increase capacity for digital restorations and implant prosthetics', 'Cut turnaround time and remakes across sites', 'Consolidate software vendors across acquired labs'],
    financial: ['Margins squeezed by DSO price pressure on crowns and bridges', 'Automation investments justified by labor-cost savings'],
    intent: ['Leadership wants one case-management flow across all sites', 'Investing in milling and 3D printing capacity'],
    competitive: ['Offshore labs undercut on removable work', 'Competing CAD software vendors court lab technicians with free seats'],
    timing: ['Capacity planning for next year starts in November', 'Two sites reopen after refit in Q1'],
    plays: ['Show throughput and remake-rate gains from a connected clinic-to-lab loop and offer a single-site pilot before network rollout'],
  },
  'Health system': {
    priorities: ['Reduce catheter-associated infections and readmissions in continence care', 'Standardize formulary across hospitals', 'Support patients moving to home-based care'],
    financial: ['Value-based contracts reward fewer complications', 'Group purchasing terms reset each fiscal year'],
    intent: ['Chief nursing officer sponsors a standardization initiative', 'Pharmacy wants fewer SKUs with clinical evidence'],
    competitive: ['Larger medical device competitors bundle across categories', 'Home-care suppliers influence patient product choice'],
    timing: ['Fiscal year budget finalizes in 5 weeks', 'Formulary committee meets in November'],
    plays: ['Bring outcomes evidence and a total-cost-of-care model to the formulary committee; align with the nursing sponsor on a ward-level pilot'],
  },
};
const SIGNAL_POOL = {
  licensed: [
    ['Press release: announced acquisition of {n} clinics; integration begins next quarter', 'Licensed · news & filings'],
    ['Hiring data: 14 open roles for digital dentistry leads and clinical informatics', 'Licensed · hiring signals'],
    ['Leadership change: new Chief Financial Officer joined 5 weeks ago', 'Licensed · executive moves'],
    ['Investor update: management targets same-store production growth as 2027 priority', 'Licensed · earnings & investor materials'],
    ['Regulatory notice: new reimbursement rules take effect January', 'Licensed · regulatory feed'],
  ],
  firstParty: [
    ['Call transcript: champion asked for peer references on connected workflow ROI', '1P · call transcripts'],
    ['CRM: no executive-level meeting logged in 41 days', '1P · CRM activity'],
    ['Telemetry: scanner utilization up 18% over 90 days across active clinics', '1P · product telemetry'],
    ['Support: 3 open escalations on integration with practice software', '1P · support tickets'],
    ['Email: procurement requested revised terms for volume tiers', '1P · email metadata'],
  ],
};
const FIRST = ['Jordan', 'Morgan', 'Casey', 'Riley', 'Taylor', 'Avery', 'Quinn', 'Reese', 'Sasha', 'Devon', 'Noor', 'Mateo', 'Ingrid', 'Kenji', 'Leila', 'Anders', 'Chiara', 'Pavel'];
const LAST = ['Alvarez', 'Whitman', 'Nakamura', 'Okoye', 'Lindgren', 'Haddad', 'Moretti', 'Larsen', 'Baptiste', 'Kowalski', 'Sato', 'Reyes', 'Duval', 'Petrov', 'Hughes', 'Iyer'];
const ROLES = {
  DSO: [['Chief Executive Officer', 'Economic buyer'], ['Chief Financial Officer', 'Economic buyer'], ['VP Clinical Operations', 'Champion'], ['Director of Procurement', 'Gatekeeper'], ['Chief Clinical Officer', 'Influencer']],
  Distributor: [['President', 'Economic buyer'], ['VP Merchandising', 'Champion'], ['Director of Equipment Sales', 'Champion'], ['CFO', 'Economic buyer'], ['Director of Supplier Relations', 'Gatekeeper']],
  Education: [['Dean', 'Economic buyer'], ['Director of Digital Dentistry', 'Champion'], ['Associate Dean, Finance', 'Gatekeeper']],
  'Lab network': [['Chief Operating Officer', 'Economic buyer'], ['VP Technology', 'Champion'], ['Director of Purchasing', 'Gatekeeper']],
  'Health system': [['Chief Nursing Officer', 'Champion'], ['VP Supply Chain', 'Economic buyer'], ['Director of Pharmacy', 'Influencer']],
};
const STANCES = ['Supportive', 'Supportive', 'Neutral', 'Neutral', 'Skeptical'];

accounts.forEach((a) => {
  const P = POOLS[a.type];
  const pickN = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));
  const n = RI(6, 28);
  a.graph = {
    priorities: pickN(P.priorities, 2), financial: pickN(P.financial, 2), intent: pickN(P.intent, 2), competitive: pickN(P.competitive, 2), timing: pickN(P.timing, 2),
  };
  a.play = pick(P.plays);
  a.signals = pickN(SIGNAL_POOL.licensed, 2).map((s, i) => ({ text: s[0].replace('{n}', n), src: s[1], when: RI(2, 18) + 'd ago' })).concat(pickN(SIGNAL_POOL.firstParty, 2).map((s) => ({ text: s[0], src: s[1], when: RI(1, 30) + 'd ago' })));
  a.committee = shuffle(ROLES[a.type]).slice(0, Math.min(4, ROLES[a.type].length)).map((r) => ({ name: pick(FIRST) + ' ' + pick(LAST), title: r[0], role: r[1], stance: pick(STANCES), engaged: rnd() < 0.55 }));
});

// ---------- Forecast history (FY landing, $M) ----------
const ytd = 2654, ytdPlan = 2669, q4Plan = totalTarget;
const q4Forecast = matrix.reduce((t, m) => t + m.base, 0) + deals.reduce((t, d) => t + d.q4rev * d.aiProb, 0);
const fyForecast = ytd + q4Forecast;
const fyPlan = ytdPlan + q4Plan;
const fcHist = [];
const steps = [14.5, 11.8, 9.0, 6.2, 3.1, 1.4, 0.0];
steps.forEach((x, i) => fcHist.push({ label: 'Wk ' + (i - 6 === 0 ? 'now' : '-' + (6 - i)), v: Math.round((fyForecast + x + (i === 3 ? 4 : 0)) * 10) / 10 }));

const data = {
  meta: { asOf: ASOF, quarterDay: 17, quarterDays: 92, pilotStart: PILOT_START, ytd, ytdPlan, q4Plan, fyPlan, guidance: [3500, 3600], scale: SCALE },
  regions: REGIONS, segments: SEGMENTS, families: FAMILIES, stages: STAGES,
  matrix, accounts, deals, sellers, closed, weeks, quarters, forecastHistory: fcHist,
};

// sanity checks
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const wAI = sum(deals, (d) => d.q4rev * d.aiProb), wRep = sum(deals, (d) => d.q4rev * d.repProb), base = sum(matrix, (m) => m.base);
console.log('deals', deals.length, 'accounts', accounts.length, 'sellers', sellers.length, 'closed', closed.length);
console.log('scale', SCALE.toFixed(3), 'total deal amount', sum(deals, (d) => d.amount).toFixed(1), 'q4rev', sum(deals, (d) => d.q4rev).toFixed(1));
console.log('Q4 target', totalTarget, 'base', base.toFixed(1), 'AI weighted', wAI.toFixed(1), 'Rep weighted', wRep.toFixed(1));
console.log('Q4 AI forecast', (base + wAI).toFixed(1), 'att', ((base + wAI) / totalTarget * 100).toFixed(1) + '%', 'Rep forecast', (base + wRep).toFixed(1));
console.log('FY forecast', fyForecast.toFixed(1), 'FY plan', fyPlan);
SEGMENTS.forEach((sg) => REGIONS.forEach((r) => {
  const m = matrix.find((x) => x.segment === sg.id && x.region === r);
  const w = sum(deals.filter((d) => d.segment === sg.id && d.region === r), (d) => d.q4rev * d.aiProb);
  const pip = sum(deals.filter((d) => d.segment === sg.id && d.region === r), (d) => d.q4rev);
  console.log(sg.id.padEnd(4), r.padEnd(9), 'T', m.target.toFixed(1).padStart(6), 'B', m.base.toFixed(1).padStart(6), 'W', w.toFixed(1).padStart(5), 'att', ((m.base + w) / m.target * 100).toFixed(0) + '%', 'cov', (pip / (m.target - m.base)).toFixed(1) + 'x');
}));
const cohort = (f) => { const c = closed.filter(f); return { n: c.length, win: c.filter((x) => x.won).length / c.length, acv: sum(c.filter((x) => x.won), (x) => x.amount) / Math.max(1, c.filter((x) => x.won).length), cyc: sum(c, (x) => x.cycleDays) / c.length }; };
console.log('pilot since start', cohort((x) => x.guided), 'control since start', cohort((x) => x.after && !x.guided), 'pre', cohort((x) => !x.after));
console.log('TTM won', sum(closed.filter((x) => x.won), (x) => x.amount).toFixed(1));
console.log('maturity-attain corr sample', sellers.slice(0, 5).map((s) => [s.maturity, s.attainYTD]));
console.log('whitespace total', sum(accounts, (a) => a.whitespace).toFixed(1), 'atRisk', sum(accounts, (a) => a.atRiskRev).toFixed(1));

fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data));
console.log('data.json bytes', fs.statSync(path.join(__dirname, 'data.json')).size);
