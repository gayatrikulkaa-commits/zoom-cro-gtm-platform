// Integrity checks on the model: reconciliation, no double counting, units, insufficient data, and editable thresholds.
const fs = require('fs'), path = require('path');
const ZM = require('./model'), ZM2 = require('./model2');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const build = (edit) => { const T = JSON.parse(JSON.stringify(D.tables)); if (edit) edit(T); const pre = ZM2.prepare(T), M = ZM.buildModel(pre.T, pre.cfg); ZM2.enrich(M, pre.T); return M; };
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const near = (a, b, t = 1e-6) => Math.abs(a - b) < t, sum = ZM.sum;
const M = build(), R = M.regions, B = M.bridge;
// 1. the bridge reconciles, region by region and in total
['plan', 'closed', 'weighted', 'creation', 'landing', 'grossOpen', 'asksG', 'fixAct', 'askIn', 'incr', 'scenario', 'fixPot'].forEach((k) => ok(near(sum(R, (r) => B[r][k]), B.All[k]), 'regions add up to All for bridge.' + k));
R.concat(['All']).forEach((r) => { const b = B[r]; ok(near(b.landing, b.closed + b.weighted + b.creation) && near(b.gap, b.plan - b.landing) && near(b.scenario, b.landing + b.incr) && near(b.incr, b.fixAct + b.askIn) && near(b.grossPool, b.grossOpen + b.asksG), r + ': landing = closed + forecast; gap = plan - landing; scenario = landing + incremental; pool = open + unopened'); });
// 2. nothing is counted twice
const openWin = M.open.filter((o) => o.fq === M.curQ || o.fq === M.nextQ);
ok(M.asks.every((x) => !M.open.some((o) => o.account_id === x.a.account_id && o.product_line === x.a.nextProd)), 'unopened expansion is only for products with no open deal, so it cannot overlap the open pipeline');
ok(openWin.every((o) => o.recov <= o.amount - o.aiCall + 1e-9), 'the fixable amount on a deal never exceeds what the forecast does not already include');
ok(near(sum(openWin, (o) => o.aiCall), B.All.weighted), 'the forecast weight in the bridge is exactly the sum of the risk-weighted deals');
ok(B.All.incr < B.All.grossPool - B.All.weighted, 'incremental upside (' + B.All.incr.toFixed(2) + ') is far below the gross pool not already in the forecast (' + (B.All.grossPool - B.All.weighted).toFixed(2) + ')');
const emea = B.EMEA; ok(emea.asksG > 5 && emea.askIn < emea.asksG * 0.2, 'EMEA: ' + emea.asksG.toFixed(1) + 'M gross unopened expansion becomes only ' + emea.askIn.toFixed(1) + 'M this year; it is not added to the landing');
// 3. actions: totals only add within a kind, and overlap is flagged
ok(M.actions.filter((a) => a.additive === false).length >= 1, 'actions that overlap are flagged not additive');
ok(M.actions.filter((a) => a.modeled != null).every((a) => ['bookings', 'retention', 'pipeline'].includes(a.kind)), 'every quantified action names its kind, so bookings, revenue protected and pipeline are never summed together');
ok(M.actions.every((a) => a.owner && a.due && a.metric && a.conf && Array.isArray(a.deps) && a.go && a.problem && a.decision), 'every action has owner, due date, metric, confidence, dependencies, evidence link, problem and decision');
['now', 'next', 'later'].forEach((h) => ok(M.actions.some((a) => a.h === h), 'there is at least one action in horizon ' + h));
// 4. dimensions partition the accounts
['industry', 'size'].forEach((l) => { const all = M.matrix[l].flatMap((g) => g.accs.map((a) => a.account_id)); ok(all.length === M.accounts.length && new Set(all).size === M.accounts.length, l + ' rows partition the 40 accounts exactly'); });
ok(near(sum(M.matrix.region, (g) => g.ret.arr), M.matrix.all.ret.arr), 'region ARR adds up to the total');
ok(near(sum(M.matrix.region, (g) => g.perf.actual), M.matrix.all.perf.actual), 'region closed-to-date adds up to the total');
ok(near(sum(M.matrix.product, (g) => g.perf.actual), M.matrix.all.perf.actual), 'product closed-to-date adds up to the total');
ok(near(sum(Object.keys(M.comp.byCountry), (c) => M.comp.byCountry[c].lost), M.comp.totalLost), 'losses by country add up to the total lost to named rivals');
// 5. statuses: text label, confidence separate, evidence rules
const cells = []; ['region', 'industry', 'size', 'product'].forEach((l) => M.matrix[l].forEach((g) => ['perf', 'fcst', 'ret', 'grow', 'comp'].forEach((k) => cells.push(g[k]))));
ok(cells.every((c) => ['ok', 'warn', 'bad', 'insufficient', 'na'].includes(c.status)), 'every cell has a defined status');
ok(cells.filter((c) => c.status === 'ok' || c.status === 'warn' || c.status === 'bad').every((c) => ['High', 'Medium', 'Low'].includes(c.conf)), 'every coloured cell carries a separate confidence');
ok(cells.some((c) => c.status === 'ok' && c.conf !== 'High') && cells.some((c) => c.status === 'bad' && c.conf === 'High'), 'status and confidence vary independently (green with lower confidence, red with high confidence exist)');
ok(M.matrix.region.find((g) => g.label === 'EMEA').fcst.status === 'ok' && M.matrix.region.find((g) => g.label === 'EMEA').ret.status === 'bad', 'a red retention status stays visible while EMEA forecast is green');
const mi = build((T) => { T.levers.find((l) => l.key === 'min_accounts_for_status').value = 50; T.levers.find((l) => l.key === 'min_deals_for_status').value = 500; }).matrix;
ok(mi.region.concat([mi.all]).every((g) => g.ret.status === 'insufficient') && mi.region.every((g) => g.grow.status === 'insufficient' && g.comp.status === 'insufficient'), 'raise the evidence rules and every cell shows insufficient data instead of green');
ok(build((T) => { T.levers.find((l) => l.key === 'perf_green_min').value = 0.5; T.levers.find((l) => l.key === 'perf_amber_min').value = 0.4; }).matrix.all.perf.status === 'ok', 'thresholds are editable and move the status');
ok(M.matrix.industry.every((g) => g.perf.status === 'na' && g.fcst.status === 'na') && M.matrix.size.every((g) => g.perf.status === 'na'), 'industry and size show plan-based columns as not available instead of inventing a plan');
ok(M.matrix.product.every((g) => g.ret.status === 'na'), 'product rows show retention as not available (yearly revenue is not tracked by product)');
// 6. the elapsed-period adjustment
const p = M.matrix.all.perf; ok(near(p.elapsed, sum(['Q1 FY27', 'Q2 FY27'], (q) => M.planOf(q)) + M.planOf('Q3 FY27') * M.bookedShare), 'performance compares with elapsed plan (full quarters + ' + (M.bookedShare * 100).toFixed(0) + '% of the current one), not the whole year');
// 7. forecast history is only reported where comparable snapshots exist
ok(M.lag.errRows.every((r) => r.n >= 6), 'forecast error is computed only from comparable snapshots (12 region-quarters each week)');
// 8. disclosures in the built page
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'zoom', 'index.html'), 'utf8');
ok(/Synthetic data\. Not connected to Zoom or to Databook systems/.test(html), 'the page states that it is synthetic and not connected to Zoom or Databook');
ok(!/Databook forecast|Databook win chance|Databook users|Databook-weighted/.test(html), 'no label presents the prototype rules as Databook\'s own forecast or engine');
ok(!/market_share|market share panel/i.test(html.replace(/not market share|not total market share|no market-share|no external market-share/gi, '')), 'no market-share data is invented');
console.log(fail ? fail + ' CHECK(S) FAILED' : 'all integrity checks pass'); process.exit(fail ? 1 : 0);
