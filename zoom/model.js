// Pure model: turns the workbook tables into every figure the site shows. Used by the site and by the generator checks.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.ZM = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const DAY = 864e5;
const ms = (s) => Date.parse(s + 'T00:00:00Z');
const iso = (m) => new Date(m).toISOString().slice(0, 10);
const days = (a, b) => Math.round((ms(b) - ms(a)) / DAY);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sum = (a, f) => a.reduce((t, x) => t + (f ? f(x) : x), 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const REGIONS = ['Americas', 'EMEA', 'APAC'];
const PRODUCTS = ['Workplace', 'Phone', 'Contact Center', 'AI'];
const STAGE_BASE = { Discovery: 0.1, Validate: 0.25, Proposal: 0.45, Negotiation: 0.65, Contracting: 0.85 };
const STAGES = ['Discovery', 'Validate', 'Proposal', 'Negotiation', 'Contracting'];
const WS_WEIGHT = { Phone: 0.12, 'Contact Center': 0.2, AI: 0.06 };
const OWN_COL = { Workplace: 'owns_workplace', Phone: 'owns_phone', 'Contact Center': 'owns_contact_center', AI: 'owns_ai_addon' };
const INTENT_TOPIC = { Phone: 'Phone migration', 'Contact Center': 'Contact center', AI: 'AI Companion' };

// Zoom fiscal calendar: year ends January 31. Q1 Feb-Apr, Q2 May-Jul, Q3 Aug-Oct, Q4 Nov-Jan.
function fiscal(dateStr) {
  const y = +dateStr.slice(0, 4), m = +dateStr.slice(5, 7);
  const fy = m >= 2 ? y + 1 : y, q = Math.floor(((m - 2 + 12) % 12) / 3) + 1;
  return { fy, q, label: 'Q' + q + ' FY' + String(fy).slice(2) };
}
function quarterBounds(label) {
  const q = +label[1], fy = 2000 + +label.slice(-2), startYear = q === 4 ? fy - 1 : fy - 1 + 0;
  const startMonth = [2, 5, 8, 11][q - 1], year = q === 4 ? fy - 1 : fy - 1;
  // FY27 Q1 starts 2026-02-01 (calendar year = fy-1); Q4 starts 2026-11-01 (also fy-1) and ends 2027-01-31
  const s = Date.UTC(fy - 1, startMonth - 1, 1), e = Date.UTC(fy - 1, startMonth + 2, 0);
  return { start: iso(s), end: iso(e) };
}

function buildModel(T, cfg) {
  cfg = Object.assign({ asOf: '2026-10-17', coverageNorm: 3, healthCut: 55, staleDays: 14, discountLimit: 0.25, sponsorBonus: 0.07, noSponsorPenalty: 0.11, compPenalty: 0.05, pilotStart: '2026-07-20', overrides: {} }, cfg || {});
  const asOf = cfg.asOf;
  const A = (k) => (T.assumptions || []).find((r) => r.key === k);
  const asm = (k, d) => (A(k) ? +A(k).value : d);
  const curQ = fiscal(asOf).label, qb = quarterBounds(curQ);
  const qDays = days(qb.start, qb.end) + 1, qElapsed = days(qb.start, asOf) + 1, nextQ = 'Q4 FY' + curQ.slice(-2), nb = quarterBounds(nextQ);
  const fyStart = quarterBounds('Q1 FY' + curQ.slice(-2)).start, fyElapsed = days(fyStart, asOf) + 1;

  // ----- accounts and their cross-source context -----
  const users = T.sf_users.map((u) => Object.assign({}, u)), U = Object.fromEntries(users.map((u) => [u.user_id, u]));
  const graf = {}, gong = {}, proj = {}, ext = {}, cons = {};
  T.grafana_usage.forEach((r) => (graf[r.account_id] = graf[r.account_id] || []).push(r));
  T.gong_calls.forEach((r) => (gong[r.account_id] = gong[r.account_id] || []).push(r));
  T.monday_projects.forEach((r) => (proj[r.account_id] = proj[r.account_id] || []).push(r));
  T.external_signals.forEach((r) => (ext[r.account_id] = ext[r.account_id] || []).push(r));
  T.sf_contacts.forEach((r) => (cons[r.account_id] = cons[r.account_id] || []).push(r));
  Object.values(graf).forEach((a) => a.sort((x, y) => x.month.localeCompare(y.month)));

  const accounts = T.sf_accounts.map((a) => {
    const g = graf[a.account_id] || [], last = g[g.length - 1], prev = g[g.length - 4] || g[0];
    const act = last ? last.active_seats / Math.max(1, last.licensed_seats) : 0, actPrev = prev ? prev.active_seats / Math.max(1, prev.licensed_seats) : act;
    const trend = act - actPrev, p1 = last ? last.p1_incidents : 0;
    const usage = clamp(0.7 * clamp((100 * act) / 0.85, 0, 100) + 0.2 * clamp(50 + trend * 250, 0, 100) + 0.1 * clamp(100 - 40 * p1, 0, 100), 0, 100);
    const calls = (gong[a.account_id] || []).filter((c) => days(c.call_date, asOf) <= 90 && days(c.call_date, asOf) >= 0);
    const execShare = calls.length ? mean(calls.map((c) => +c.executive_present)) : 0, sent = calls.length ? mean(calls.map((c) => +c.sentiment)) : 0, nextShare = calls.length ? mean(calls.map((c) => +c.next_step_agreed)) : 0;
    const engagement = calls.length ? 40 * Math.min(1, execShare / 0.45) + 35 * clamp((sent + 0.2) / 0.9, 0, 1) + 25 * nextShare : 25;
    const ps = proj[a.account_id] || [], SC = { 'On track': 100, Done: 100, 'At risk': 55, Blocked: 20 };
    const late = (p) => (p.status !== 'Done' && days(p.target_go_live, asOf) > 0 ? days(p.target_go_live, asOf) : 0);
    const delivery = ps.length ? clamp(mean(ps.map((p) => SC[p.status])) - Math.min(30, 0.4 * mean(ps.map(late))), 0, 100) : 75;
    const nrrAcc = a.arr_current / Math.max(0.0001, a.arr_12m_ago), cShare = a.contraction_ttm / Math.max(0.0001, a.arr_12m_ago);
    const commercial = clamp(70 + 200 * (nrrAcc - 1) - 250 * cShare, 0, 100);
    const health = Math.round(0.35 * usage + 0.25 * engagement + 0.2 * delivery + 0.2 * commercial);
    const comps = new Set(); calls.forEach((c) => c.competitors_mentioned && c.competitors_mentioned.split(';').forEach((x) => x.trim() && comps.add(x.trim())));
    const topics = {}; calls.forEach((c) => c.topics && c.topics.split(';').forEach((t) => { t = t.trim(); if (t) topics[t] = (topics[t] || 0) + 1; }));
    const renewalDays = days(asOf, a.renewal_date);
    let risk = clamp(Math.pow(1 - health / 100, 1.4) * (renewalDays <= 180 ? 1 : 0.5) + (comps.size ? 0.05 : 0), 0, 0.95);
    const arrAtRisk = renewalDays <= 270 && health < cfg.healthCut + 5 ? a.arr_current * risk : 0;
    const unowned = PRODUCTS.filter((p) => p !== 'Workplace' && !+a[OWN_COL[p]]);
    const whitespace = sum(unowned, (p) => a.arr_current * WS_WEIGHT[p]);
    let nextProd = null, best = -1;
    unowned.forEach((p) => { const sc = (topics[INTENT_TOPIC[p]] || 0) * 10 + WS_WEIGHT[p] * 100; if (sc > best) { best = sc; nextProd = p; } });
    return Object.assign({}, a, {
      act, trend, usage: Math.round(usage), engagement: Math.round(engagement), delivery: Math.round(delivery), commercial: Math.round(commercial), health,
      calls90: calls.length, execShare, sent, nextShare, competitors: [...comps], topics, renewalDays, risk, arrAtRisk, whitespace, unowned, nextProd, nextProdIntent: nextProd ? topics[INTENT_TOPIC[nextProd]] || 0 : 0,
      projects: ps, lastGraf: last, incidents: g.reduce((t, r) => t + r.p1_incidents, 0), nrr: nrrAcc, owner: U[a.owner_id], csm: U[a.csm_id],
      products: PRODUCTS.filter((p) => +a[OWN_COL[p]]), signals: (ext[a.account_id] || []).slice().sort((x, y) => y.published_date.localeCompare(x.published_date)), contacts: cons[a.account_id] || [], calls: (gong[a.account_id] || []).slice().sort((x, y) => y.call_date.localeCompare(x.call_date)),
    });
  });
  const acc = Object.fromEntries(accounts.map((a) => [a.account_id, a]));

  // ----- opportunities -----
  function aiProbOf(o) {
    if (o.stage === 'Closed Won') return 1; if (o.stage === 'Closed Lost') return 0;
    const a = acc[o.account_id];
    let p = STAGE_BASE[o.stage] + 0.05 * (o.contacts_engaged - 2.5) + (+o.exec_sponsor ? cfg.sponsorBonus : -cfg.noSponsorPenalty) - Math.min(0.24, days(o.last_activity_date, asOf) * 0.009) - (o.competitor && o.competitor !== 'None' ? cfg.compPenalty : 0) + (+o.databook_guided ? 0.03 : 0);
    if (a) { if (a.health >= 75) p += 0.04; else if (a.health < 50) p -= 0.07; if (a.delivery < 50) p -= 0.05; }
    if (o.type === 'Renewal uplift' && a) p += (a.health - 60) / 100 * 0.3;
    return clamp(p, 0.04, 0.96);
  }
  const opps = T.sf_opportunities.map((o) => {
    const open = o.stage !== 'Closed Won' && o.stage !== 'Closed Lost';
    const ai = aiProbOf(o), ov = cfg.overrides[o.opp_id];
    const row = Object.assign({}, o, { isOpen: open, fq: fiscal(o.close_date).label, ai, rep: +o.rep_probability, stale: days(o.last_activity_date, asOf), won: o.stage === 'Closed Won', lost: o.stage === 'Closed Lost' });
    row.amount = +o.amount_arr; row.exposureRaw = open ? Math.max(0, row.amount * row.rep - row.amount * ai) : 0; row.aiCall = open ? row.amount * (ov ? ov.prob : ai) : 0; row.repCall = open ? row.amount * row.rep : 0; row.exposure = open ? Math.max(0, row.repCall - row.aiCall) : 0;
    row.override = ov || null; row.account = acc[o.account_id]; row.ownerUser = U[o.owner_id]; row.cycle = days(o.created_date, o.close_date);
    return row;
  });
  const open = opps.filter((o) => o.isOpen), closed = opps.filter((o) => !o.isOpen);
  const flags = (o) => { const f = []; if (!+o.exec_sponsor) f.push(['No executive sponsor', 'bad']); if (o.stale >= cfg.staleDays) f.push(['No activity for ' + o.stale + ' days', 'bad']); if (+o.contacts_engaged <= 1) f.push(['Only one contact engaged', 'warn']); if (o.competitor !== 'None') f.push([o.competitor + ' in the deal', 'warn']); if (o.account && o.account.delivery < 50) f.push(['Onboarding behind at account', 'warn']); if (o.account && o.account.health < cfg.healthCut) f.push(['Account health ' + o.account.health, 'warn']); if (+o.discount_pct > cfg.discountLimit * 100) f.push(['Discount ' + o.discount_pct + '% over limit', 'warn']); if (+o.databook_guided) f.push(['Guided plan active', 'ai']); return f; };
  open.forEach((o) => (o.flags = flags(o)));
  const fixed = (o) => aiProbOf(Object.assign({}, o, { exec_sponsor: 1, last_activity_date: asOf, contacts_engaged: Math.max(3, +o.contacts_engaged) }));
  open.forEach((o) => (o.recov = o.amount * Math.max(0, fixed(o) - o.ai)));

  // ----- plan, quarter and year -----
  const plan = {}; T.targets.forEach((t) => { const k = t.fiscal_quarter + '|' + t.region + '|' + t.product_line; plan[k] = (plan[k] || 0) + +t.plan_arr; });
  const planOf = (q, r, p) => sum(T.targets.filter((t) => t.fiscal_quarter === q && (!r || t.region === r) && (!p || t.product_line === p)), (t) => +t.plan_arr);
  const inQ = (o, q) => o.fq === q;
  const regionCell = (q, r) => {
    const pl = planOf(q, r), won = sum(closed.filter((o) => o.won && inQ(o, q) && (!r || o.account.region === r)), (o) => o.amount);
    const oq = open.filter((o) => (!r || o.account.region === r));
    return { plan: pl, won, openQ: oq.filter((o) => inQ(o, q)) };
  };
  const rows = REGIONS.map((r) => {
    const c3 = regionCell(curQ, r), c4 = regionCell(nextQ, r);
    const q3ai = sum(c3.openQ, (o) => o.aiCall), q3rep = sum(c3.openQ, (o) => o.repCall), q4ai = sum(c4.openQ, (o) => o.aiCall), q4rep = sum(c4.openQ, (o) => o.repCall);
    const q3gap = Math.max(0.0001, c3.plan - c3.won);
    return { region: r, q3plan: c3.plan, q3won: c3.won, q3openAmt: sum(c3.openQ, (o) => o.amount), q3ai, q3rep, q3fc: c3.won + q3ai, q3repfc: c3.won + q3rep, q3att: (c3.won + q3ai) / c3.plan, q3cov: sum(c3.openQ, (o) => o.amount) / q3gap, q4plan: c4.plan, q4openAmt: sum(c4.openQ, (o) => o.amount), q4ai, q4rep, q4cov: sum(c4.openQ, (o) => o.amount) / Math.max(0.0001, c4.plan), q4n: c4.openQ.length };
  });
  const tot = (k) => sum(rows, (r) => r[k]);
  const q4Create = asm('q4_in_quarter_creation_share', 0.2) * tot('q4plan');
  const fyPlan = sum(['Q1', 'Q2', 'Q3', 'Q4'], (q) => planOf(q + ' FY' + curQ.slice(-2)));
  const ytdWon = sum(closed.filter((o) => o.won && o.close_date >= fyStart), (o) => o.amount);
  const fy = { plan: fyPlan, ytdWon, q3ai: tot('q3ai'), q4ai: tot('q4ai'), q4Create, knownLanding: ytdWon + tot('q3ai') + tot('q4ai'), landing: ytdWon + tot('q3ai') + tot('q4ai') + q4Create };
  const cur = { q: curQ, plan: tot('q3plan'), won: tot('q3won'), ai: tot('q3ai'), rep: tot('q3rep'), fc: tot('q3fc'), repfc: tot('q3repfc'), daysLeft: qDays - qElapsed, elapsed: qElapsed, qDays, openAmt: tot('q3openAmt'), q4plan: tot('q4plan'), q4openAmt: tot('q4openAmt'), q4ai: tot('q4ai'), q4rep: tot('q4rep'), q4cov: tot('q4openAmt') / Math.max(0.0001, tot('q4plan')) };
  cur.att = cur.fc / cur.plan; cur.repAtt = cur.repfc / cur.plan;

  // plan by product line for current quarter
  const byProduct = PRODUCTS.map((p) => {
    const pl = planOf(curQ, null, p), won = sum(closed.filter((o) => o.won && inQ(o, curQ) && o.product_line === p), (o) => o.amount), ai = sum(open.filter((o) => inQ(o, curQ) && o.product_line === p), (o) => o.aiCall);
    return { product: p, plan: pl, won, ai, fc: won + ai, att: (won + ai) / Math.max(0.0001, pl), q4pipe: sum(open.filter((o) => inQ(o, nextQ) && o.product_line === p), (o) => o.amount), q4ai: sum(open.filter((o) => inQ(o, nextQ) && o.product_line === p), (o) => o.aiCall) };
  });

  // ----- history: commit vs actual -----
  const hist = T.sf_history.map((h) => Object.assign({}, h, { actualCalc: sum(closed.filter((o) => o.won && o.fq === h.quarter && o.account.region === h.region), (o) => o.amount) }));
  const qList = [...new Set(T.sf_history.map((h) => h.quarter))];
  const histQ = qList.map((q) => { const hs = hist.filter((h) => h.quarter === q); return { quarter: q, plan: sum(hs, (h) => +h.plan), commit: sum(hs, (h) => +h.commit), actual: sum(hs, (h) => +h.actual), miss: sum(hs, (h) => +h.actual) / sum(hs, (h) => +h.commit) - 1 }; });

  // ----- retention -----
  const arrNow = sum(accounts, (a) => a.arr_current), arr12 = sum(accounts, (a) => a.arr_12m_ago), contr = sum(accounts, (a) => a.contraction_ttm);
  const book = { arr: arrNow, arr12, nrr: arrNow / arr12, grr: 1 - contr / arr12, atRisk: sum(accounts, (a) => a.arrAtRisk), whitespace: sum(accounts, (a) => a.whitespace), renewing180: sum(accounts.filter((a) => a.renewalDays <= 180), (a) => a.arr_current), atRiskCount: accounts.filter((a) => a.health < cfg.healthCut).length };

  // ----- sellers -----
  const aeRows = users.filter((u) => u.role === 'Account Executive').map((u) => {
    const mine = opps.filter((o) => o.owner_id === u.user_id), recent = mine.filter((o) => days(o.created_date, asOf) <= 270);
    const ytd = sum(mine.filter((o) => o.won && o.close_date >= fyStart), (o) => o.amount), quota = +u.quota_fy27_arr, pace = ytd / Math.max(0.0001, quota * (fyElapsed / 365));
    const op = mine.filter((o) => o.isOpen), q4pipe = sum(op.filter((o) => o.fq === nextQ || o.fq === curQ), (o) => o.amount);
    const exec = recent.length ? mean(recent.map((o) => +o.exec_sponsor)) : 0, thread = recent.length ? mean(recent.map((o) => (+o.contacts_engaged >= 3 ? 1 : 0))) : 0;
    const calls = T.gong_calls.filter((c) => c.rep_id === u.user_id), next = calls.length ? mean(calls.map((c) => +c.next_step_agreed)) : 0, rec = op.length ? mean(op.map((o) => (o.stale <= 7 ? 1 : 0))) : 0;
    const maturity = Math.round(100 * (0.4 * Math.min(1, exec / 0.6) + 0.25 * Math.min(1, thread / 0.6) + 0.2 * next + 0.15 * rec));
    const qLeft = quota * ((curQ === 'Q4 FY27' ? 0.28 : 0.27));
    const covQ = sum(op.filter((o) => o.fq === nextQ), (o) => o.amount) / Math.max(0.0001, quota * 0.3);
    const fl = []; if (covQ < cfg.coverageNorm - 0.5) fl.push('Pipeline cover ' + covQ.toFixed(1) + 'x'); if (maturity < 55) fl.push('Discovery and number of contacts'); const noExec = op.filter((o) => !+o.exec_sponsor && (o.fq === curQ || o.fq === nextQ)).length; if (noExec >= 3) fl.push('Executive access (' + noExec + ' deals)'); const stl = op.filter((o) => o.forecast_category === 'Commit' && o.stale >= cfg.staleDays).length; if (stl) fl.push('Stalled commit deals (' + stl + ')');
    return Object.assign({}, u, { ytd, quota, pace, maturity, cov: covQ, fc: sum(op.filter((o) => o.fq === curQ), (o) => o.aiCall), flags: fl, execShare: exec, threadShare: thread, nOpen: op.length, tenureMonths: Math.round(days(u.hire_date, asOf) / 30.4) });
  });
  const atPace = aeRows.filter((r) => r.pace >= 1).length;

  // ----- pilot vs control -----
  const wil = (w, n) => { if (!n) return [0, 0]; const z = 1.96, p = w / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), s = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n)); return [Math.max(0, (c - s) / d), Math.min(1, (c + s) / d)]; };
  const since = closed.filter((o) => o.close_date >= cfg.pilotStart);
  const stat = (arr) => { const wins = arr.filter((o) => o.won), n = arr.length; return { n, wins: wins.length, win: n ? wins.length / n : 0, ci: wil(wins.length, n), exec: n ? mean(arr.map((o) => +o.exec_sponsor)) : 0, thread: n ? mean(arr.map((o) => +o.contacts_engaged)) : 0, acv: wins.length ? mean(wins.map((o) => o.amount)) : 0, cycle: wins.length ? mean(wins.map((o) => o.cycle)) : 0 }; };
  const pilot = stat(since.filter((o) => +o.databook_guided)), control = stat(since.filter((o) => !+U[o.owner_id].pilot_flag)), before = stat(closed.filter((o) => o.close_date < cfg.pilotStart && +U[o.owner_id].pilot_flag));
  const cohort = { pilot, control, before, openGuidedExec: mean(open.filter((o) => +o.databook_guided).map((o) => +o.exec_sponsor)), openControlExec: mean(open.filter((o) => !+U[o.owner_id].pilot_flag).map((o) => +o.exec_sponsor)) };

  // ----- tasks (rule-based, from the cross-source facts) -----
  const tasks = [];
  const due = (n) => iso(ms(asOf) + n * DAY);
  open.filter((o) => (o.fq === curQ || o.fq === nextQ) && o.forecast_category !== 'Pipeline').forEach((o) => {
    const a = o.account;
    if (!+o.exec_sponsor && o.forecast_category !== 'Pipeline') { const imp = o.amount * (aiProbOf(Object.assign({}, o, { exec_sponsor: 1 })) - o.ai); tasks.push({ type: 'Executive sponsor', title: 'Secure an executive sponsor for ' + a.account_name + ' ' + o.product_line, account_id: a.account_id, opp_id: o.opp_id, owner_id: o.owner_id, due: due(5), impact: imp, why: ['No customer executive sponsors this ' + o.stage.toLowerCase() + ' deal (Salesforce)', a.execShare < 0.2 ? 'Executives joined ' + Math.round(a.execShare * 100) + '% of recent calls (Gong)' : 'Executive present on ' + Math.round(a.execShare * 100) + '% of calls (Gong)'], sources: ['sf_opportunities', 'gong_calls'] });
    }
    if (o.stale >= cfg.staleDays && o.forecast_category === 'Commit') tasks.push({ type: 'Stalled deal', title: 'Re-engage ' + a.account_name + ' on ' + o.product_line + ' (' + o.stale + ' days quiet)', account_id: a.account_id, opp_id: o.opp_id, owner_id: o.owner_id, due: due(3), impact: o.amount * (aiProbOf(Object.assign({}, o, { last_activity_date: asOf })) - o.ai), why: ['Committed deal with no logged activity for ' + o.stale + ' days (Salesforce)', 'Close date ' + o.close_date], sources: ['sf_opportunities'] });
    if (o.competitor !== 'None' && a.competitors.includes(o.competitor)) tasks.push({ type: 'Competitive', title: 'Counter ' + o.competitor + ' at ' + a.account_name, account_id: a.account_id, opp_id: o.opp_id, owner_id: o.owner_id, due: due(7), impact: o.amount * 0.05, why: [o.competitor + ' named on the deal (Salesforce) and on recent calls (Gong)'], sources: ['sf_opportunities', 'gong_calls'] });
  });
  accounts.forEach((a) => {
    if (a.health < cfg.healthCut && a.renewalDays <= 180) tasks.push({ type: 'Renewal rescue', title: 'Rescue the ' + a.account_name + ' renewal (' + a.renewalDays + ' days)', account_id: a.account_id, owner_id: a.owner_id, due: due(7), impact: a.arrAtRisk, why: ['Health ' + a.health + ': usage ' + a.usage + ', engagement ' + a.engagement + ', delivery ' + a.delivery, 'Seat activation ' + Math.round(a.act * 100) + '% (Grafana)', 'Renewal ' + a.renewal_date + ' (Salesforce)'], sources: ['sf_accounts', 'grafana_usage', 'gong_calls', 'monday_projects'] });
    const late = a.projects.filter((p) => p.status === 'Blocked' || p.status === 'At risk');
    const linked = open.filter((o) => o.account_id === a.account_id && late.some((p) => p.product === o.product_line || true));
    if (late.length && linked.length) tasks.push({ type: 'Unblock delivery', title: 'Unblock ' + late[0].product + ' at ' + a.account_name, account_id: a.account_id, owner_id: late[0].project_owner, due: due(6), impact: sum(linked, (o) => o.amount) * 0.1, why: [late[0].product + ' project ' + late[0].status.toLowerCase() + (late[0].blocker ? ': ' + late[0].blocker : '') + ' (monday.com)', linked.length + ' open deal(s) at the account depend on a good delivery record (Salesforce)'], sources: ['monday_projects', 'sf_opportunities'] });
    if (a.health >= 70 && a.nextProd && a.whitespace > 1.5) tasks.push({ type: 'Expansion', title: 'Open the ' + a.nextProd + ' conversation at ' + a.account_name, account_id: a.account_id, owner_id: a.owner_id, due: due(10), impact: a.arr_current * WS_WEIGHT[a.nextProd] * 0.25, why: ['Health ' + a.health + ' and ' + a.nextProd + ' not yet owned (Salesforce)', a.nextProdIntent ? a.nextProd + ' came up on ' + a.nextProdIntent + ' recent call(s) (Gong)' : 'Largest unowned product by value'], sources: ['sf_accounts', 'gong_calls'] });
  });
  tasks.sort((x, y) => y.impact - x.impact); tasks.forEach((t, i) => (t.id = 'T-' + String(i + 1).padStart(3, '0')));

  return { cfg, asOf, curQ, nextQ, qb, nb, fyStart, fyElapsed, accounts, acc, users, U, opps, open, closed, plan, planOf, rows, cur, fy, byProduct, hist, histQ, book, aeRows, atPace, cohort, tasks, regions: REGIONS, products: PRODUCTS, stages: STAGES, fiscal, quarterBounds, aiProbOf, fixedProb: fixed };
}

return { buildModel, fiscal, quarterBounds, days, ms, iso, REGIONS, PRODUCTS, STAGES, STAGE_BASE, WS_WEIGHT, OWN_COL, clamp, sum, mean };
});
