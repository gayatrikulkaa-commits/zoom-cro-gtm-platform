// Test cases for "what can I change right now to see a difference?". Each case is a set of cell edits on the front tabs; the effect text
// is computed by running the same overlay and model the site runs, so every "what you will see" line is a real result.
// usage: node cases.js  -> writes cases.json (read by mkxlsx.js)
const fs = require('fs'), path = require('path');
const ZM = require('./model'), ZM2 = require('./model2');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const fm = (x, d = 1) => (x < 0 ? '-' : '') + '$' + Math.abs(x).toFixed(d) + 'M', pc = (x, d = 0) => (x * 100).toFixed(d) + '%';
const WORD = { ok: 'Green', warn: 'Yellow', bad: 'Red' };

function run(edits) {
  const T = clone(D.tables);
  edits.forEach((e) => { const row = T[e.sheet].find((r) => Object.keys(e.match).every((k) => String(r[k]) === String(e.match[k]))); if (!row) throw new Error('no row for ' + JSON.stringify(e)); row[e.col] = e.to; });
  const pre = ZM2.prepare(T), M = ZM.buildModel(pre.T, pre.cfg); ZM2.enrich(M, pre.T);
  return M;
}
const CN = { perf: 'Performance', fcst: 'Forecast', ret: 'Retention risk', grow: 'Growth execution', comp: 'Competitive exposure' }, ST = { ok: 'Green', warn: 'Amber', bad: 'Red', insufficient: 'Insufficient data', na: 'n/a' };
function snap(M) {
  const B = M.bridge.All, s = { landing: B.landing, plan: B.plan, incr: B.incr, scenario: B.scenario, lost: M.comp.totalLost, atRisk: M.book.atRisk, nrr: M.book.nrr, tasks: M.tasks.length, openNamed: M.comp.openNamed.length, cells: {}, actions: M.actions.length };
  ['region', 'industry', 'size', 'product'].forEach((l) => M.matrix[l].forEach((g) => ['perf', 'fcst', 'ret', 'grow', 'comp'].forEach((k) => { s.cells[l + '|' + g.label + '|' + k] = { st: g[k].status, v: g[k].value }; })));
  ['perf', 'fcst', 'ret', 'grow', 'comp'].forEach((k) => (s.cells['all|All accounts|' + k] = { st: M.matrix.all[k].status, v: M.matrix.all[k].value }));
  s.sizeCounts = ZM2.SIZES.map((x) => x + ' ' + M.accounts.filter((a) => a.size_tier === x).length).join(', ');
  s.coverBad = (() => { let n = 0; M.regions.forEach((r) => M.products.forEach((p) => { const pl = M.planOf(M.nextQ, r, p), a = ZM.sum(M.open.filter((o) => o.fq === M.nextQ && o.account.region === r && o.product_line === p), (o) => o.amount); if (pl > 0 && a / pl < M.cfg.coverageNorm - 1) n++; })); return n; })();
  s.coverWarn = (() => { let n = 0; M.regions.forEach((r) => M.products.forEach((p) => { const pl = M.planOf(M.nextQ, r, p), a = ZM.sum(M.open.filter((o) => o.fq === M.nextQ && o.account.region === r && o.product_line === p), (o) => o.amount); if (pl > 0 && a / pl >= M.cfg.coverageNorm - 1 && a / pl < M.cfg.coverageNorm) n++; })); return n; })();
  return s;
}
function effects(a, b) {
  const out = [], LN = { region: 'Region', industry: 'Industry', size: 'Size', product: 'Product', all: '' };
  Object.keys(b.cells).forEach((k) => { if (a.cells[k].st !== b.cells[k].st) { const [lens, name, col] = k.split('|'); out.push({ pri: { all: 0, region: 1, product: 2, industry: 3, size: 4 }[lens], t: (lens === 'all' ? 'All accounts' : LN[lens] + ' ' + name) + ' · ' + CN[col] + ': ' + ST[a.cells[k].st] + ' to ' + ST[b.cells[k].st] }); } });
  const num = [];
  if (Math.abs(b.landing - a.landing) >= 0.05) num.push('Expected landing ' + fm(a.landing) + ' to ' + fm(b.landing) + ' (' + pc(a.landing / a.plan) + ' to ' + pc(b.landing / b.plan) + ' of plan)');
  else if (Math.abs(b.plan - a.plan) >= 0.05) num.push('FY27 plan ' + fm(a.plan) + ' to ' + fm(b.plan));
  if (Math.abs(b.incr - a.incr) >= 0.05) num.push('Incremental upside ' + fm(a.incr) + ' to ' + fm(b.incr));
  if (Math.abs(b.atRisk - a.atRisk) >= 0.1) num.push('Revenue at risk ' + fm(a.atRisk) + ' to ' + fm(b.atRisk));
  if (Math.abs(b.nrr - a.nrr) >= 0.002) num.push('Book retention ' + pc(a.nrr, 1) + ' to ' + pc(b.nrr, 1));
  if (Math.abs(b.lost - a.lost) >= 0.05) num.push('Lost to a named rival (four quarters) ' + fm(a.lost) + ' to ' + fm(b.lost));
  if (b.openNamed !== a.openNamed) num.push('Open deals naming a rival ' + a.openNamed + ' to ' + b.openNamed);
  if (b.coverBad !== a.coverBad || b.coverWarn !== a.coverWarn) num.push('Pipeline-cover heat map: red cells ' + a.coverBad + ' to ' + b.coverBad + ', amber ' + a.coverWarn + ' to ' + b.coverWarn);
  if (b.tasks !== a.tasks) num.push('Ranked tasks ' + a.tasks + ' to ' + b.tasks);
  if (b.sizeCounts !== a.sizeCounts) num.push('Accounts by size: ' + a.sizeCounts + ' to ' + b.sizeCounts);
  return out.sort((x, y) => x.pri - y.pri).map((x) => x.t).concat(num);
}

