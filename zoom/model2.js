// Round-2 model: what-if overlay from the front tabs, traffic lights by region, industry and size, market and competitor
// views, the plan-to-gap bridge, and lags. Pure functions on the workbook tables; used by the site and by the generator checks.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./model')); else root.ZM2 = factory(root.ZM); })(typeof self !== 'undefined' ? self : this, function (ZM) {
'use strict';
const sum = ZM.sum, sumi = (a, f) => a.reduce((t, x, i) => t + f(x, i), 0), mean = ZM.mean, REG = ZM.REGIONS, PRODUCTS = ZM.PRODUCTS, ASOF = '2026-10-17';
const IND_ORDER = ['Retail and consumer', 'Financial services', 'Healthcare and life sciences', 'Technology and telecom', 'Industrial and energy', 'Travel and services'];
const SIZES = ['Large', 'Medium', 'Small'];
const r2 = (x) => Math.round(x * 100) / 100;
const blank = (v) => v === '' || v == null;

// area, key, default, unit, low, high, what it changes, where to look. Every cut-off is illustrative and editable.
const LEVER_DEFS = [
  ['Thresholds', 'coverage_norm', 3, 'x', 2, 5, 'Pipeline cover that counts as healthy. Raise it and more region and product cells turn amber or red.', 'Forecast > Pipeline (cover heat map)'],
  ['Thresholds', 'health_cutoff', 55, 'score', 40, 70, 'Accounts below this health score need repair. Raise it and more accounts, and more revenue, count as at risk.', 'Accounts; Command (Retention column)'],
  ['Thresholds', 'stale_days', 14, 'days', 7, 30, 'Days without activity before a deal counts as quiet (and stops counting as healthy execution).', 'Forecast > Pipeline; Command (Growth execution)'],
  ['Thresholds', 'discount_limit_pct', 25, 'percent', 15, 35, 'Discount above which a deal needs a written reason.', 'Pricing'],
  ['Forecast weights', 'sponsor_bonus', 0.07, 'probability', 0, 0.2, 'Win chance added when a customer executive sponsors the deal (prototype rule).', 'Forecast; Command (Forecast column)'],
  ['Forecast weights', 'no_sponsor_penalty', 0.11, 'probability', 0, 0.3, 'Win chance removed when no executive sponsors the deal (prototype rule). Raise it and the risk-adjusted forecast falls further below the sales team forecast.', 'Forecast; Command (Forecast column)'],
  ['Forecast weights', 'competitor_penalty', 0.05, 'probability', 0, 0.25, 'Win chance removed when a competitor is named on the deal (prototype rule).', 'Forecast; Compete'],
  ['Status cut-offs', 'perf_green_min', 0.97, 'ratio', 0.9, 1.1, 'Performance column: closed-won against the plan that has elapsed. At or above this is green.', 'Command (Performance column)'],
  ['Status cut-offs', 'perf_amber_min', 0.88, 'ratio', 0.7, 1, 'Performance column: from here up to the green line is amber; below it is red.', 'Command (Performance column)'],
  ['Status cut-offs', 'att_green_min', 1, 'ratio', 0.9, 1.1, 'Forecast column: expected landing against the full-year plan. At or above this is green.', 'Command (Forecast column)'],
  ['Status cut-offs', 'att_amber_min', 0.95, 'ratio', 0.8, 1, 'Forecast column: from here up to the green line is amber; below it is red.', 'Command (Forecast column)'],
  ['Status cut-offs', 'nrr_gap_yellow', 0.01, 'ratio', 0, 0.05, 'Net revenue retention this far below the group forecast turns the retention status amber.', 'Command (Retention column)'],
  ['Status cut-offs', 'nrr_gap_red', 0.04, 'ratio', 0.01, 0.1, 'Net revenue retention this far below the group forecast turns the retention status red.', 'Command (Retention column)'],
  ['Status cut-offs', 'at_risk_share_yellow', 0.05, 'ratio', 0.01, 0.1, 'Revenue at risk as a share of yearly revenue above this is amber.', 'Command (Retention column)'],
  ['Status cut-offs', 'at_risk_share_red', 0.1, 'ratio', 0.02, 0.2, 'Revenue at risk as a share of yearly revenue above this is red.', 'Command (Retention column)'],
  ['Status cut-offs', 'exec_healthy_green_min', 0.6, 'share', 0.3, 0.9, 'Growth execution: share of open pipeline value that has an executive sponsor, recent activity and two or more contacts. At or above this is green.', 'Command (Growth execution column)'],
  ['Status cut-offs', 'exec_healthy_amber_min', 0.4, 'share', 0.1, 0.7, 'Growth execution: from here up to the green line is amber; below it is red.', 'Command (Growth execution column)'],
  ['Status cut-offs', 'comp_exposure_amber', 0.2, 'share', 0.05, 0.5, 'Competitive exposure: share of open pipeline value that names a rival. Above this is amber.', 'Command (Competitive exposure column)'],
  ['Status cut-offs', 'comp_exposure_red', 0.4, 'share', 0.1, 0.7, 'Competitive exposure: above this is red.', 'Command (Competitive exposure column)'],
  ['Evidence rules', 'min_accounts_for_status', 3, 'accounts', 1, 10, 'Retention shows "insufficient data" instead of a colour when a group has fewer accounts than this.', 'Command (Retention column)'],
  ['Evidence rules', 'min_deals_for_status', 5, 'deals', 2, 15, 'Growth execution and competitive exposure show "insufficient data" when fewer open deals than this back them.', 'Command'],
  ['Tiering', 'size_large_min_arr', 17, 'USD M', 8, 30, 'Yearly revenue at or above this makes an account Large.', 'Command (Size rows)'],
  ['Tiering', 'size_medium_min_arr', 7, 'USD M', 3, 14, 'Yearly revenue at or above this (and below Large) makes an account Medium; below is Small.', 'Command (Size rows)'],
  ['Planning', 'q4_in_quarter_creation_share', 0.2, 'share of plan', 0.1, 0.3, 'Assumed share of next quarter plan that is created and closed inside the quarter. Part of the baseline forecast, shown separately.', 'Command (bridge)'],
  ['Planning', 'sponsor_push_success_rate', 0.5, 'share', 0.3, 0.7, 'Share of fixable open deals where the intervention works within the quarter.', 'Command (bridge, actions)'],
  ['Planning', 'renewal_rescue_save_rate', 0.4, 'share', 0.25, 0.55, 'Share of at-risk renewal revenue a rescue plan saves.', 'Command (actions)'],
  ['Planning', 'expansion_conversion_rate', 0.25, 'share', 0.15, 0.35, 'Share of unopened expansion revenue that converts to bookings once an opportunity is opened.', 'Command (bridge, actions)'],
  ['Planning', 'expansion_in_year_share', 0.3, 'share', 0.1, 0.8, 'Share of that conversion that can close before the fiscal year ends (expansion cycles are about 110 days).', 'Command (bridge)'],
  ['Planning', 'forecast_precision_band', 0.05, 'ratio', 0.03, 0.1, 'A forecast counts as right when it lands within this band of the final actual.', 'Forecast > Scorecard'],
  ['Planning', 'forecast_lag_band', 0.02, 'ratio', 0.01, 0.05, 'The forecast has caught up with reality once it is within this band of the final actual; the week it gets there is the lag.', 'Workspace > Lag and data quality'],
  ['Planning', 'pipeline_per_ae_usd_m', 5, 'USD M', 3, 10, 'Open pipeline one account executive can work well across the current and next quarter.', 'Workspace > Planning lens'],
  ['Planning', 'projects_per_owner', 4, 'projects', 2, 10, 'Open implementation projects one solutions engineer or success manager can run well.', 'Workspace > Planning lens'],
];
const DEF = Object.fromEntries(LEVER_DEFS.map((d) => [d[1], d[2]]));
const leverVal = (T, k) => { const r = (T.levers || []).find((x) => x.key === k); return r && !blank(r.value) && !isNaN(+r.value) ? +r.value : DEF[k]; };
const leverRows = () => LEVER_DEFS.map((d) => ({ area: d[0], key: d[1], value: d[2], unit: d[3], low: d[4], high: d[5], what_it_changes: d[6], where_to_look: d[7] }));

// ---------- what-if overlay ----------
function prepare(T0) {
  const T = Object.assign({}, T0), notes = [], lv = (k) => leverVal(T0, k);
  (T0.levers || []).forEach((l) => { if (DEF[l.key] != null && !blank(l.value) && +l.value !== DEF[l.key]) notes.push({ k: 'lever', t: 'Lever ' + l.key + ': ' + DEF[l.key] + ' to ' + l.value }); });
  T.assumptions = leverRows().map((d) => ({ key: d.key, value: lv(d.key), low: d.low, high: d.high, unit: d.unit, rationale: d.what_it_changes })).concat(T0.assumptions || []);
  const gl = {}; (T0.lever_groups || []).forEach((r) => (gl[r.group_type + '|' + r.group] = r));
  const wa = {}; (T0.whatif_accounts || []).forEach((r) => { if (!blank(r.account_id)) wa[r.account_id] = r; });
  const big = lv('size_large_min_arr'), med = lv('size_medium_min_arr');
  T.sf_accounts = T0.sf_accounts.map((a) => {
    const b = Object.assign({}, a), w = wa[a.account_id], ch = [];
    if (w) {
      if (!blank(w.new_arr_current)) { b.arr_current = +w.new_arr_current; ch.push('yearly revenue ' + a.arr_current + ' to ' + w.new_arr_current); }
      if (!blank(w.new_renewal_date)) { b.renewal_date = String(w.new_renewal_date).slice(0, 10); ch.push('renewal ' + a.renewal_date + ' to ' + b.renewal_date); }
      [['phone', 'Phone'], ['contact_center', 'Contact Center'], ['ai_addon', 'AI']].forEach(([c, n]) => { const v = w['new_owns_' + c]; if (!blank(v)) { b['owns_' + c] = +v; if (+v !== +a['owns_' + c]) ch.push(n + (+v ? ' added' : ' removed')); } });
      if (ch.length) notes.push({ k: 'account', t: a.account_name + ': ' + ch.join('; ') });
    }
    const arr = +b.arr_current; b.size_tier = arr >= big ? 'Large' : arr >= med ? 'Medium' : 'Small';
    let keep = 1; ['Region|' + b.region, 'Industry|' + b.industry_group, 'Size|' + b.size_tier].forEach((k) => { const r = gl[k], s = r && !blank(r.retention_shock_pct) ? +r.retention_shock_pct : 0; if (s > 0) keep *= 1 - s; });
    if (keep < 1) { b.contraction_ttm = r2((+b.contraction_ttm || 0) + arr * (1 - keep)); b.arr_current = r2(arr * keep); }
    return b;
  });
  (T0.lever_groups || []).forEach((r) => { if (!blank(r.retention_shock_pct) && +r.retention_shock_pct > 0) notes.push({ k: 'group', t: r.group_type + ' ' + r.group + ': ' + Math.round(+r.retention_shock_pct * 1000) / 10 + '% of yearly revenue lost (retention shock)' }); if (r.group_type === 'Region' && !blank(r.plan_scale) && +r.plan_scale !== 1) notes.push({ k: 'group', t: r.group + ' plan scaled by ' + r.plan_scale }); });
  const wd = {}; (T0.whatif_deals || []).forEach((r) => { if (!blank(r.opp_id)) wd[r.opp_id] = r; });
  T.sf_opportunities = T0.sf_opportunities.map((o) => {
    const w = wd[o.opp_id]; if (!w) return o;
    const b = Object.assign({}, o), ch = [];
    if (!blank(w.new_stage) && w.new_stage !== o.stage) {
      b.stage = w.new_stage; ch.push('stage ' + o.stage + ' to ' + w.new_stage);
      if (/^Closed/.test(w.new_stage)) { b.forecast_category = 'Closed'; b.rep_probability = ''; b.last_activity_date = ASOF; if (blank(w.new_close_date)) b.close_date = ASOF; }
      else if (/^Closed/.test(o.stage)) { b.forecast_category = 'Pipeline'; b.rep_probability = 0.1; }
    }
    if (!blank(w.new_amount_arr)) { b.amount_arr = +w.new_amount_arr; ch.push('amount ' + o.amount_arr + ' to ' + w.new_amount_arr); }
    if (!blank(w.new_close_date)) { b.close_date = String(w.new_close_date).slice(0, 10); ch.push('close date ' + o.close_date + ' to ' + b.close_date); }
    if (!blank(w.new_exec_sponsor)) { b.exec_sponsor = +w.new_exec_sponsor; if (+w.new_exec_sponsor !== +o.exec_sponsor) { ch.push(+w.new_exec_sponsor ? 'executive sponsor secured' : 'executive sponsor removed'); if (+w.new_exec_sponsor) b.last_activity_date = ASOF; } }
    if (!blank(w.new_competitor) && w.new_competitor !== o.competitor) { b.competitor = w.new_competitor; ch.push('competitor ' + o.competitor + ' to ' + w.new_competitor); }
    if (ch.length) { const a = T0.sf_accounts.find((x) => x.account_id === o.account_id); notes.push({ k: 'deal', t: (a ? a.account_name : o.account_id) + ' ' + o.product_line + ' (' + o.opp_id + '): ' + ch.join('; ') }); }
    return b;
  });
  const ps = {}; (T0.lever_groups || []).forEach((r) => { if (r.group_type === 'Region' && !blank(r.plan_scale)) ps[r.group] = +r.plan_scale; });
  T.targets = T0.targets.map((t) => (ps[t.region] && ps[t.region] !== 1 ? Object.assign({}, t, { plan_arr: r2(+t.plan_arr * ps[t.region]) }) : t));
  const cfg = { coverageNorm: lv('coverage_norm'), healthCut: lv('health_cutoff'), staleDays: lv('stale_days'), discountLimit: lv('discount_limit_pct') / 100, sponsorBonus: lv('sponsor_bonus'), noSponsorPenalty: lv('no_sponsor_penalty'), compPenalty: lv('competitor_penalty') };
  return { T, cfg, notes };
}