function main() {
const T0 = D.tables, base = snap(run([]));
const wd = T0.whatif_deals, wa = T0.whatif_accounts;
const biggest = (arr) => arr.slice().sort((a, b) => b.current_amount_arr - a.current_amount_arr)[0];
const M0 = run([]), apacDeal = biggest(wd.filter((r) => r.region === 'APAC')), emeaDeal = biggest(wd.filter((r) => r.region === 'EMEA')), noSp = wd.filter((r) => +r.current_exec_sponsor === 0).map((r) => ({ r, o: M0.open.find((x) => x.opp_id === r.opp_id) })).sort((a, b) => b.o.recov - a.o.recov)[0].r;
const weak = wa.map((r) => ({ r, a: M0.acc[r.account_id] })).filter((x) => x.a.renewalDays > 270 && x.a.health < 60).sort((x, y) => y.a.arr_current - x.a.arr_current)[0];
const renew60 = ZM.iso(ZM.ms('2026-10-17') + 60 * 864e5);

const CASES = [
  { id: 1, title: 'Make the APAC plan more realistic', why: 'Performance and Forecast compare delivery with the plan. A smaller plan should relieve APAC.', edits: [{ sheet: 'lever_groups', match: { group_type: 'Region', group: 'APAC' }, col: 'plan_scale', to: 0.85, label: 'APAC plan_scale' }], look: 'Command: APAC Performance and Forecast; the bridge' },
  { id: 2, title: 'Leak retention in Americas', why: 'A retention problem should turn Retention risk red even though bookings have not changed.', edits: [{ sheet: 'lever_groups', match: { group_type: 'Region', group: 'Americas' }, col: 'retention_shock_pct', to: 0.06, label: 'Americas retention_shock_pct' }], look: 'Command: Americas Retention risk; Accounts' },
  { id: 3, title: 'Lower the retention EMEA is expected to deliver', why: 'Retention risk compares actual retention with its forecast. Lower the forecast and the red can ease.', edits: [{ sheet: 'lever_groups', match: { group_type: 'Region', group: 'EMEA' }, col: 'nrr_forecast', to: 1.01, label: 'EMEA nrr_forecast' }], look: 'Command: EMEA Retention risk' },
  { id: 4, title: 'Make one industry leak', why: 'Retention problems often sit in an industry, not a region. Switch the matrix to Industry.', edits: [{ sheet: 'lever_groups', match: { group_type: 'Industry', group: 'Financial services' }, col: 'retention_shock_pct', to: 0.1, label: 'Financial services retention_shock_pct' }], look: 'Command: switch to Industry' },
  { id: 5, title: 'Close the largest APAC deal', why: 'One closed deal should move a small region: actuals up, statuses move.', edits: [{ sheet: 'whatif_deals', match: { opp_id: '@apac' }, col: 'new_stage', to: 'Closed Won', label: '@apac new_stage' }], look: 'Command: APAC row and the bridge' },
  { id: 6, title: 'Secure a sponsor on the deal it helps most', why: 'The risk-adjusted forecast weighs sponsorship, so a sponsor on a deal that can still be saved raises the forecast.', edits: [{ sheet: 'whatif_deals', match: { opp_id: '@sponsor' }, col: 'new_exec_sponsor', to: 1, label: '@sponsor new_exec_sponsor' }], look: 'Forecast: Pipeline; Command: Forecast and Growth execution' },
  { id: 7, title: 'Lose a big EMEA deal to Microsoft Teams', why: 'A recorded loss to a named rival should show on the map and in competitive exposure.', edits: [{ sheet: 'whatif_deals', match: { opp_id: '@emea' }, col: 'new_stage', to: 'Closed Lost', label: '@emea new_stage' }, { sheet: 'whatif_deals', match: { opp_id: '@emea' }, col: 'new_competitor', to: 'Microsoft Teams', label: '@emea new_competitor' }], look: 'Command: map and EMEA; Compete' },
  { id: 8, title: 'Treat a named rival as a bigger threat in the forecast', why: 'Raise the win-chance penalty for a named rival and every such deal is worth less.', edits: [{ sheet: 'levers', match: { key: 'competitor_penalty' }, col: 'value', to: 0.2, label: 'competitor_penalty' }], look: 'Command: Forecast column and bridge' },
  { id: 9, title: 'Ask for more pipeline cover', why: 'A stricter cover norm should turn more region and product cells amber or red.', edits: [{ sheet: 'levers', match: { key: 'coverage_norm' }, col: 'value', to: 4, label: 'coverage_norm' }], look: 'Forecast: Pipeline (cover heat map)' },
  { id: 10, title: 'Pull a weak renewal forward', why: 'A slipping account that renews sooner should raise revenue at risk.', edits: [{ sheet: 'whatif_accounts', match: { account_id: '@weak' }, col: 'new_renewal_date', to: '@renew60', label: '@weak new_renewal_date' }], look: 'Accounts: where to act; Command: Retention risk' },
  { id: 11, title: 'Re-draw what counts as a Large account', why: 'Size tiers come from yearly revenue cut-offs. Move the cut-off and the Size rows regroup.', edits: [{ sheet: 'levers', match: { key: 'size_large_min_arr' }, col: 'value', to: 12, label: 'size_large_min_arr' }], look: 'Command: switch to Size' },
  { id: 12, title: 'Tighten the Performance status', why: 'The green line is a choice. Move it and see how many statuses are judged differently.', edits: [{ sheet: 'levers', match: { key: 'perf_green_min' }, col: 'value', to: 1.0, label: 'perf_green_min' }, { sheet: 'levers', match: { key: 'perf_amber_min' }, col: 'value', to: 0.95, label: 'perf_amber_min' }], look: 'Command: Performance column' },
];
// resolve the "@" targets from the data
const resolve = (v) => (v === '@apac' ? apacDeal.opp_id : v === '@emea' ? emeaDeal.opp_id : v === '@sponsor' ? noSp.opp_id : v === '@weak' ? weak.r.account_id : v === '@renew60' ? renew60 : v);
CASES.forEach((c) => c.edits.forEach((e) => { Object.keys(e.match).forEach((k) => (e.match[k] = resolve(e.match[k]))); e.to = resolve(e.to); e.label = e.label.replace(/@\w+/, (m) => { const id = resolve(m), r = T0.whatif_deals.concat(T0.whatif_accounts).find((x) => x.opp_id === id || x.account_id === id); return (r ? r.account_name + ' ' : '') + '(' + id + ')'; }); }));
const out = CASES.map((c) => {
  const M = run(c.edits), s = snap(M), eff = effects(base, s);
  return { id: c.id, title: c.title, why: c.why, look: c.look, edits: c.edits.map((e) => ({ sheet: e.sheet, match: e.match, col: e.col, to: e.to, label: e.label, from: (() => { const row = T0[e.sheet].find((r) => Object.keys(e.match).every((k) => String(r[k]) === String(e.match[k]))); return row[e.col]; })() })), effects: eff, snapshot: { landing: s.landing } };
});
const CN2 = ['perf', 'fcst', 'ret', 'grow', 'comp'];
const baseRows = M0.matrix.region.concat([M0.matrix.all]).map((g) => ({ group: g.label, cells: CN2.map((k) => ({ k, st: g[k].status, v: g[k].value, conf: g[k].conf || '' })), ret: g.ret, fcst: g.fcst, perf: g.perf, grow: g.grow, comp: g.comp }));
const baseline = { landing: base.landing, plan: base.plan, incr: base.incr, scenario: base.scenario, lost: base.lost, atRisk: base.atRisk, nrr: base.nrr, rows: baseRows.map((r) => ({ group: r.group, cells: r.cells })), tasks: base.tasks };
fs.writeFileSync(path.join(__dirname, 'cases.json'), JSON.stringify({ baseline, cases: out }, null, 1));
out.forEach((c) => console.log('#' + c.id, c.title, '\n   ' + c.edits.map((e) => e.label + ': ' + e.from + ' -> ' + e.to).join(' | ') + '\n   ' + (c.effects.length ? c.effects.join('\n   ') : '!!! NO VISIBLE CHANGE')));
console.log('baseline', baseline.rows.map((r) => r.group + ' ' + r.cells.map((c) => c.st[0]).join('')).join(' | '));

}
if (require.main === module) main();
module.exports = { run, snap, effects, D };