// ---------- status matrix, competitive facts, bridge, actions, lags, data quality ----------
const RANK = { ok: 0, warn: 1, bad: 2 }, worst = (...s) => s.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
const qOrd = (q) => +q.slice(-2) * 4 + +q[1];
const confOf = (n, hi, mid) => (n >= hi ? 'High' : n >= mid ? 'Medium' : 'Low');
function enrich(M, T) {
  const lv = (k) => leverVal(T, k), LV = {}; LEVER_DEFS.forEach((d) => (LV[d[1]] = lv(d[1]))); M.lv = LV;
  const accounts = M.accounts, closed = M.closed, open = M.open, curQ = M.curQ, nextQ = M.nextQ, fy = curQ.slice(-2), sd = M.cfg.staleDays;

  // booking curve: share of a quarter normally closed by this day, from the last full quarters
  let tot = 0, by = 0;
  [...new Set(closed.map((o) => o.fq))].filter((q) => q !== curQ && ZM.quarterBounds(q).end < M.asOf).forEach((q) => { const b = ZM.quarterBounds(q); closed.filter((o) => o.won && o.fq === q).forEach((o) => { tot += o.amount; if (ZM.days(b.start, o.close_date) + 1 <= M.cur.elapsed) by += o.amount; }); });
  M.bookedShare = tot ? by / tot : 0.8;

  // weekly forecast snapshots (synthetic history)
  const snaps = T.forecast_snapshots || [];
  const snapBy = (q, r) => snaps.filter((s) => s.fiscal_quarter === q && s.region === r).sort((a, b) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)));

  // ----- competitive facts: what the CRM records, nothing inferred -----
  const allQ = [...new Set(closed.map((o) => o.fq))].sort((a, b) => qOrd(a) - qOrd(b)), last4 = allQ.slice(-4), named = (o) => o.competitor && o.competitor !== 'None';
  const lostAll = closed.filter((o) => o.lost && named(o) && last4.includes(o.fq)), openNamedAll = open.filter(named), decidedAll = closed.filter((o) => o.won || o.lost), wr = (a) => (a.length ? a.filter((o) => o.won).length / a.length : 0);
  const top = (m) => Object.entries(m).sort((x, y) => y[1] - x[1])[0], dimOf = { region: (o) => o.account.region, industry: (o) => o.account.industry_group, size: (o) => o.account.size_tier, product: (o) => o.product_line };
  // competitive facts as the CRM records them, for the whole book or for any filter (region, industry, size, product)
  const mkComp = (f) => {
    const lostC = lostAll.filter(f), openNamed = openNamedAll.filter(f), decided = decidedAll.filter(f);
    const bucket = (m, k) => (m[k] = m[k] || { lost: 0, n: 0, comps: {}, prods: {}, openAmt: 0, openAi: 0, openN: 0, deals: [] }), byCountry = {}, byComp = {};
    lostC.forEach((o) => { const b = bucket(byCountry, o.account.country), c = bucket(byComp, o.competitor); b.lost += o.amount; b.n++; b.comps[o.competitor] = (b.comps[o.competitor] || 0) + o.amount; b.prods[o.product_line] = (b.prods[o.product_line] || 0) + o.amount; b.deals.push(o); c.lost += o.amount; c.n++; c.prods[o.product_line] = (c.prods[o.product_line] || 0) + o.amount; c.deals.push(o); });
    openNamed.forEach((o) => { [bucket(byCountry, o.account.country), bucket(byComp, o.competitor)].forEach((x) => { x.openAmt += o.amount; x.openAi += o.aiCall; x.openN++; }); });
    const rows = [...new Set(openNamed.concat(decided.filter(named)).map((o) => o.competitor))].map((c) => { const d = decided.filter((o) => o.competitor === c), b = byComp[c] || bucket({}, c), reg = {}; b.deals.forEach((o) => (reg[o.account.region] = (reg[o.account.region] || 0) + o.amount)); return { name: c, lost: b.lost, nLost: b.n, contested: d.length, winRate: wr(d), openAmt: b.openAmt, openN: b.openN, topProduct: top(b.prods) ? top(b.prods)[0] : '-', topRegion: top(reg) ? top(reg)[0] : '-' }; }).sort((x, y) => y.lost - x.lost);
    return { last4, lost: lostC, byCountry, byComp, rows, totalLost: sum(lostC, (o) => o.amount), openNamed, winRateNamed: wr(decided.filter(named)), winRateClear: wr(decided.filter((o) => !named(o))), nDecidedNamed: decided.filter(named).length, nLostAll: closed.filter((o) => o.lost && last4.includes(o.fq) && f(o)).length,
      by: (lens) => { const fx = dimOf[lens], labels = lens === 'product' ? PRODUCTS : [...new Set(accounts.map((a) => ({ region: a.region, industry: a.industry_group, size: a.size_tier }[lens])))], comps = [...new Set(lostAll.concat(openNamedAll).map((o) => o.competitor))].sort(); return { labels, comps, cell: (lb, c) => ({ lost: sum(lostC.filter((o) => fx(o) === lb && o.competitor === c), (o) => o.amount), nLost: lostC.filter((o) => fx(o) === lb && o.competitor === c).length, open: sum(openNamed.filter((o) => fx(o) === lb && o.competitor === c), (o) => o.amount), nOpen: openNamed.filter((o) => fx(o) === lb && o.competitor === c).length }) }; } };
  };
  M.comp = mkComp(() => true); M.compFor = mkComp; const lostC = lostAll, openNamed = openNamedAll, decided = decidedAll;

  // ----- expansion customers have asked for but no opportunity exists -----
  const asks = accounts.filter((a) => a.nextProd && a.nextProdIntent >= 1 && a.health >= M.cfg.healthCut && !open.some((o) => o.account_id === a.account_id && o.product_line === a.nextProd)).map((a) => ({ a, est: a.arr_current * ZM.WS_WEIGHT[a.nextProd] })).sort((x, y) => y.est - x.est);
  M.asks = asks; const coachAsk = asks.find((x) => x.a.nextProd === 'Contact Center') || asks[0]; M.coachAccountId = coachAsk ? coachAsk.a.account_id : null;

  // ----- forecast lag and error (synthetic history) -----
  const band = LV.forecast_lag_band, actualOf = (q, r) => sum(closed.filter((o) => o.won && o.fq === q && o.account.region === r), (o) => o.amount);
  const fl = REG.map((r) => { const qd = [...new Set(snaps.filter((s) => s.region === r && s.fiscal_quarter !== curQ).map((s) => s.fiscal_quarter))].sort((a, b) => qOrd(a) - qOrd(b)); const weeks = qd.map((q) => { const actual = actualOf(q, r), ss = snapBy(q, r), ok = (s) => Math.abs(+s.forecast_landing / Math.max(0.0001, actual) - 1) <= band, hit = ss.find((s, i) => ss.slice(i).every(ok)); return { q, week: hit ? +hit.week_of_quarter : 14, actual }; }); return { region: r, weeks, avg: weeks.length ? mean(weeks.map((x) => x.week)) : 0, cur: snapBy(curQ, r) }; });
  const errRows = [3, 5, 7, 9, 11, 13].map((w) => { const errs = []; REG.forEach((r) => [...new Set(snaps.filter((s) => s.region === r && s.fiscal_quarter !== curQ).map((s) => s.fiscal_quarter))].forEach((q) => { const s = snapBy(q, r).find((x) => +x.week_of_quarter === w), a = actualOf(q, r); if (s && a > 0) errs.push(+s.forecast_landing / a - 1); })); return { week: w, n: errs.length, bias: errs.length ? mean(errs) : null, mae: errs.length ? mean(errs.map(Math.abs)) : null }; });
  const won6 = closed.filter((o) => o.won && o.fq !== curQ), cyc = (a) => (a.length ? mean(a.map((o) => o.cycle)) : 0);
  const done = T.monday_projects.filter((p) => p.status === 'Done' && p.actual_go_live), late = T.monday_projects.filter((p) => p.status !== 'Done' && ZM.days(p.target_go_live, M.asOf) > 0), gl2 = (arr, f) => (arr.length ? mean(arr.map(f)) : 0), prodKeys = [...new Set(T.monday_projects.map((p) => p.product))];
  M.lag = { band, forecast: fl, errRows, cycleByProduct: PRODUCTS.map((p) => ({ k: p, v: cyc(won6.filter((o) => o.product_line === p)), n: won6.filter((o) => o.product_line === p).length })), cycleByRegion: REG.map((r) => ({ k: r, v: cyc(won6.filter((o) => o.account.region === r)), n: won6.filter((o) => o.account.region === r).length })), goLive: prodKeys.map((k) => ({ k, live: gl2(done.filter((p) => p.product === k), (p) => ZM.days(p.start_date, p.actual_go_live)), nDone: done.filter((p) => p.product === k).length, lateN: late.filter((p) => p.product === k).length, lateDays: gl2(late.filter((p) => p.product === k), (p) => ZM.days(p.target_go_live, M.asOf)) })), goLiveAll: gl2(done, (p) => ZM.days(p.start_date, p.actual_go_live)) };

  // ----- the status matrix -----
  const openWin = open.filter((o) => o.fq === curQ || o.fq === nextQ), healthy = (o) => +o.exec_sponsor === 1 && o.stale < sd && +o.contacts_engaged >= 2;
  const att = (v) => (v >= LV.att_green_min ? 'ok' : v >= LV.att_amber_min ? 'warn' : 'bad'), perfSt = (v) => (v >= LV.perf_green_min ? 'ok' : v >= LV.perf_amber_min ? 'warn' : 'bad');
  const gl = {}; (T.lever_groups || []).forEach((r) => (gl[r.group_type + '|' + r.group] = r));
  const nrrFor = (type, name) => { const r = gl[type + '|' + name]; return r && !blank(r.nrr_forecast) ? +r.nrr_forecast : 1.03; };
  const doneQs = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => q + ' FY' + fy).filter((q) => qOrd(q) < qOrd(curQ));
  function row(lens, label, accs, reg, prod, nrrF) {
    const ids = new Set(accs.map((a) => a.account_id)), inA = (o) => ids.has(o.account_id) && (!prod || o.product_line === prod), hasPlan = lens === 'region' || lens === 'product' || lens === 'all', out = { lens, label, n: accs.length, accs, ids, prod };
    const planNote = 'Plan is set by region and product, not at this level';
    const wonY = closed.filter((o) => o.won && o.close_date >= M.fyStart && inA(o)), actual = sum(wonY, (o) => o.amount), oRows = openWin.filter(inA);
    // performance against the plan that has elapsed
    if (hasPlan) {
      const planDone = sum(doneQs, (q) => M.planOf(q, reg, prod)), planCur = M.planOf(curQ, reg, prod), elapsed = planDone + planCur * M.bookedShare, ratio = actual / Math.max(0.0001, elapsed);
      out.perf = wonY.length < 2 || elapsed <= 0 ? { status: 'insufficient', n: wonY.length, why: 'Fewer than two closed deals' } : { status: perfSt(ratio), value: ratio, actual, elapsed, n: wonY.length, conf: confOf(wonY.length, 10, 5), why: 'Closed-won this fiscal year divided by the plan that has elapsed (full quarters plus ' + Math.round(M.bookedShare * 100) + '% of the current one, the share that normally closes by now)' };
    } else out.perf = { status: 'na', why: planNote };
    // forecast against the full-year plan
    if (hasPlan) {
      const fyPlan = sum(['Q1', 'Q2', 'Q3', 'Q4'], (q) => M.planOf(q + ' FY' + fy, reg, prod)), weighted = sum(oRows, (o) => o.aiCall), creation = LV.q4_in_quarter_creation_share * M.planOf(nextQ, reg, prod), landing = actual + weighted + creation, ratio = landing / Math.max(0.0001, fyPlan);
      const openAmt = sum(oRows, (o) => o.amount), spShare = openAmt ? sum(oRows.filter((o) => +o.exec_sponsor), (o) => o.amount) / openAmt : 0, assumed = landing ? creation / landing : 0, lagw = lens === 'region' ? (fl.find((f) => f.region === label) || {}).avg : null;
      const pts = (assumed <= 0.1 ? 1 : 0) + (spShare >= 0.6 ? 1 : 0) + (lagw == null ? 1 : lagw <= 10 ? 1 : 0), reasons = ['Assumed new pipeline is ' + Math.round(assumed * 100) + '% of the landing' + (assumed <= 0.1 ? '' : ' (above 10%)'), 'Executive sponsor on ' + Math.round(spShare * 100) + '% of open pipeline' + (spShare >= 0.6 ? '' : ' (below 60%)'), lagw == null ? 'Forecast lag not measured at this level' : 'Sales forecast settles in week ' + Math.round(lagw) + ' of 13' + (lagw <= 10 ? '' : ' (after week 10)')];
      out.fcst = fyPlan <= 0 || !oRows.length && !actual ? { status: 'insufficient', why: 'No plan or no pipeline' } : { status: att(ratio), value: ratio, landing, fyPlan, actual, weighted, creation, n: oRows.length, conf: pts >= 3 ? 'High' : pts === 2 ? 'Medium' : 'Low', confWhy: reasons, why: 'Closed actuals + risk-weighted open deals this and next quarter + assumed new pipeline, divided by the full-year plan' };
    } else out.fcst = { status: 'na', why: planNote };
    // retention
    if (lens === 'product') out.ret = { status: 'na', why: 'Yearly revenue is not tracked by product in this data' };
    else {
      const arr = sum(accs, (a) => +a.arr_current), arr12 = sum(accs, (a) => +a.arr_12m_ago), contr = sum(accs, (a) => +a.contraction_ttm), nrr = arr / Math.max(0.0001, arr12), atRisk = sum(accs, (a) => a.arrAtRisk), rs = atRisk / Math.max(0.0001, arr), gap = nrrF - nrr;
      const sN = gap <= LV.nrr_gap_yellow ? 'ok' : gap <= LV.nrr_gap_red ? 'warn' : 'bad', sR = rs <= LV.at_risk_share_yellow ? 'ok' : rs <= LV.at_risk_share_red ? 'warn' : 'bad';
      out.ret = accs.length < LV.min_accounts_for_status ? { status: 'insufficient', n: accs.length, why: 'Fewer than ' + LV.min_accounts_for_status + ' accounts' } : { status: worst(sN, sR), value: nrr, nrrF, grr: 1 - contr / Math.max(0.0001, arr12), gap, atRisk, riskShare: rs, arr, arr12, n: accs.length, conf: confOf(accs.length, 8, 4), why: 'The worse of net revenue retention against its forecast and revenue at risk as a share of yearly revenue' };
    }
    // growth execution
    const openAmt2 = sum(oRows, (o) => o.amount), hs = openAmt2 ? sum(oRows.filter(healthy), (o) => o.amount) / openAmt2 : 0;
    const cover = hasPlan && reg !== undefined ? sum(open.filter((o) => o.fq === nextQ && inA(o)), (o) => o.amount) / Math.max(0.0001, M.planOf(nextQ, reg, prod)) : null;
    out.grow = oRows.length < LV.min_deals_for_status ? { status: 'insufficient', n: oRows.length, why: 'Fewer than ' + LV.min_deals_for_status + ' open deals' } : { status: hs >= LV.exec_healthy_green_min ? 'ok' : hs >= LV.exec_healthy_amber_min ? 'warn' : 'bad', value: hs, cover, openAmt: openAmt2, n: oRows.length, conf: confOf(oRows.length, 15, 8), why: 'Share of open pipeline value (this and next quarter) that has an executive sponsor, activity within ' + sd + ' days and two or more contacts' };
    // competitive exposure
    const ex = openAmt2 ? sum(oRows.filter(named), (o) => o.amount) / openAmt2 : 0, lost = sum(lostC.filter(inA), (o) => o.amount), nDec = decided.filter((o) => inA(o) && named(o)).length;
    out.comp = oRows.length < LV.min_deals_for_status ? { status: 'insufficient', n: oRows.length, why: 'Fewer than ' + LV.min_deals_for_status + ' open deals' } : { status: ex >= LV.comp_exposure_red ? 'bad' : ex >= LV.comp_exposure_amber ? 'warn' : 'ok', value: ex, lost, nDecided: nDec, n: oRows.length, conf: confOf(oRows.length + nDec, 25, 12), why: 'Share of open pipeline value (this and next quarter) where the CRM names a competitor; closed losses naming a rival shown alongside' };
    return out;
  }
  const mx = { region: REG.map((r) => row('region', r, accounts.filter((a) => a.region === r), r, null, nrrFor('Region', r))), industry: IND_ORDER.filter((x) => accounts.some((a) => a.industry_group === x)).map((x) => row('industry', x, accounts.filter((a) => a.industry_group === x), undefined, null, nrrFor('Industry', x))), size: SIZES.filter((x) => accounts.some((a) => a.size_tier === x)).map((x) => row('size', x, accounts.filter((a) => a.size_tier === x), undefined, null, nrrFor('Size', x))), product: PRODUCTS.map((p) => row('product', p, accounts, null, p, 1.03)) };
  const arrW = (arr) => { const t = sum(arr, (x) => x.ret.arr12) || 1; return sum(arr, (x) => x.ret.nrrF * x.ret.arr12) / t; };
  mx.all = row('all', 'All accounts', accounts, null, null, arrW(mx.region));
  M.matrix = mx;

  // account-level statuses (the trees)
  accounts.forEach((a) => {
    const ops = openWin.filter((o) => o.account_id === a.account_id), amt = sum(ops, (o) => o.amount), hsA = amt ? sum(ops.filter(healthy), (o) => o.amount) / amt : 0, exA = amt ? sum(ops.filter(named), (o) => o.amount) / amt : 0;
    a.lightGrow = ops.length ? (hsA >= LV.exec_healthy_green_min ? 'ok' : hsA >= LV.exec_healthy_amber_min ? 'warn' : 'bad') : 'none'; a.growShare = hsA; a.growOpen = ops.length;
    a.lightRet = a.health < M.cfg.healthCut || (a.arrAtRisk > 0 && a.renewalDays <= 90) ? 'bad' : a.health < 70 ? 'warn' : 'ok';
    a.lost4 = sum(lostC.filter((o) => o.account_id === a.account_id), (o) => o.amount); a.lightComp = ops.length ? (exA >= LV.comp_exposure_red ? 'bad' : exA >= LV.comp_exposure_amber ? 'warn' : 'ok') : (a.lost4 > 0 ? 'warn' : 'none'); a.compShare = exA;
  });

  // ----- bridge: one metric (net new yearly revenue booked), one time basis (this fiscal year), nothing counted twice -----
  const spRate = LV.sponsor_push_success_rate, conv = LV.expansion_conversion_rate, inYr = LV.expansion_in_year_share;
  const bridgeOf = (rgs) => {
    const rows = M.rows.filter((r) => rgs.includes(r.region)), plan = sum(rgs, (r) => sum(['Q1', 'Q2', 'Q3', 'Q4'], (q) => M.planOf(q + ' FY' + fy, r))), closedY = sum(closed.filter((o) => o.won && o.close_date >= M.fyStart && rgs.includes(o.account.region)), (o) => o.amount);
    const ow = openWin.filter((o) => rgs.includes(o.account.region)), grossOpen = sum(ow, (o) => o.amount), weighted = sum(rows, (r) => r.q3ai + r.q4ai), creation = LV.q4_in_quarter_creation_share * sum(rows, (r) => r.q4plan), landing = closedY + weighted + creation;
    const remainder = grossOpen - weighted, fixPot = sum(ow, (o) => o.recov), asksG = sum(asks.filter((x) => rgs.includes(x.a.region)), (x) => x.est), fixAct = fixPot * spRate, askAll = asksG * conv, askIn = askAll * inYr, askLater = askAll - askIn, incr = fixAct + askIn;
    return { plan, closed: closedY, weighted, creation, landing, gap: plan - landing, grossOpen, remainder, fixPot, asksG, grossPool: grossOpen + asksG, fixAct, askIn, askLater, incr, scenario: landing + incr, gapAfter: plan - landing - incr, att: landing / Math.max(0.0001, plan), nFix: ow.filter((o) => o.recov > 0.005).length, nAsks: asks.filter((x) => rgs.includes(x.a.region)).length, ok: weighted <= grossOpen + 1e-6 && fixPot <= remainder + 1e-6 };
  };
  M.bridge = Object.fromEntries(REG.map((r) => [r, bridgeOf([r])])); M.bridge.All = bridgeOf(REG);

  // ----- actions by horizon -----
  const due = (n) => ZM.iso(ZM.ms(M.asOf) + n * 864e5), tk = (t) => M.tasks.filter((x) => x.type === t), nm = (ts, n = 2) => ts.slice(0, n).map((x) => M.acc[x.account_id].account_name).join(', ');
  const A = [], co = M.cohort;
  const sp = openWin.filter((o) => !+o.exec_sponsor && o.recov > 0.005).sort((a, b) => b.recov - a.recov), spAmt = sum(sp, (o) => o.amount);
  if (sp.length) A.push({ id: 'sponsor', h: 'now', title: 'Secure executive sponsors on ' + sp.length + ' open deals', problem: sp.length + ' open deals worth ' + spAmt.toFixed(1) + 'M (yearly revenue) have no customer executive sponsor', decision: 'Authorize sponsor outreach; sellers use the executive brief and the expansion coach', owner: 'Account executives, led by regional vice presidents', due: due(14), metric: 'Executive sponsor coverage of open pipeline', kind: 'bookings', modeled: sum(sp, (o) => o.recov) * spRate, basis: 'deal-level win-chance gain x ' + Math.round(spRate * 100) + '% success', observed: 'Pilot deals have a sponsor on ' + Math.round(co.pilot.exec * 100) + '% against ' + Math.round(co.control.exec * 100) + '% (observational, not causal)', conf: 'Medium', deps: ['Executive access at the customer', 'Account briefs from the coach'], go: ['tab', 'pipeline'], who: sp.slice(0, 3).map((o) => o.account.account_name).join(', ') });
  const rr = tk('Renewal rescue'); if (rr.length) A.push({ id: 'rescue', h: 'now', title: 'Start rescue plans on ' + rr.length + ' slipping renewals', problem: rr.length + ' renewals inside 270 days sit below the health line; ' + sum(rr, (x) => x.impact).toFixed(1) + 'M of yearly revenue is at risk', decision: 'Approve executive check-ins and adoption sprints before quotes go out', owner: 'Customer success managers with account owners', due: due(21), metric: 'Revenue at risk on renewals within 270 days', kind: 'retention', modeled: sum(rr, (x) => x.impact) * LV.renewal_rescue_save_rate, basis: Math.round(LV.renewal_rescue_save_rate * 100) + '% of the at-risk revenue saved', observed: null, conf: 'Medium', deps: ['Adoption data from telemetry', 'Customer executive time'], go: ['accfocus', 'priority'], who: nm(rr) });
  const ub = tk('Unblock delivery'); if (ub.length) A.push({ id: 'unblock', h: 'now', title: 'Unblock ' + ub.length + ' stuck implementations', problem: ub.length + ' projects are blocked or at risk at accounts with open deals', decision: 'Assign a named engineer to each blocker', owner: 'Solutions engineers', due: due(21), metric: 'Projects blocked or at risk', kind: 'none', modeled: null, basis: 'Not quantified: delivery is a condition for renewals and new deals, not a revenue line', observed: null, conf: 'High', deps: ['Customer change windows'], go: ['tab', 'pipeline'], who: nm(ub) });
  if (asks.length) A.push({ id: 'asks', h: 'next', title: 'Open ' + asks.length + ' expansion deals customers asked for', problem: asks.length + ' healthy accounts raised a product on calls but have no opportunity: ' + sum(asks, (x) => x.est).toFixed(1) + 'M gross', decision: 'Create the opportunities and run the expansion coach on each', owner: 'Account executives', due: due(45), metric: 'Expansion opportunities created and qualified', kind: 'bookings', modeled: M.bridge.All.askIn, basis: 'gross x ' + Math.round(conv * 100) + '% conversion x ' + Math.round(inYr * 100) + '% closing before year end; the rest lands next year', observed: null, conf: 'Low', deps: ['Buyer confirms the need', 'Baseline captured in discovery'], go: ['accfocus', 'priority'], who: asks.slice(0, 2).map((x) => x.a.account_name + ' ' + x.a.nextProd).join(', '), accountId: M.coachAccountId });
  const thin = []; REG.forEach((r) => PRODUCTS.forEach((p) => { const pl = M.planOf(nextQ, r, p), amt = sum(open.filter((o) => o.fq === nextQ && o.account.region === r && o.product_line === p), (o) => o.amount), need = pl * M.cfg.coverageNorm - amt; if (pl > 0 && need > 0.3) thin.push({ r, p, need }); })); thin.sort((a, b) => b.need - a.need);
  if (thin.length) A.push({ id: 'cover', h: 'next', title: 'Build pipeline where ' + nextQ + ' cover is thin', problem: thin.length + ' region and product cells are below ' + M.cfg.coverageNorm + 'x cover; largest: ' + thin.slice(0, 2).map((x) => x.p + ' in ' + x.r).join(' and '), decision: 'Set creation targets for those cells', owner: 'Regional vice presidents with marketing', due: due(60), metric: 'Next-quarter pipeline cover', kind: 'pipeline', modeled: sum(thin, (x) => x.need), basis: 'Pipeline to create to reach the cover norm. This is pipeline, not bookings.', observed: null, conf: 'Medium', deps: ['Marketing capacity', 'Partner leads'], go: ['tab', 'pipeline'], who: '' });
  const cn = tk('Competitive'); if (M.comp.openNamed.length) A.push({ id: 'counter', h: 'next', title: 'Counter rivals on ' + M.comp.openNamed.length + ' open deals', problem: 'The CRM names a rival on ' + M.comp.openNamed.length + ' open deals worth ' + sum(M.comp.openNamed, (o) => o.amount).toFixed(1) + 'M. A mention is not a loss', decision: 'Prepare a side-by-side and a customer reference for each', owner: 'Account executives with product marketing', due: due(45), metric: 'Win rate when a rival is named', kind: 'none', modeled: null, basis: 'Not quantified: exposure is shown, impact is not claimed', observed: 'Win rate with a rival named: ' + Math.round(M.comp.winRateNamed * 100) + '% against ' + Math.round(M.comp.winRateClear * 100) + '% without (descriptive only)', conf: 'Low', deps: ['Reference customers', 'Pricing guidance'], go: ['gosub-compete', 'map'], who: nm(cn) });
  const dAbove = openWin.filter((o) => +o.discount_pct > M.cfg.discountLimit * 100); if (dAbove.length) A.push({ id: 'price', h: 'next', title: 'Hold the discount line on ' + dAbove.length + ' open deals', problem: dAbove.length + ' open deals sit above the ' + Math.round(M.cfg.discountLimit * 100) + '% approval line', decision: 'Require a written reason above the line', owner: 'Deal desk', due: due(30), metric: 'Share of deals above the discount line', kind: 'none', modeled: null, basis: 'Not quantified', observed: null, conf: 'Medium', deps: [], go: ['tab', 'pricing'], who: '' });
  const weak = mx.industry.concat(mx.size).filter((g) => g.ret.status === 'warn' || g.ret.status === 'bad').sort((a, b) => b.ret.gap * b.ret.arr12 - a.ret.gap * a.ret.arr12)[0];
  if (weak) A.push({ id: 'retain', h: 'later', title: 'Lift retention in ' + weak.label, problem: weak.label + ' retains ' + (weak.ret.value * 100).toFixed(1) + '% against a ' + (weak.ret.nrrF * 100).toFixed(0) + '% forecast; ' + weak.ret.atRisk.toFixed(1) + 'M at risk across ' + weak.n + ' accounts', decision: 'Fund a retention program for the group: adoption, executive reviews, delivery', owner: 'Customer success leadership', due: due(120), metric: 'Net revenue retention of the group', kind: 'retention', modeled: Math.max(0, weak.ret.gap) * weak.ret.arr12, basis: 'Closing the gap to forecast. Overlaps the rescue plans, so do not add to them', additive: false, observed: null, conf: 'Low', deps: ['Customer success capacity'], go: ['focus', weak.lens, weak.label], who: '' });
  const cellsC = []; REG.forEach((r) => PRODUCTS.forEach((p) => { const f = (o) => o.account.region === r && o.product_line === p, ow = openWin.filter(f), amt = sum(ow, (o) => o.amount); if (ow.length >= 3) cellsC.push({ r, p, ex: sum(ow.filter(named), (o) => o.amount) / amt, lost: sum(lostC.filter(f), (o) => o.amount) }); })); cellsC.sort((a, b) => b.ex - a.ex);
  if (cellsC[0]) A.push({ id: 'respond', h: 'later', title: 'Plan a response in ' + cellsC[0].p + ', ' + cellsC[0].r, problem: Math.round(cellsC[0].ex * 100) + '% of open ' + cellsC[0].p + ' pipeline in ' + cellsC[0].r + ' names a rival; ' + cellsC[0].lost.toFixed(1) + 'M lost to rivals in four quarters', decision: 'Review price, package and route to market for that use case with product marketing', owner: 'Regional vice president with product marketing', due: due(120), metric: 'Competitive exposure of the cell', kind: 'none', modeled: null, basis: 'Not quantified: needs a win-loss review first', observed: null, conf: 'Low', deps: ['Win-loss interviews', 'Pricing review'], go: ['gosub-compete', 'respond'], who: '' });
  A.push({ id: 'lag', h: 'later', title: 'Shorten the forecast lag', problem: 'The weekly sales forecast only stays within ' + Math.round(band * 100) + '% of the result in week ' + Math.round(mean(fl.map((f) => f.avg))) + ' of 13 on average (synthetic history)', decision: 'Review the risk-adjusted forecast beside the sales forecast every week', owner: 'Revenue operations', due: due(90), metric: 'Weeks until the forecast settles', kind: 'none', modeled: null, basis: 'Leading indicator; no revenue claimed', observed: null, conf: 'Medium', deps: ['Weekly snapshots kept'], go: ['gosub-lab', 'lag'], who: '' });
  M.actions = A;
  M.horizons = { now: { label: 'Immediate', range: '0 to 30 days' }, next: { label: 'Medium term', range: '31 to 90 days' }, later: { label: 'Forward', range: '91 to 180 days' } };

  // ----- data quality: coverage and gaps -----
  const stale = openWin.filter((o) => o.stale >= sd), noSp = openWin.filter((o) => !+o.exec_sponsor), single = openWin.filter((o) => +o.contacts_engaged <= 1), pastDue = open.filter((o) => o.close_date < M.asOf);
  const noCall = accounts.filter((a) => !a.calls.some((c) => ZM.days(c.call_date, M.asOf) <= 90)), noExec = accounts.filter((a) => !a.contacts.some((c) => +c.is_executive));
  M.dq = { asOf: M.asOf, nowQuarter: curQ, snapshotDate: snaps.filter((s) => s.fiscal_quarter === curQ).map((s) => s.snapshot_date).sort().pop() || null, rows: [['Open deals with activity in the last ' + sd + ' days', openWin.length - stale.length, openWin.length], ['Open deals with an executive sponsor', openWin.length - noSp.length, openWin.length], ['Open deals with two or more contacts', openWin.length - single.length, openWin.length], ['Open deals with a close date still in the future', open.length - pastDue.length, open.length], ['Accounts with a recorded call in 90 days', accounts.length - noCall.length, accounts.length], ['Accounts with an executive-level contact on file', accounts.length - noExec.length, accounts.length]], gaps: [['Accounts with no recorded call in 90 days', noCall.map((a) => a.account_name)], ['Accounts with no executive-level contact', noExec.map((a) => a.account_name)], ['Open deals gone quiet', stale.slice(0, 6).map((o) => o.account.account_name + ' ' + o.product_line)]] };
  return M;
}

// finds the header row of a sheet that may carry a banner above it: the first row that holds every required column name
const findHeader = (aoa, need) => { for (let i = 0; i < Math.min(aoa.length, 12); i++) { const row = aoa[i].map((x) => String(x)); if (need.every((c) => row.includes(c))) return i; } return -1; };
return { LEVER_DEFS, DEF, leverVal, leverRows, prepare, enrich, IND_ORDER, SIZES, worst, findHeader };
});
