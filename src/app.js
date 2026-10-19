(function () {
'use strict';
const D = window.DATA;
const A = Object.fromEntries(D.accounts.map((a) => [a.id, a]));
const SL = Object.fromEntries(D.sellers.map((s) => [s.id, s]));
const SEG = Object.fromEntries(D.segments.map((s) => [s.id, s]));
const SEG_COLOR = { EDS: 'var(--s-eds)', CTS: 'var(--s-cts)', OIS: 'var(--s-ois)', WH: 'var(--s-wh)' };
const TYPE_COLOR = { DSO: 'var(--s-eds)', Distributor: 'var(--s-wh)', Education: 'var(--s-ois)', 'Lab network': 'var(--s-cts)', 'Health system': 'var(--ink-3)' };
const TABS = [['overview', 'Overview'], ['pipeline', 'Pipeline & forecast'], ['accounts', 'Accounts'], ['sellers', 'Sellers'], ['plan', 'AI transformation plan']];
const CATS = ['Commit', 'Best case', 'Pipeline'];

// ---------- formatting ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (x, d = 1) => (x < 0 ? '-' : '') + '$' + nf(Math.abs(x), d) + 'M';
const fmS = (x, d = 1) => (x >= 0 ? '+' : '-') + '$' + nf(Math.abs(x), d) + 'M';
const fb = (x) => '$' + nf(x / 1000, 2) + 'B';
const pc = (x, d = 0) => nf(x * 100, d) + '%';
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
const dateFmt = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const tone = (v, good, ok) => (v >= good ? 'ok' : v >= ok ? 'warn' : 'bad');
const toneColor = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' };

// ---------- state ----------
const S = { allDeals: false, tab: 'overview', region: 'All', drawer: null, copilot: false, brief: false, msgs: [], sort: { deals: ['exposure', -1], accounts: ['whitespace', -1], sellers: ['attain', -1] }, preset: 'base', adopt: 70, winUp: 12, acvUp: 8 };
const PRESETS = { conservative: [6, 3], base: [12, 8], stretch: [20, 15] };
try { const h = location.hash.replace('#', ''); if (TABS.some((t) => t[0] === h)) S.tab = h; } catch (e) {}

// ---------- model ----------
function aiP(d) {
  const base = D.stages.find((s) => s.id === d.stage).p;
  const p = base + 0.05 * (d.threads - 2.5) + (d.execSponsor ? 0.07 : -0.11) - Math.min(0.24, d.staleDays * 0.009) + (d.guided ? 0.04 : 0) - (d.competitor ? 0.05 : 0) - (d.budgetShift ? 0.06 : 0);
  return Math.max(0.04, Math.min(0.96, p));
}
D.deals.forEach((d) => {
  d.exposure = d.q4rev * Math.max(0, d.repProb - d.aiProb);
  const fixed = Object.assign({}, d, { execSponsor: true, staleDays: 0, threads: Math.max(d.threads, 3) });
  d.recov = d.q4rev * Math.max(0, aiP(fixed) - aiP(d));
  d.inQ = d.daysToClose <= 75;
});
const inReg = (x) => S.region === 'All' || x.region === S.region;

function summary() {
  const mx = D.matrix.filter(inReg), ds = D.deals.filter(inReg);
  const target = sum(mx, (m) => m.target), base = sum(mx, (m) => m.base);
  const cat = {};
  CATS.forEach((c) => { const x = ds.filter((d) => d.category === c); cat[c] = { n: x.length, tcv: sum(x, (d) => d.amount), q4: sum(x, (d) => d.q4rev), rep: sum(x, (d) => d.q4rev * d.repProb), ai: sum(x, (d) => d.q4rev * d.aiProb) }; });
  const wAI = sum(CATS, (c) => cat[c].ai), wRep = sum(CATS, (c) => cat[c].rep);
  const q4F = base + wAI, repF = base + wRep, gap = target - base;
  const cover = sum(ds.filter((d) => d.inQ), (d) => d.amount) / Math.max(gap, 1);
  const share = target / D.meta.q4Plan;
  const ytd = D.meta.ytd * share, ytdPlan = D.meta.ytdPlan * share;
  const segs = D.segments.map((sg) => {
    const m = mx.filter((x) => x.segment === sg.id), x = ds.filter((d) => d.segment === sg.id);
    const t = sum(m, (r) => r.target), b = sum(m, (r) => r.base), c = {};
    CATS.forEach((k) => (c[k] = sum(x.filter((d) => d.category === k), (d) => d.q4rev * d.aiProb)));
    const f = b + c.Commit + c['Best case'] + c.Pipeline;
    const cov = sum(x.filter((d) => d.inQ), (d) => d.amount) / Math.max(t - b, 1);
    return { id: sg.id, name: sg.name, short: sg.short, target: t, base: b, c, F: f, att: t ? f / t : 0, cov, n: x.length, rep: b + sum(x, (d) => d.q4rev * d.repProb) };
  }).filter((s) => s.target > 0);
  return { mx, ds, target, base, cat, wAI, wRep, q4F, repF, gap, cover, ytd, ytdPlan, fy: ytd + q4F, fyPlan: ytdPlan + target, att: q4F / target, segs, recov: 0.5 * sum(ds, (d) => d.recov) };
}
function dealReasons(d) {
  const r = [];
  if (!d.execSponsor) r.push(['No executive sponsor engaged', 'bad']);
  if (d.staleDays >= 14) r.push(['No activity for ' + d.staleDays + ' days', 'bad']);
  if (d.threads <= 1) r.push(['Single-threaded', 'warn']);
  if (d.competitor) r.push(['Competitor in evaluation', 'warn']);
  if (d.budgetShift) r.push(['Budget timing shift flagged', 'warn']);
  if (d.execSponsor && d.threads >= 3 && d.staleDays < 10) r.push(['Sponsor engaged, multi-threaded', 'ok']);
  if (d.guided) r.push(['Guided plan active', 'ai']);
  return r;
}
function dealNBA(d) {
  const a = A[d.accountId];
  const cx = (a.committee.find((c) => c.role === 'Economic buyer') || a.committee[0]);
  if (!d.execSponsor) return 'Book an executive meeting with ' + cx.title + ' using the account executive brief; offer a peer reference.';
  if (d.staleDays >= 14) return 'Re-engage the champion this week with an updated ROI case and a dated close plan.';
  if (d.threads <= 1) return 'Add procurement and a clinical lead to the thread before the next stage gate.';
  if (d.competitor) return 'Counter the competing bid with a total-cost view and a reference from a similar group.';
  if (d.budgetShift) return 'Re-confirm budget timing; propose a phased or financed structure.';
  return 'Lock a mutual close plan and legal timeline; keep sponsor cadence weekly.';
}
function acctNBA(a) {
  if (a.type === 'Distributor') return a.inventoryWeeks > 9 ? 'Agree a sell-through plan before quarter-end buying; inventory at ' + a.inventoryWeeks + ' weeks.' : 'Co-plan DSO national account pursuits and promotion cadence.';
  if (a.health < 55) return 'Run a save plan: executive check-in plus an adoption sprint on the weakest sites.';
  if (a.whitespace > 12) return 'Expansion play: ' + lc1(a.play) + '.';
  return 'Maintain cadence; review adoption and open signals at next QBR.';
}
function sellerRows() {
  return D.sellers.filter(inReg).map((s) => {
    const mine = D.deals.filter((d) => d.ownerId === s.id);
    const f = sum(mine, (d) => d.q4rev * d.aiProb), pipe = sum(mine.filter((d) => d.inQ), (d) => d.amount);
    const noExec = mine.filter((d) => !d.execSponsor && d.inQ).length, stale = mine.filter((d) => d.category === 'Commit' && d.staleDays >= 14).length;
    const cov = pipe / Math.max(s.q4Quota, 1), flags = [];
    if (cov < 2.5) flags.push('Pipeline coverage ' + nf(cov, 1) + 'x');
    if (s.maturity < 60) flags.push('Discovery depth');
    if (noExec >= 2) flags.push('Executive access (' + noExec + ' deals)');
    if (stale >= 1) flags.push('Stalled commit deals (' + stale + ')');
    return Object.assign({}, s, { f, pipe, cov, attain: s.attainYTD / 100, flags, deals: mine.length, q4att: f / s.q4Quota });
  });
}
function cohorts() {
  const c = D.closed, stat = (x) => { const w = x.filter((r) => r.won); return { n: x.length, wins: w.length, win: w.length / x.length, acv: sum(w, (r) => r.amount) / Math.max(1, w.length), cyc: sum(w, (r) => r.cycleDays) / Math.max(1, w.length) }; };
  const pilot = stat(c.filter((r) => r.guided)), ctrl = stat(c.filter((r) => r.after && !r.guided)), pre = stat(c.filter((r) => !r.after && SL[r.ownerId].pilot));
  const ps = D.sellers.filter((s) => s.pilot), cs = D.sellers.filter((s) => !s.pilot);
  return { pilot, ctrl, pre, hrsP: sum(ps, (s) => s.planHours) / ps.length, hrsC: sum(cs, (s) => s.planHours) / cs.length, matP: sum(ps, (s) => s.maturity - s.maturityPrev) / ps.length, matC: sum(cs, (s) => s.maturity - s.maturityPrev) / cs.length, adopt: sum(ps, (s) => s.adoption) / ps.length, ttmWon: sum(c.filter((r) => r.won), (r) => r.amount) };
}
const COH = cohorts();

// ---------- UI atoms ----------
const ucf = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const lc1 = (x) => x.charAt(0).toLowerCase() + x.slice(1);
const pill = (t, k) => '<span class="pill ' + k + '">' + esc(t) + '</span>';
const chip = (t, lic) => '<span class="chip' + (lic ? ' lic' : '') + '">' + esc(t) + '</span>';
const delta = (v, d = 1, inv) => '<span class="delta ' + ((inv ? -v : v) >= 0 ? 'up' : 'down') + '">' + (v >= 0 ? '▲ ' : '▼ ') + fm(Math.abs(v), d) + '</span>';
const healthBar = (h) => { const t = tone(h, 70, 55); return '<div class="bar-cell"><span class="num" style="min-width:24px">' + h + '</span><div class="mini"><i style="width:' + h + '%;background:' + toneColor[t] + '"></i></div></div>'; };
const kpi = (l, v, s, cls) => '<div class="kpi ' + (cls || '') + '"><div class="lbl">' + l + '</div><div class="val">' + v + '</div><div class="sub">' + s + '</div></div>';
const sortArrow = (tbl, k) => (S.sort[tbl][0] === k ? '<span class="arrow">' + (S.sort[tbl][1] < 0 ? '▼' : '▲') + '</span>' : '');
const th = (tbl, k, label, cls) => '<th class="sortable ' + (cls || '') + '" data-act="sort" data-tbl="' + tbl + '" data-k="' + k + '">' + label + sortArrow(tbl, k) + '</th>';
const sortRows = (rows, tbl, getters) => { const [k, dir] = S.sort[tbl]; const g = getters[k]; return rows.slice().sort((a, b) => { const x = g(a), y = g(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; }); };
const aiTitle = (t) => '<h3><span class="diamond"></span>' + t + '</h3>';

// ---------- AI briefing (computed from the rows) ----------
function briefing(s) {
  const items = [];
  const risky = s.ds.filter((d) => d.category === 'Commit').sort((a, b) => b.exposure - a.exposure);
  const overcall = s.repF - s.q4F;
  items.push({ amt: '-' + fm(overcall, 0), t: 'The rep forecast is ahead of the signals', d: 'Reps call Q4 at ' + fm(s.repF, 0) + '. Deal signals support ' + fm(s.q4F, 0) + '. The three most exposed commit deals account for ' + fm(sum(risky.slice(0, 3), (d) => d.exposure), 0) + ' of that gap: missing executive sponsors, stalled threads, single-threaded buying groups.', src: [['1P · CRM activity'], ['1P · call transcripts'], ['Databook routing engine', 1]], go: ['pipeline'], cta: 'Review commit deals' });
  const top = s.ds.slice().sort((a, b) => b.exposure - a.exposure)[0];
  if (top) { const a = A[top.accountId]; items.push({ amt: fm(top.exposure, 1), t: top.name + ' at ' + a.name, d: ucf(dealReasons(top).filter((r) => r[1] === 'bad' || r[1] === 'warn').map((r) => r[0].toLowerCase()).join(', ')) + '. ' + dealNBA(top), src: [['1P · CRM activity'], ['Licensed · executive moves', 1]], go: ['acct', a.id], cta: 'Open account brief' }); }
  const worst = s.mx.map((m) => { const seg = s.ds.filter((d) => d.segment === m.segment && d.region === m.region); const w = sum(seg, (d) => d.q4rev * d.aiProb); return { m, att: (m.base + w) / m.target, short: m.target - m.base - w }; }).sort((a, b) => a.att - b.att)[0];
  if (worst) items.push({ amt: '-' + fm(worst.m.target * (1 - worst.att), 0), t: SEG[worst.m.segment].short + ' in ' + worst.m.region + ' is the largest gap', d: 'Forecast sits at ' + pc(worst.att) + ' of plan. Americas implant and orthodontic volumes remain soft while the sales team and distributor roster are realigned; the plan needs earlier executive access on the strategic DSO deals.', src: [['Licensed · earnings & investor materials', 1], ['1P · CRM pipeline']], go: ['pipeline'], cta: 'See pipeline by segment' });
  const exp = D.accounts.filter(inReg);
  const best = exp.filter((a) => a.type !== 'Distributor' && a.health >= 60).sort((a, b) => b.whitespace * b.expansion - a.whitespace * a.expansion)[0];
  if (best) items.push({ amt: '+' + fm(best.whitespace, 0), t: 'Expansion: ' + best.name, d: 'Health ' + best.health + ' with ' + fm(best.whitespace, 1) + ' of whitespace across ' + D.families.filter((f) => best.owns[f.id] === 0).length + ' product families. Recommended play: ' + lc1(best.play) + '.', src: [['Licensed · news & filings', 1], ['1P · product telemetry']], go: ['acct', best.id], cta: 'Open account brief' });
  const stuff = D.accounts.filter((a) => a.type === 'Distributor' && inReg(a) && a.inventoryWeeks > 9);
  if (stuff.length) items.push({ amt: stuff.length + ' flags', t: 'Channel check: distributor inventory above 9 weeks', d: stuff.map((a) => a.name).join(', ') + '. Quarter-end sell-in at these partners risks pulling forward demand from next quarter.', src: [['1P · sell-through feed'], ['Databook routing engine', 1]], go: ['tab', 'accounts'], cta: 'View distributors' });
  return items;
}

// ---------- views ----------
function viewOverview() {
  const s = summary(), items = briefing(s), fyGap = s.fy - s.fyPlan;
  const lo = D.meta.guidance[0], hi = D.meta.guidance[1];
  const fyAll = S.region === 'All';
  return '<div class="sec-title"><span class="kicker">Q4 FY26 · day ' + D.meta.quarterDay + ' of ' + D.meta.quarterDays + '</span><h2>Where we land, and what moves it</h2><p>' + (fyAll ? 'The AI-adjusted forecast is built from deal signals, not rep calls. ' : 'Showing ' + S.region + '. Year-to-date figures are allocated by share of Q4 plan. ') + 'Every figure traces to the pipeline, account and seller tables in the other tabs.</p></div>' +
    '<div class="kpis hero4">' +
    kpi('FY26 forecast landing', fb(s.fy), delta(fyGap, 0) + ' vs plan ' + fb(s.fyPlan) + (fyAll ? ' · guidance ' + fb(lo) + '-' + fb(hi) : ''), 'hero') +
    kpi('Q4 forecast (AI-adjusted)', fm(s.q4F, 0), pc(s.att, 1) + ' of ' + fm(s.target, 0) + ' plan') +
    kpi('Rep call vs AI', delta(s.repF - s.q4F, 0), 'Reps call ' + fm(s.repF, 0)) +
    kpi('Pipeline coverage', nf(s.cover, 1) + 'x', 'of Q4 gap · norm 3.0x') +
    kpi('Recoverable in quarter', fm(s.recov, 0), 'if half of flagged deals are fixed') +
    '</div>' +
    '<div class="grid g-main">' +
    '<div class="brief">' + aiTitle('Databook briefing for the CRO') + '<ol>' + items.map((it, i) => '<li><div class="amt">' + esc(it.amt) + '</div><div class="t">' + esc(it.t) + '</div><div class="d">' + esc(it.d) + '</div><div class="row"><div class="chips">' + it.src.map((x) => chip(x[0], x[1])).join('') + '</div><button class="linkbtn" data-act="go" data-go="' + it.go.join('|') + '">' + esc(it.cta) + '</button></div></li>').join('') + '</ol></div>' +
    '<div class="card"><div class="hd"><h3>Q4 build to plan</h3><span class="meta">$M · AI-weighted</span></div><div class="chart" data-chart="waterfall"></div></div>' +
    '</div>' +
    '<div class="card"><div class="hd"><h3>Segment attainment</h3><div class="legend"><span><i style="background:var(--ink-3)"></i>Run-rate base</span><span><i style="background:var(--blue)"></i>Commit</span><span><i style="background:var(--s-cts)"></i>Best case</span><span><i style="background:var(--s-wh)"></i>Pipeline</span><span><i style="background:var(--ink);width:3px;height:12px;border-radius:0"></i>Plan</span></div></div>' + s.segs.map((g) => segRow(g)).join('') + '</div>' +
    '<div class="grid g2"><div class="card"><div class="hd"><h3>Quarterly net sales</h3><span class="meta">$M · illustrative · black bar = Q4 plan</span></div><div class="chart" data-chart="quarters"></div></div>' +
    '<div class="card"><div class="hd"><h3>FY landing: week-over-week</h3><span class="meta">' + (fyAll ? '$M · AI-adjusted' : 'Global view only') + '</span></div>' + (fyAll ? '<div class="chart" data-chart="fchist"></div><p class="note" style="margin-top:10px">Landing has eroded ' + fm(D.forecastHistory[0].v - s.fy, 0) + ' in six weeks, mostly from commit deals that stalled after stage three.</p>' : '<p class="empty">Switch to All regions to see the global forecast history.</p>') + '</div></div>' +
    footer();
}
function segRow(g) {
  const w = (v) => Math.max(0, (v / (g.target * 1.12)) * 100);
  let x = 0; const parts = [['base', g.base, 'var(--ink-3)', 'Run-rate base'], ['c', g.c.Commit, 'var(--blue)', 'Commit'], ['b', g.c['Best case'], 'var(--s-cts)', 'Best case'], ['p', g.c.Pipeline, 'var(--s-wh)', 'Pipeline']];
  const bars = parts.map((p) => { const wd = w(p[1]), l = x; x += wd; return '<i data-tip="<b>' + p[3] + '</b><br>' + fm(p[1]) + '" style="left:' + l + '%;width:' + wd + '%;background:' + p[2] + '"></i>'; }).join('');
  const t = tone(g.att, 0.97, 0.92);
  return '<div class="seg-row"><div class="nm">' + esc(g.short) + '<small>Plan ' + fm(g.target, 0) + '</small></div><div class="stack">' + bars + '<span class="tgt" style="left:' + w(g.target) + '%"></span></div><div class="rt"><b class="num">' + pc(g.att, 1) + '</b> ' + pill(nf(g.cov, 1) + 'x cover', t === 'ok' ? 'ok' : t) + '<br><span style="color:var(--ink-3)">' + fm(g.F, 0) + ' forecast</span></div></div>';
}

function viewPipeline() {
  const s = summary();
  const rows = sortRows(s.ds, 'deals', { exposure: (d) => d.exposure, amount: (d) => d.amount, q4rev: (d) => d.q4rev, ai: (d) => d.aiProb, close: (d) => d.daysToClose, name: (d) => d.name, stage: (d) => D.stages.findIndex((x) => x.id === d.stage), account: (d) => A[d.accountId].name });
  const stages = D.stages.map((st) => { const x = s.ds.filter((d) => d.stage === st.id); return { id: st.id, n: x.length, tcv: sum(x, (d) => d.amount) }; });
  const maxT = Math.max.apply(null, stages.map((x) => x.tcv));
  return '<div class="sec-title"><span class="kicker">GTM Control Center · pipeline growth</span><h2>Pipeline and forecast integrity</h2><p>Rep calls on one side, signal-based probabilities on the other. The gap between them is where the CRO should spend the next review.</p></div>' +
    '<div class="grid g2"><div class="card"><div class="hd"><h3>Forecast by category</h3><span class="meta">Q4 revenue, $M</span></div><div class="tbl-wrap"><table><thead><tr><th>Category</th><th class="r">Deals</th><th class="r">TCV</th><th class="r">Q4 revenue</th><th class="r">Rep-weighted</th><th class="r">AI-weighted</th><th class="r">Δ</th></tr></thead><tbody>' +
    CATS.map((c) => { const x = s.cat[c]; return '<tr><td><b>' + c + '</b></td><td class="r num">' + x.n + '</td><td class="r num">' + nf(x.tcv, 0) + '</td><td class="r num">' + nf(x.q4, 1) + '</td><td class="r num">' + nf(x.rep, 1) + '</td><td class="r num">' + nf(x.ai, 1) + '</td><td class="r num ' + (x.ai - x.rep < 0 ? 'down' : 'up') + '">' + nf(x.ai - x.rep, 1) + '</td></tr>'; }).join('') +
    '<tr><td><b>Total</b></td><td class="r num">' + s.ds.length + '</td><td class="r num">' + nf(sum(s.ds, (d) => d.amount), 0) + '</td><td class="r num">' + nf(sum(s.ds, (d) => d.q4rev), 1) + '</td><td class="r num">' + nf(s.wRep, 1) + '</td><td class="r num">' + nf(s.wAI, 1) + '</td><td class="r num down">' + nf(s.wAI - s.wRep, 1) + '</td></tr></tbody></table></div>' +
    '<p class="note" style="margin-top:10px">Q4 forecast = run-rate base (' + fm(s.base, 0) + ') + deal-weighted revenue. Reps weight Commit 80%, Best case 30%, Pipeline 8%. The AI weights each deal by stage, sponsor access, threading, recency, competition and budget timing.</p></div>' +
    '<div class="card"><div class="hd"><h3>Open pipeline by stage</h3><span class="meta">TCV, $M</span></div><div class="funnel">' + stages.map((x) => '<div class="f"><span>' + x.id + '</span><div><div class="fb" style="width:' + (x.tcv / maxT * 100) + '%"></div></div><span class="fr num">' + nf(x.tcv, 0) + ' · ' + x.n + '</span></div>').join('') + '</div>' +
    '<div class="hd" style="margin-top:20px"><h3>Pipeline created per seller</h3><div class="legend"><span><i style="background:var(--accent)"></i>Guided pilot</span><span><i style="background:var(--ink-3)"></i>Control</span></div></div><div class="chart" data-chart="weekly"></div><p class="note" style="margin-top:8px">Indexed to week 1 = 100. Pilot began ' + dateFmt(D.meta.pilotStart) + '.</p></div></div>' +
    '<div class="card"><div class="hd"><h3>Coverage of the Q4 gap</h3><span class="meta">Deals closing this quarter (TCV) ÷ target minus run-rate · norm 3.0x</span></div><div style="overflow-x:auto">' + coverageHeat(s) + '</div></div>' +
    '<div class="card"><div class="hd"><h3>Open deals</h3><span class="meta">Sorted by revenue the rep call overstates. Click a row for the account brief.</span></div><div class="tbl-wrap"><table class="wide xl"><thead><tr>' +
    th('deals', 'name', 'Deal') + th('deals', 'account', 'Account') + th('deals', 'stage', 'Stage') + th('deals', 'amount', 'TCV', 'r') + th('deals', 'q4rev', 'Q4 rev', 'r') + th('deals', 'close', 'Close') + '<th class="r">Rep call</th>' + th('deals', 'ai', 'AI win %', 'r') + th('deals', 'exposure', 'Overstated', 'r') + '<th>Signals</th><th>Next best action</th></tr></thead><tbody>' +
    (S.allDeals ? rows : rows.slice(0, 12)).map((d) => { const a = A[d.accountId]; return '<tr class="click" data-act="acct" data-id="' + a.id + '"><td><b>' + esc(d.name) + '</b><div class="sub">' + esc(d.type) + ' · ' + esc(SL[d.ownerId].name) + '</div></td><td>' + esc(a.name) + '<div class="sub">' + d.region + ' · ' + SEG[d.segment].short + '</div></td><td>' + d.stage + '<div class="sub">' + d.category + '</div></td><td class="r num">' + nf(d.amount, 1) + '</td><td class="r num">' + nf(d.q4rev, 1) + '</td><td class="num">' + dateFmt(d.closeDate) + '</td><td class="r num">' + pc(d.repProb) + '</td><td class="r num"><b>' + pc(d.aiProb) + '</b></td><td class="r num ' + (d.exposure > 1 ? 'down' : '') + '">' + (d.exposure > 0.05 ? nf(d.exposure, 1) : '-') + '</td><td><div class="chips">' + dealReasons(d).slice(0, 3).map((r) => pill(r[0], r[1] === 'ai' ? 'ai' : r[1])).join('') + '</div></td><td class="nba">' + esc(dealNBA(d)) + '</td></tr>'; }).join('') + '</tbody></table></div><div style="margin-top:12px"><button class="btn sm" data-act="alldeals">' + (S.allDeals ? 'Show top 12' : 'Show all ' + rows.length + ' deals') + '</button></div></div>' + footer();
}
function coverageHeat(s) {
  const regs = S.region === 'All' ? D.regions : [S.region];
  let h = '<div class="heat" style="grid-template-columns:minmax(120px,1.2fr) repeat(' + regs.length + ',minmax(90px,1fr))"><div class="h"></div>' + regs.map((r) => '<div class="h">' + r + '</div>').join('');
  D.segments.forEach((sg) => {
    h += '<div class="rowl">' + esc(sg.short) + '</div>';
    regs.forEach((r) => {
      const m = D.matrix.find((x) => x.segment === sg.id && x.region === r), ds = D.deals.filter((d) => d.segment === sg.id && d.region === r && d.inQ);
      const gap = m.target - m.base, cov = ds.length ? sum(ds, (d) => d.amount) / gap : 0;
      const k = cov >= 3 ? 'ok' : cov >= 2 ? 'warn' : 'bad';
      h += ds.length ? '<div class="c" style="background:var(--' + k + '-soft);color:var(--' + k + ')" data-tip="<b>' + esc(sg.short) + ' · ' + r + '</b><br>' + ds.length + ' deals, ' + fm(sum(ds, (d) => d.amount), 0) + ' TCV<br>Gap to plan after run-rate: ' + fm(gap, 0) + '">' + nf(cov, 1) + 'x</div>' : '<div class="c na">no deals</div>';
    });
  });
  return h + '</div>';
}

function viewAccounts() {
  const accs = D.accounts.filter(inReg);
  const rows = sortRows(accs, 'accounts', { name: (a) => a.name, ttm: (a) => a.ttm, health: (a) => a.health, expansion: (a) => a.expansion, whitespace: (a) => a.whitespace, risk: (a) => a.atRiskRev });
  const ws = accs.filter((a) => a.owns.cadcam !== null).sort((a, b) => b.whitespace - a.whitespace).slice(0, 12);
  return '<div class="sec-title"><span class="kicker">GTM Control Center · account scoring and territory planning</span><h2>Strategic accounts: health, expansion and whitespace</h2><p>Health blends product usage, executive engagement, sentiment and commercial signals. Expansion propensity adds whitespace. Select any account for its Customer Context Graph, committee and recommended play.</p></div>' +
    '<div class="kpis">' + kpi('Strategic account revenue (TTM)', fm(sum(accs, (a) => a.ttm), 0), accs.length + ' accounts') + kpi('Revenue at risk', fm(sum(accs, (a) => a.atRiskRev), 0), accs.filter((a) => a.health < 55).length + ' accounts below health 55') + kpi('Whitespace identified', fm(sum(accs, (a) => a.whitespace), 0), 'unowned families, direct accounts') + kpi('Distributors above 9 weeks stock', String(accs.filter((a) => a.type === 'Distributor' && a.inventoryWeeks > 9).length), 'sell-in pull-forward risk') + '</div>' +
    '<div class="grid g-main"><div class="card"><div class="hd"><h3>Health vs expansion propensity</h3><div class="legend">' + Object.keys(TYPE_COLOR).map((k) => '<span><i style="background:' + TYPE_COLOR[k] + '"></i>' + k + '</span>').join('') + '</div></div><div class="chart" data-chart="acctScatter"></div><p class="note" style="margin-top:8px">Bubble size is trailing-12-month revenue. Top-right accounts are healthy and ready to expand; bottom-right accounts have headroom but need a repair plan first.</p></div>' +
    '<div class="card"><div class="hd"><h3>Whitespace by product family</h3><span class="meta">Top 12 direct accounts</span></div><div style="overflow-x:auto">' + whitespaceHeat(ws) + '</div></div></div>' +
    '<div class="card"><div class="hd"><h3>All accounts</h3><span class="meta">Click a row to open the account brief</span></div><div class="tbl-wrap"><table class="wide"><thead><tr>' + th('accounts', 'name', 'Account') + th('accounts', 'ttm', 'TTM revenue', 'r') + th('accounts', 'health', 'Health') + th('accounts', 'expansion', 'Expansion', 'r') + th('accounts', 'whitespace', 'Whitespace', 'r') + th('accounts', 'risk', 'At risk', 'r') + '<th>Owner</th><th>Next best action</th></tr></thead><tbody>' +
    rows.map((a) => '<tr class="click" data-act="acct" data-id="' + a.id + '"><td><b>' + esc(a.name) + '</b><div class="sub">' + a.type + ' · ' + a.region + (a.type === 'Distributor' ? ' · ' + a.inventoryWeeks + ' wks stock' : '') + '</div></td><td class="r num">' + nf(a.ttm, 1) + '</td><td>' + healthBar(a.health) + '</td><td class="r num">' + a.expansion + '</td><td class="r num">' + (a.whitespace ? nf(a.whitespace, 1) : '-') + '</td><td class="r num ' + (a.atRiskRev > 3 ? 'down' : '') + '">' + (a.atRiskRev ? nf(a.atRiskRev, 1) : '-') + '</td><td>' + esc(SL[a.ownerId].name) + '</td><td class="nba">' + esc(acctNBA(a)) + '</td></tr>').join('') + '</tbody></table></div></div>' + footer();
}
function whitespaceHeat(ws) {
  const short = ['CAD/CAM', 'Imaging', 'Implants', 'Aligners', 'Consum.', 'Software'];
  const wgt = [0.14, 0.07, 0.16, 0.09, 0.05, 0.06];
  let h = '<div class="heat" style="grid-template-columns:minmax(150px,1.6fr) repeat(6,minmax(54px,1fr))"><div class="h"></div>' + short.map((x) => '<div class="h">' + x + '</div>').join('');
  ws.forEach((a) => {
    h += '<div class="rowl" title="' + esc(a.name) + '">' + esc(a.name) + '</div>';
    D.families.forEach((f, k) => { const own = a.owns[f.id]; const v = a.ttm * wgt[k]; h += own ? '<div class="c own" data-tip="<b>' + esc(f.name) + '</b><br>Already a customer">✓</div>' : '<div class="c" style="background:color-mix(in srgb,var(--accent) ' + Math.round(Math.min(60, 10 + v * 6)) + '%,var(--surface));color:var(--ink)" data-tip="<b>' + esc(f.name) + '</b><br>Est. whitespace ' + fm(v, 1) + '">' + nf(v, 1) + '</div>'; });
  });
  return h + '</div><div class="legend" style="margin-top:10px"><span><i style="background:var(--blue-soft)"></i>Owned</span><span><i style="background:color-mix(in srgb,var(--accent) 40%,var(--surface))"></i>Whitespace, $M estimate</span></div>';
}

function viewSellers() {
  const rows = sortRows(sellerRows(), 'sellers', { name: (s) => s.name, attain: (s) => s.attain, f: (s) => s.f, cov: (s) => s.cov, maturity: (s) => s.maturity, adoption: (s) => s.adoption, flags: (s) => s.flags.length });
  const c = COH;
  const rel = (a, b) => (a / b - 1);
  return '<div class="sec-title"><span class="kicker">GTM Control Center · seller maturity</span><h2>Seller maturity and the guided-selling pilot</h2><p>Scenario: 90 days into a Databook pilot with ' + D.sellers.filter((s) => s.pilot).length + ' of ' + D.sellers.length + ' strategic sellers. The control group is everyone else, which keeps the comparison honest.</p></div>' +
    '<div class="grid g-main"><div class="card"><div class="hd"><h3>Maturity index vs quota attainment</h3><div class="legend"><span><i style="background:var(--accent)"></i>Pilot seller</span><span><i style="background:var(--ink-3)"></i>Control</span></div></div><div class="chart" data-chart="sellerScatter"></div><p class="note" style="margin-top:8px">Maturity index blends account-plan completeness, buying-group threading, executive access, discovery quality and forecast accuracy. Attainment is year-to-date against enterprise quota.</p></div>' +
    '<div class="card"><div class="hd"><h3>Pilot vs control</h3><span class="meta">Since ' + dateFmt(D.meta.pilotStart) + '</span></div><div class="tbl-wrap"><table><thead><tr><th>Metric</th><th class="r">Pilot</th><th class="r">Control</th><th class="r">Diff</th></tr></thead><tbody>' +
    '<tr><td>Win rate</td><td class="r num"><b>' + pc(c.pilot.win) + '</b></td><td class="r num">' + pc(c.ctrl.win) + '</td><td class="r num up">+' + nf((c.pilot.win - c.ctrl.win) * 100, 0) + ' pts</td></tr>' +
    '<tr><td>Avg won deal (TCV)</td><td class="r num"><b>' + fm(c.pilot.acv) + '</b></td><td class="r num">' + fm(c.ctrl.acv) + '</td><td class="r num up">' + (rel(c.pilot.acv, c.ctrl.acv) >= 0 ? '+' : '') + nf(rel(c.pilot.acv, c.ctrl.acv) * 100, 0) + '%</td></tr>' +
    '<tr><td>Sales cycle, won deals</td><td class="r num"><b>' + nf(c.pilot.cyc, 0) + ' d</b></td><td class="r num">' + nf(c.ctrl.cyc, 0) + ' d</td><td class="r num up">' + nf(c.pilot.cyc - c.ctrl.cyc, 0) + ' d</td></tr>' +
    '<tr><td>Hours per account plan</td><td class="r num"><b>' + nf(c.hrsP, 1) + '</b></td><td class="r num">' + nf(c.hrsC, 1) + '</td><td class="r num up">' + nf((c.hrsP / c.hrsC - 1) * 100, 0) + '%</td></tr>' +
    '<tr><td>Maturity change, 90 days</td><td class="r num"><b>+' + nf(c.matP, 1) + '</b></td><td class="r num">' + (c.matC >= 0 ? '+' : '') + nf(c.matC, 1) + '</td><td class="r num up">+' + nf(c.matP - c.matC, 1) + '</td></tr>' +
    '<tr><td>Deals closed (n)</td><td class="r num">' + c.pilot.n + '</td><td class="r num">' + c.ctrl.n + '</td><td></td></tr></tbody></table></div>' +
    '<p class="note" style="margin-top:10px"><b>Read with care.</b> ' + c.pilot.n + ' pilot deals over 13 weeks is a small sample, and pilot sellers volunteered. Pilot sellers won ' + pc(c.pre.win) + ' before launch, so the clean lift is about ' + nf((c.pilot.win - c.pre.win) * 100, 0) + ' points. Deal size is flat so far; the early gain is in speed and conversion.</p></div></div>' +
    '<div class="card"><div class="hd"><h3>Seller scorecard</h3><span class="meta">Coaching flags are generated from each seller’s deals and activity</span></div><div class="tbl-wrap"><table class="wide"><thead><tr>' + th('sellers', 'name', 'Seller') + th('sellers', 'attain', 'YTD attainment', 'r') + th('sellers', 'f', 'Q4 forecast', 'r') + th('sellers', 'cov', 'Coverage', 'r') + th('sellers', 'maturity', 'Maturity') + th('sellers', 'adoption', 'Guided use', 'r') + th('sellers', 'flags', 'Coaching this week') + '</tr></thead><tbody>' +
    rows.map((s) => '<tr><td><b>' + esc(s.name) + '</b> ' + (s.pilot ? pill('Pilot', 'ai') : '') + '<div class="sub">' + s.region + ' · ' + esc(s.role) + '</div></td><td class="r num"><span class="' + (s.attain >= 0.9 ? 'up' : s.attain < 0.75 ? 'down' : '') + '">' + pc(s.attain) + '</span></td><td class="r num">' + fm(s.f) + '<div class="sub">' + pc(s.q4att) + ' of quota</div></td><td class="r num">' + nf(s.cov, 1) + 'x</td><td>' + healthBar(s.maturity) + '<div class="sub">' + (s.maturity - s.maturityPrev >= 0 ? '+' : '') + (s.maturity - s.maturityPrev) + ' in 90 days</div></td><td class="r num">' + (s.pilot ? s.adoption + '%' : '-') + '</td><td>' + (s.flags.length ? '<div class="chips">' + s.flags.map((f) => pill(f, 'warn')).join('') + '</div>' : '<span class="sub">On track</span>') + '</td></tr>').join('') + '</tbody></table></div></div>' + footer();
}

function modelOut() {
  const w = S.winUp / 100, a = S.acvUp / 100, ad = S.adopt / 100;
  const lift = (1 + w) * (1 + a) - 1, base = COH.ttmWon, incTCV = base * ad * lift, recog = 0.55, incRev = incTCV * recog;
  const s0 = D.matrix.reduce((t, m) => t + m.target - m.base, 0);
  return { base, incTCV, incRev, lift, gapShare: incRev / (D.meta.q4Plan * 4 * 0.04) };
}
function modelHTML() {
  const o = modelOut(), fy = D.meta.fyPlan;
  return '<div class="res">' + kpi('Incremental closed-won TCV', fm(o.incTCV, 0), 'per year on ' + fm(o.base, 0) + ' trailing base') + kpi('In-year net sales', fm(o.incRev, 0), 'at ~55% recognized in year') + kpi('Share of FY plan', pc(o.incRev / fy, 1), 'of ' + fb(fy) + ' plan') + kpi('Effective lift per sale', '+' + nf(o.lift * 100, 0) + '%', 'win rate × deal size') + '</div>' +
    '<div class="note" style="margin-top:12px">Model: trailing closed-won TCV × adoption × ((1 + win-rate lift) × (1 + deal-size lift) - 1). The pilot shows ' + nf((COH.pilot.win - COH.ctrl.win) * 100, 0) + ' points of win-rate lift against control; the presets discount that because the sample is small and pilot sellers self-selected.</div>';
}
function viewPlan() {
  const c = COH;
  return '<div class="sec-title"><span class="kicker">Proposal</span><h2>How Databook turns this dashboard into an operating system</h2><p>The dashboard is the CRO’s view. The plan below is how the guidance behind it reaches every seller, and how we prove it before scaling.</p></div>' +
    '<div class="card"><div class="hd"><h3>Why Dentsply Sirona is a fit</h3><span class="meta">Public context, as reported</span></div><div class="facts">' +
    '<div class="fact"><div class="v">$3.5-3.6B</div><div class="t">2026 net sales guidance held after Q2 results; FY25 net sales were about $3.68B, down 3%.</div></div>' +
    '<div class="fact"><div class="v">Realignment</div><div class="t">Management cites distributor relationships, sales-team realignment and a Return-to-Growth plan as the levers.</div></div>' +
    '<div class="fact"><div class="v">4 segments, 3 motions</div><div class="t">Equipment, consumables, implants and ortho, and Wellspect sell through DSOs, distributors and direct. One playbook will not fit.</div></div>' +
    '<div class="fact"><div class="v">Complex buyers</div><div class="t">DSO consolidation and sponsor-driven capex mean buying committees, CFO sign-off and long cycles, the pattern Databook is built for.</div></div></div>' +
    '<p class="note" style="margin-top:12px">Sources: company Q4 2025 and Q2 2026 results releases and trade coverage. All pipeline, account and seller figures in this prototype are synthetic and calibrated to the guidance range.</p></div>' +
    '<div class="card"><div class="hd"><h3>From augmentation to guided selling</h3><span class="meta">Maturity ladder</span></div><div class="ladder">' +
    '<div class="rung"><b>Seller-driven</b>Spreadsheets, CRM notes, tribal knowledge.<span class="chips">' + pill('Where most distributor reps are', 'neutral') + '</span></div>' +
    '<div class="rung now"><b>Augmented</b>General-purpose copilots answer when asked. Fast, but unverified and ungoverned.<span class="chips">' + pill('Where the team is today', 'blue') + '</span></div>' +
    '<div class="rung next"><b>Guided</b>Verified account intelligence, a deterministic next best action, and analytics that show what is working.<span class="chips">' + pill('Where this plan goes', 'ai') + '</span></div>' +
    '<div class="rung"><b>Autonomous</b>Agents prospect and nurture around the clock, with humans where needed.<span class="chips">' + pill('Later', 'neutral') + '</span></div></div></div>' +
    '<div class="card"><div class="hd"><h3>What the pilot is worth, and what you would have to believe</h3><span class="meta">Adjust the assumptions</span></div><div class="model"><div><div class="seg" role="group" aria-label="Scenario">' + Object.keys(PRESETS).map((k) => '<button data-act="preset" data-k="' + k + '" aria-pressed="' + (S.preset === k) + '">' + k[0].toUpperCase() + k.slice(1) + '</button>').join('') + '</div>' +
    ctl('adopt', 'Seller adoption of guided workflows', S.adopt, 20, 100, '%') + ctl('winUp', 'Relative win-rate lift', S.winUp, 0, 30, '%') + ctl('acvUp', 'Deal-size lift', S.acvUp, 0, 30, '%') +
    '<p class="note" style="margin-top:14px">Databook reports 25% higher sales productivity and 1.9x larger deal sizes across its customer base. Those figures come from the vendor and reflect customer selection, so this model uses a fraction of them.</p></div><div id="model-out">' + modelHTML() + '</div></div></div>' +
    '<div><div class="sec-title" style="margin-bottom:12px"><h2>Pilot to platform</h2><p>Land with a pilot that earns executive trust, then expand use case by use case. The pilot above is phase 1.</p></div><div class="phases">' +
    phase('Weeks 0-2', 'Align and baseline', ['Name the CRO as sponsor and agree three success metrics', 'Map the three revenue motions: DSO enterprise, distributor channel, direct equipment and implants', 'Connect CRM, call transcripts, sell-through and telemetry; complete privacy review'], 'Gate: baseline for win rate, cycle time, plan hours, forecast accuracy signed off.') +
    phase('Weeks 2-13', 'Pilot', ['9 sellers across 3 regions and 10 use cases: account planning, meeting prep, executive briefings, DSO acquisition signals, distributor QBR prep', 'Forward-deployed engineer on site; weekly office hours; one scoreboard in the CRO review', 'Control group held out for a clean read'], 'Gate: ≥60% adoption and a measurable lift against control.', true) +
    phase('Weeks 14-26', 'Scale', ['All 24 strategic sellers plus regional VPs and RevOps', 'AI-adjusted forecast enters the weekly CRO call next to the rep call', 'Re-cut territories and account scoring using whitespace and health'], 'Gate: forecast error cut in half; coaching flags drive manager 1:1s.') +
    phase('Weeks 27-52', 'Platform', ['GTM Control Center governs who sees which guidance and measures what works', 'AI Studio builds coaches for the channel QBR and the Wellspect formulary process without engineering', 'Extend to customer success and marketing on the same context graph'], 'Gate: guidance live in CRM and Slack for the full commercial team.') + '</div></div>' +
    '<div class="grid g2"><div class="card"><div class="hd"><h3>How each part of this dashboard is powered</h3></div><div class="tbl-wrap"><table><thead><tr><th>Dashboard element</th><th>Databook layer</th></tr></thead><tbody>' +
    [['Account health, whitespace, signals', 'The map: Customer Context Graph from licensed sources plus first-party data'], ['AI-adjusted forecast, risk reasons', 'The routing engine: deterministic reasoning on deal signals'], ['Next best action, executive briefs, talk tracks', 'Guided coaches and generated assets in CRM and Slack'], ['Seller maturity, pilot vs control', 'GTM Control Center analytics'], ['Territory and account scoring', 'Control Center: territory planning and scoring'], ['Custom coaches for channel and Wellspect', 'AI Studio']].map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></div></div>' +
    '<div class="card"><div class="hd"><h3>Risks I would manage from day one</h3></div><div class="two-col" style="columns:1">' +
    [['Hundreds of agents, little usage', 'Embed guidance where reps already work and measure adoption weekly in the Control Center.'], ['Channel conflict', 'Encode who leads which pursuit in the context graph so direct and distributor plays do not collide.'], ['Change fatigue after the realignment', 'Start with three motions and ten use cases; retire a tool for every one added.'], ['CRM data quality', 'Show data gaps in the briefing; treat first-party data as a signal, not the only truth.'], ['Regional privacy rules', 'Keep EMEA data governance in scope from the first sprint.']].map((r) => '<div><b>' + r[0] + '</b><br><span style="color:var(--ink-2)">' + r[1] + '</span></div>').join('') + '</div></div></div>' +
    '<div class="card"><div class="hd"><h3>Questions for the CRO in the first meeting</h3></div><div class="two-col">' +
    ['Which of the three motions carries the most Q4 and FY27 risk, and who owns it?', 'Where do rep forecast calls and finance forecasts diverge most today, and why?', 'How do you decide when a DSO deal needs an executive sponsor, and who provides one?', 'What does the distributor realignment change for account ownership and quota?', 'Which decision would you make differently with a trustworthy next best action in front of every seller?', 'What would make you stop the pilot at day 90?'].map((q) => '<div>' + q + '</div>').join('') + '</div></div>' + footer();
}
const ctl = (id, label, v, lo, hi, u) => '<div class="ctl"><div class="row"><label for="' + id + '">' + label + '</label><b id="' + id + '-v">' + v + u + '</b></div><input type="range" id="' + id + '" min="' + lo + '" max="' + hi + '" value="' + v + '" data-model="' + id + '"></div>';
const phase = (when, t, li, gate, done) => '<div class="phase' + (done ? ' done' : '') + '"><span class="when">' + when + (done ? ' · illustrated in this dashboard' : '') + '</span><h4>' + t + '</h4><ul>' + li.map((x) => '<li>' + x + '</li>').join('') + '</ul><div class="gate">' + gate + '</div></div>';
function footer() {
  return '<div class="foot"><details><summary>How the numbers are built</summary><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px"><span><b>Q4 forecast</b> = run-rate base (consumables replenishment, subscriptions, recurring programs) + Σ deal Q4 revenue × win probability.</span><span><b>Q4 revenue</b> of a deal = TCV × recognition share by segment × a timing factor for how late in the quarter it closes.</span><span><b>AI win probability</b> starts from stage and adjusts for executive sponsor, buying-group threading, days since last activity, competitor presence, budget timing and guided-plan usage.</span><span><b>Rep call</b> weights Commit, Best case and Pipeline at 80%, 30% and 8%.</span><span><b>Coverage</b> = TCV of deals closing this quarter ÷ (Q4 plan - run-rate base).</span></div></details><span>Prototype for a Databook panel interview. Company context from public reporting; all customer, seller, deal and pipeline data is synthetic. Customer names are fictional. Scenario: 90 days into a pilot.</span></div>';
}

// ---------- charts ----------
const NS = 'http://www.w3.org/2000/svg';
const svgOpen = (w, h) => '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img">';
function niceTicks(lo, hi, n) { const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), norm = step0 / mag, step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag; const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
function chartWaterfall(el, w) {
  const s = summary(), h = Math.max(250, Math.min(300, w * 0.6));
  const nar = w < 380, steps = [[nar ? 'Base' : 'Run-rate', s.base, 'base'], ['Commit', s.cat.Commit.ai, 'd'], ['Best case', s.cat['Best case'].ai, 'd'], ['Pipeline', s.cat.Pipeline.ai, 'd'], [nar ? 'Q4' : 'Q4 forecast', s.q4F, 'tot']];
  const m = { l: 40, r: 8, t: 22, b: 54 }, iw = w - m.l - m.r, ih = h - m.t - m.b, max = Math.max(s.target, s.q4F) * 1.06, y = (v) => m.t + ih - (v / max) * ih, bw = Math.min(54, iw / steps.length * 0.62);
  let o = svgOpen(w, h) + '<g class="grid">' + niceTicks(0, max, 4).map((t) => '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end" class="m">' + nf(t) + '</text>').join('') + '</g>';
  let run = 0;
  steps.forEach((st, i) => {
    const cx = m.l + iw / steps.length * (i + 0.5), x = cx - bw / 2;
    let y0, y1, col;
    if (st[2] === 'base') { y0 = 0; y1 = st[1]; run = st[1]; col = 'var(--ink-3)'; }
    else if (st[2] === 'd') { y0 = run; y1 = run + st[1]; run = y1; col = i === 1 ? 'var(--blue)' : i === 2 ? 'var(--s-cts)' : 'var(--s-wh)'; }
    else { y0 = 0; y1 = st[1]; col = 'var(--ink)'; }
    o += '<rect x="' + x + '" y="' + y(y1) + '" width="' + bw + '" height="' + Math.max(1, y(y0) - y(y1)) + '" rx="3" fill="' + col + '" data-tip="<b>' + st[0] + '</b><br>' + (st[2] === 'd' ? '+' : '') + fm(st[1]) + '"/>';
    o += '<text x="' + cx + '" y="' + (h - m.b + 16) + '" text-anchor="middle" style="font-size:' + (nar ? 10 : 11) + 'px">' + st[0] + '</text><text x="' + cx + '" y="' + (h - m.b + 33) + '" text-anchor="middle" class="m lbl-strong">' + (st[2] === 'd' ? '+' : '') + nf(st[1], 0) + '</text>';
  });
  o += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(s.target) + '" y2="' + y(s.target) + '" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="' + (m.l + 6) + '" y="' + (y(s.target) - 6) + '" text-anchor="start" class="m" style="fill:var(--accent-ink)">Plan ' + nf(s.target, 0) + '</text>';
  el.innerHTML = o + '</svg>';
}
function chartQuarters(el, w) {
  const s = summary(), share = s.target / D.meta.q4Plan;
  const q = D.quarters.map((x) => ({ l: x.q, v: x.actual * share, f: 0 })).concat([{ l: "Q4 '26", v: s.q4F, f: 1 }]);
  const h = 230, m = { l: 40, r: 8, t: 20, b: 28 }, iw = w - m.l - m.r, ih = h - m.t - m.b, max = Math.max(s.target, Math.max.apply(null, q.map((x) => x.v))) * 1.1, y = (v) => m.t + ih - (v / max) * ih, bw = Math.min(40, iw / q.length * 0.64);
  let o = svgOpen(w, h) + '<g class="grid">' + niceTicks(0, max, 4).map((t) => '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end" class="m">' + nf(t) + '</text>').join('') + '</g>';
  q.forEach((x, i) => { const cx = m.l + iw / q.length * (i + 0.5); o += '<rect x="' + (cx - bw / 2) + '" y="' + y(x.v) + '" width="' + bw + '" height="' + (y(0) - y(x.v)) + '" rx="3" fill="' + (x.f ? 'var(--accent)' : 'var(--blue)') + '" ' + (x.f ? 'opacity=".9"' : '') + ' data-tip="<b>' + x.l + (x.f ? ' forecast' : ' actual') + '</b><br>' + fm(x.v, 0) + '"/><text x="' + cx + '" y="' + (y(x.v) - 5) + '" text-anchor="middle" class="m lbl-strong">' + nf(x.v, 0) + '</text><text x="' + cx + '" y="' + (h - 9) + '" text-anchor="middle">' + x.l + '</text>'; });
  const cx = m.l + iw / q.length * (q.length - 0.5);
  o += '<line x1="' + (cx - bw) + '" x2="' + (cx + bw) + '" y1="' + y(s.target) + '" y2="' + y(s.target) + '" stroke="var(--ink)" stroke-width="2"/>';
  el.innerHTML = o + '</svg>';
}
function lineChart(el, w, series, opt) {
  const h = opt.h || 220, m = { l: 44, r: 12, t: 14, b: 26 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
  const all = [].concat.apply([], series.map((s) => s.pts.map((p) => p.v)));
  let lo = opt.lo != null ? opt.lo : Math.min.apply(null, all), hi = opt.hi != null ? opt.hi : Math.max.apply(null, all);
  const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  const n = series[0].pts.length, x = (i) => m.l + (iw * i) / (n - 1), y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
  let o = svgOpen(w, h) + '<g class="grid">' + niceTicks(lo, hi, 4).map((t) => '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end" class="m">' + nf(t, opt.d || 0) + '</text>').join('') + '</g>';
  (opt.refs || []).forEach((r) => { if (r.v > lo && r.v < hi) o += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(r.v) + '" y2="' + y(r.v) + '" stroke="' + r.c + '" stroke-dasharray="5 4"/><text x="' + (w - m.r) + '" y="' + (y(r.v) - 5) + '" text-anchor="end" class="m" style="fill:' + r.c + '">' + r.l + '</text>'; });
  series[0].pts.forEach((p, i) => { if (i % (opt.every || 1) === 0 || i === n - 1) o += '<text x="' + x(i) + '" y="' + (h - 8) + '" text-anchor="middle">' + p.l + '</text>'; });
  series.forEach((s) => {
    o += '<polyline fill="none" stroke="' + s.c + '" stroke-width="2.2" stroke-linejoin="round" points="' + s.pts.map((p, i) => x(i) + ',' + y(p.v)).join(' ') + '"/>';
    s.pts.forEach((p, i) => { o += '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="' + (i === n - 1 ? 4.5 : 2.5) + '" fill="' + s.c + '" data-tip="<b>' + esc(s.n) + ' · ' + p.l + '</b><br>' + nf(p.v, opt.d || 0) + (opt.u || '') + '"/>'; });
    const last = s.pts[n - 1]; o += '<text x="' + (x(n - 1) - 6) + '" y="' + (y(last.v) - 9) + '" text-anchor="end" class="m lbl-strong">' + nf(last.v, opt.d || 0) + '</text>';
  });
  el.innerHTML = o + '</svg>';
}
function chartFC(el, w) { const s = summary(); const pts = D.forecastHistory.map((p, i, a) => ({ l: p.label, v: i === a.length - 1 ? s.fy : p.v })); lineChart(el, w, [{ n: 'FY landing', c: 'var(--blue)', pts }], { refs: [{ v: D.meta.guidance[0], c: 'var(--bad)', l: 'Guidance low ' + nf(D.meta.guidance[0]) }], lo: D.meta.guidance[0] - 4, hi: Math.max(pts[0].v, s.fy) + 6, u: 'M' }); }
function chartWeekly(el, w) { lineChart(el, w, [{ n: 'Control', c: 'var(--ink-3)', pts: D.weeks.map((x) => ({ l: x.label, v: x.control })) }, { n: 'Guided pilot', c: 'var(--accent)', pts: D.weeks.map((x) => ({ l: x.label, v: x.pilot })) }], { h: 200, every: 3, lo: 85, hi: 135 }); }
function scatter(el, w, pts, o) {
  const h = o.h || Math.max(280, Math.min(380, w * 0.62)), m = { l: 54, r: 14, t: 14, b: 40 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = (v) => m.l + ((v - o.x[0]) / (o.x[1] - o.x[0])) * iw, y = (v) => m.t + ih - ((v - o.y[0]) / (o.y[1] - o.y[0])) * ih;
  let s = svgOpen(w, h) + '<g class="grid">' + niceTicks(o.y[0], o.y[1], 4).map((t) => '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end" class="m">' + t + (o.yu || '') + '</text>').join('') + niceTicks(o.x[0], o.x[1], 5).map((t) => '<text x="' + x(t) + '" y="' + (h - m.b + 15) + '" text-anchor="middle" class="m">' + t + '</text>').join('') + '</g>';
  (o.lines || []).forEach((l) => { s += l.h != null ? '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(l.h) + '" y2="' + y(l.h) + '" stroke="var(--ink-3)" stroke-dasharray="3 4" opacity=".6"/>' : '<line y1="' + m.t + '" y2="' + (h - m.b) + '" x1="' + x(l.v) + '" x2="' + x(l.v) + '" stroke="var(--ink-3)" stroke-dasharray="3 4" opacity=".6"/>'; });
  if (o.trend) s += '<line x1="' + x(o.trend[0]) + '" y1="' + y(o.trend[1]) + '" x2="' + x(o.trend[2]) + '" y2="' + y(o.trend[3]) + '" stroke="var(--blue)" stroke-width="1.5" opacity=".7"/>';
  s += '<text x="' + (m.l + iw / 2) + '" y="' + (h - 4) + '" text-anchor="middle">' + o.xl + '</text><text transform="translate(11 ' + (m.t + ih / 2) + ') rotate(-90)" text-anchor="middle">' + o.yl + '</text>';
  (o.quad || []).forEach((q) => (s += '<text x="' + x(q[0]) + '" y="' + y(q[1]) + '" text-anchor="' + q[2] + '" style="font-size:10.5px;font-weight:600;fill:var(--ink-3);opacity:.85">' + q[3] + '</text>'));
  pts.forEach((p) => { s += '<circle cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="' + p.r + '" fill="' + p.c + '" fill-opacity=".72" stroke="' + p.c + '" stroke-width="1.5" ' + (p.id ? 'data-acct="' + p.id + '" ' : '') + 'data-tip="' + p.tip + '"/>'; });
  el.innerHTML = s + '</svg>';
}
function chartAcct(el, w) {
  const accs = D.accounts.filter(inReg);
  scatter(el, w, accs.map((a) => ({ x: a.health, y: a.expansion, r: Math.min(20, 4 + Math.sqrt(a.ttm) * 0.95), c: TYPE_COLOR[a.type], id: a.id, tip: '<b>' + esc(a.name) + '</b><br>Health ' + a.health + ' · Expansion ' + a.expansion + '<br>TTM ' + fm(a.ttm) + ' · Whitespace ' + fm(a.whitespace) })), { x: [45, 95], y: [10, 90], xl: 'Account health', yl: 'Expansion propensity', lines: [{ v: 65 }, { h: 55 }], quad: [[94, 86, 'end', 'Expand now'], [94, 13, 'end', 'Healthy, limited headroom'], [46, 86, 'start', 'Headroom, needs repair'], [46, 13, 'start', 'Watch']] });
}
function chartSellers(el, w) {
  const ss = D.sellers.filter(inReg), n = ss.length, mx = sum(ss, (s) => s.maturity) / n, my = sum(ss, (s) => s.attainYTD) / n;
  const sxx = sum(ss, (s) => (s.maturity - mx) ** 2), sxy = sum(ss, (s) => (s.maturity - mx) * (s.attainYTD - my)), b = sxy / sxx, a = my - b * mx;
  scatter(el, w, ss.map((s) => ({ x: s.maturity, y: s.attainYTD, r: s.pilot ? 7 : 5.5, c: s.pilot ? 'var(--accent)' : 'var(--ink-3)', tip: '<b>' + esc(s.name) + '</b>' + (s.pilot ? ' · pilot' : '') + '<br>Maturity ' + s.maturity + ' · Attainment ' + s.attainYTD + '%' })), { x: [40, 95], y: [50, 120], yu: '%', xl: 'Seller maturity index', yl: 'YTD quota attainment', lines: [{ h: 100 }], trend: [42, a + b * 42, 94, a + b * 94] });
}
const CHARTS = { waterfall: chartWaterfall, quarters: chartQuarters, fchist: chartFC, weekly: chartWeekly, acctScatter: chartAcct, sellerScatter: chartSellers };
function mountCharts() { document.querySelectorAll('[data-chart]').forEach((el) => { const w = Math.floor(el.clientWidth); if (w > 60) CHARTS[el.dataset.chart](el, w); }); }

// ---------- drawers ----------
function acctDrawer(a) {
  const ds = D.deals.filter((d) => d.accountId === a.id), o = SL[a.ownerId];
  const g = a.graph, cgRow = (k, v) => '<div class="item"><div class="k">' + k + '</div><ul>' + v.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
  return '<div class="panel-hd"><div><span class="kicker">' + a.type + ' · ' + a.region + ' · ' + a.hq + '</span><h3>' + esc(a.name) + '</h3><div class="chips" style="margin-top:6px">' + pill('Health ' + a.health, tone(a.health, 70, 55)) + pill('Expansion ' + a.expansion, 'blue') + pill('TTM ' + fm(a.ttm), 'neutral') + (a.atRiskRev ? pill(fm(a.atRiskRev) + ' at risk', 'bad') : '') + '</div></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="panel-bd">' +
    '<div class="play"><span class="kicker">Recommended play · owner ' + esc(o.name) + '</span><div>' + esc(a.play) + '.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm ai" data-act="brief">' + (S.brief ? 'Hide executive brief' : 'Draft executive brief') + '</button></div>' + (S.brief ? '<div class="brieftext" id="brief-text">' + esc(execBrief(a)) + '</div><div><button class="btn sm" data-act="copy">Copy brief</button></div>' : '') + '</div>' +
    '<div><div class="hd" style="display:flex;justify-content:space-between;margin-bottom:8px"><h3 style="font-size:15px">Customer Context Graph</h3><span class="chips">' + chip('Licensed + first-party', 1) + '</span></div><div class="cg">' + cgRow('Strategic priorities', g.priorities) + cgRow('Financial drivers', g.financial) + cgRow('Management intent', g.intent) + cgRow('Competitive dynamics', g.competitive) + cgRow('Timing', g.timing) + '</div></div>' +
    '<div><h3 style="font-size:15px;margin-bottom:6px">Live signals</h3>' + a.signals.map((x) => '<div class="sig"><div>' + esc(x.text) + '<div class="chips" style="margin-top:4px">' + chip(x.src, /Licensed/.test(x.src)) + '</div></div><div class="w">' + x.when + '</div></div>').join('') + '</div>' +
    '<div><h3 style="font-size:15px;margin-bottom:6px">Buying committee</h3>' + a.committee.map((c) => '<div class="comm"><div><b>' + esc(c.name) + '</b><div class="sub" style="color:var(--ink-3)">' + esc(c.title) + ' · ' + c.role + '</div></div><div class="chips">' + pill(c.stance, c.stance === 'Supportive' ? 'ok' : c.stance === 'Skeptical' ? 'bad' : 'neutral') + pill(c.engaged ? 'Engaged' : 'Not engaged', c.engaged ? 'blue' : 'warn') + '</div></div>').join('') + '</div>' +
    (a.type === 'Distributor' ? '<div class="note">Inventory ' + a.inventoryWeeks + ' weeks on hand. ' + (a.inventoryWeeks > 9 ? 'Above the 9-week threshold: watch for quarter-end loading.' : 'Within the normal range.') + '</div>' : '') +
    '<div><h3 style="font-size:15px;margin-bottom:6px">Open deals</h3>' + (ds.length ? '<div class="tbl-wrap"><table><thead><tr><th>Deal</th><th>Stage</th><th class="r">TCV</th><th class="r">AI win %</th></tr></thead><tbody>' + ds.map((d) => '<tr><td><b>' + esc(d.name) + '</b><div class="chips" style="margin-top:4px">' + dealReasons(d).slice(0, 3).map((r) => pill(r[0], r[1] === 'ai' ? 'ai' : r[1])).join('') + '</div><div class="sub" style="margin-top:4px">' + esc(dealNBA(d)) + '</div></td><td>' + d.stage + '</td><td class="r num">' + nf(d.amount, 1) + '</td><td class="r num"><b>' + pc(d.aiProb) + '</b></td></tr>').join('') + '</tbody></table></div>' : '<p class="empty">No open enterprise deals.</p>') + '</div></div>';
}
function execBrief(a) {
  const g = a.graph, ec = a.committee.find((c) => c.role === 'Economic buyer') || a.committee[0];
  return 'EXECUTIVE POINT OF VIEW: ' + a.name + '\n\nWhat they are trying to do\n- ' + g.priorities.join('\n- ') + '\n\nWhat constrains them\n- ' + g.financial.join('\n- ') + '\n\nWhere we fit\n- ' + a.play + '.\n\nTiming\n- ' + g.timing.join('\n- ') + '\n\nWho to meet\n- ' + ec.title + ' (' + ec.role.toLowerCase() + '), currently ' + (ec.engaged ? 'engaged' : 'not engaged') + '.\n\nGenerated from licensed sources and first-party data; every claim traces to a signal in the account record.';
}
function copilotPanel() {
  const sugg = ['What changed in my forecast?', 'Which commit deals are most at risk?', 'How do we close the Q4 gap?', 'Which accounts should we expand first?', 'Who needs coaching this week?', 'Is the pilot working?', 'What is the pilot worth?'];
  return '<div class="panel-hd"><div><span class="kicker">Prototype · answers are computed from this page’s data</span><h3 style="display:flex;align-items:center;gap:8px"><span class="diamond" style="color:var(--accent)"></span>Ask Databook</h3></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="panel-bd" id="msgs-box"><div class="msgs">' +
    (S.msgs.length ? S.msgs.map((m) => '<div class="msg ' + m.r + '">' + m.h + '</div>').join('') : '<div class="msg a">Ask about the forecast, deals, accounts, sellers or the pilot. In production this runs on the Databook API and MCP with the same verified data and routing logic.</div>') + '</div><div class="sugg">' + sugg.map((q) => '<button data-act="ask" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div></div><form class="ask" id="ask-form"><input id="ask-in" placeholder="Ask about forecast, risk, accounts…" autocomplete="off" aria-label="Question"><button class="btn ai" type="submit">Ask</button></form>';
}
function answer(q) {
  const s = summary(), t = q.toLowerCase(), src = (a) => '<div class="chips">' + a.map((x) => chip(x[0], x[1])).join('') + '</div>';
  const ul = (a) => '<ul>' + a.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
  if (/coach|seller|who needs/.test(t)) { const r = sellerRows().filter((x) => x.flags.length).sort((a, b) => b.flags.length - a.flags.length).slice(0, 4); return '<b>' + r.length + ' sellers need coaching this week.</b>' + ul(r.map((x) => esc(x.name) + ' (' + x.region + '): ' + esc(x.flags.join(', ')))) + src([['Databook Control Center', 1], ['1P · CRM activity']]); }
  if (/chang|week|erod|forecast/.test(t) && !/gap|close/.test(t)) { const d0 = D.forecastHistory[0].v, d1 = D.forecastHistory[D.forecastHistory.length - 4].v; return '<b>FY landing is ' + fb(s.fy) + ', ' + fm(Math.abs(D.forecastHistory[0].v - s.fy), 0) + ' lower than six weeks ago.</b>' + ul(['Most of the erosion came from commit deals that stalled after stage three without an executive sponsor.', 'Reps call Q4 at ' + fm(s.repF, 0) + '; the signals support ' + fm(s.q4F, 0) + '.', 'The landing is ' + fm(s.fy - D.meta.guidance[0], 0) + ' above the low end of guidance.']) + src([['1P · CRM activity'], ['Databook routing engine', 1]]); }
  if (/risk|commit|deal/.test(t)) { const r = s.ds.filter((d) => d.category === 'Commit').sort((a, b) => b.exposure - a.exposure).slice(0, 3); return '<b>Three commit deals carry ' + fm(sum(r, (d) => d.exposure), 1) + ' of overstated revenue.</b>' + ul(r.map((d) => esc(d.name) + ' at ' + esc(A[d.accountId].name) + ': ' + fm(d.exposure, 1) + ' (' + dealReasons(d).filter((x) => x[1] === 'bad' || x[1] === 'warn').map((x) => x[0].toLowerCase()).slice(0, 2).join(', ') + '). ' + esc(dealNBA(d)))) + src([['1P · CRM activity'], ['1P · call transcripts'], ['Licensed · executive moves', 1]]); }
  if (/gap|close|plan|shortfall/.test(t)) { const gp = s.target - s.q4F; return '<b>Q4 is ' + fm(gp, 0) + ' short of plan; about ' + fm(s.recov, 0) + ' is recoverable in quarter.</b>' + ul(['Fix sponsor, threading and stalled-activity flags on open deals: ' + fm(s.recov, 0) + '.', 'The largest cell is ' + (function () { const w = s.mx.map((m) => { const x = s.ds.filter((d) => d.segment === m.segment && d.region === m.region); return { m, att: (m.base + sum(x, (d) => d.q4rev * d.aiProb)) / m.target }; }).sort((a, b) => a.att - b.att)[0]; return SEG[w.m.segment].short + ' in ' + w.m.region + ' at ' + pc(w.att); })() + ' of plan.', 'Pipeline coverage is ' + nf(s.cover, 1) + 'x against a 3.0x norm, so creation matters for Q1 as much as closing does.']) + src([['1P · CRM pipeline'], ['Databook routing engine', 1]]); }
  if (/expan|account|whitespace|grow/.test(t)) { const e = D.accounts.filter((a) => a.type !== 'Distributor' && a.health >= 60).sort((a, b) => b.whitespace * b.expansion - a.whitespace * a.expansion).slice(0, 3); return '<b>Expand these three first.</b>' + ul(e.map((a) => esc(a.name) + ': health ' + a.health + ', whitespace ' + fm(a.whitespace, 1) + '. ' + esc(a.play.split(';')[0]) + '.')) + src([['Licensed · news & filings', 1], ['1P · product telemetry']]); }
  if (/worth|value|model|impact|roi/.test(t)) { const o = modelOut(); return '<b>At the current assumptions the pilot is worth ' + fm(o.incRev, 0) + ' of in-year net sales.</b>' + ul(['Adoption ' + S.adopt + '%, win-rate lift ' + S.winUp + '%, deal-size lift ' + S.acvUp + '%.', 'Incremental closed-won TCV is ' + fm(o.incTCV, 0) + ' a year on a ' + fm(o.base, 0) + ' base.', 'Change the assumptions in the transformation plan tab.']); }
  if (/pilot|work|guided|databook/.test(t)) { const c = COH; return '<b>Early read is positive but small-sample.</b>' + ul(['Win rate ' + pc(c.pilot.win) + ' vs ' + pc(c.ctrl.win) + ' for control (' + c.pilot.n + ' vs ' + c.ctrl.n + ' deals).', 'Pilot sellers won ' + pc(c.pre.win) + ' before launch, so the clean lift is about ' + nf((c.pilot.win - c.pre.win) * 100, 0) + ' points.', 'Account plans take ' + nf(c.hrsP, 1) + ' hours instead of ' + nf(c.hrsC, 1) + '. Deal size is flat so far.']) + src([['Databook Control Center', 1], ['1P · CRM outcomes']]); }
  return 'I can answer questions on forecast changes, at-risk commit deals, closing the Q4 gap, expansion accounts, seller coaching, and the pilot. Try one of the suggestions below.';
}

// ---------- render ----------
const root = document.getElementById('cro');
function shell() {
  return '<div class="bar"><div class="wrap bar-top"><div class="brand"><h1>CRO Command Center</h1><span class="sub">Dentsply Sirona · Global commercial · Q4 FY26 · as of ' + dateFmt(D.meta.asOf) + ', 2026</span></div><div class="tools"><div class="seg" role="group" aria-label="Region">' + ['All'].concat(D.regions).map((r) => '<button data-act="region" data-r="' + r + '" aria-pressed="' + (S.region === r) + '">' + (r === 'All' ? 'All regions' : r) + '</button>').join('') + '</div><button class="btn ai" data-act="copilot"><span class="diamond"></span>Ask Databook</button></div></div></div>' +
    '<div class="banner"><div class="wrap"><span class="tag">Illustrative</span><span>Synthetic data for a Databook panel prototype, calibrated to Dentsply Sirona’s public 2026 guidance. Customers, sellers and deals are fictional.</span></div></div>' +
    '<nav class="tabs" role="tablist"><div class="wrap">' + TABS.map((t) => '<button role="tab" data-act="tab" data-t="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>').join('') + '</div></nav><main class="wrap" id="view"></main><div id="overlay"></div><div id="tip"></div>';
}
function renderView() {
  const v = { overview: viewOverview, pipeline: viewPipeline, accounts: viewAccounts, sellers: viewSellers, plan: viewPlan }[S.tab]();
  document.getElementById('view').innerHTML = v;
  mountCharts();
}
function renderOverlay() {
  const o = document.getElementById('overlay');
  if (S.drawer) o.innerHTML = '<div class="scrim" data-act="close"></div><aside class="panel" role="dialog" aria-modal="true">' + acctDrawer(A[S.drawer]) + '</aside>';
  else if (S.copilot) { o.innerHTML = '<div class="scrim" data-act="close"></div><aside class="panel" role="dialog" aria-modal="true">' + copilotPanel() + '</aside>'; const b = document.getElementById('msgs-box'); if (b) b.scrollTop = b.scrollHeight; const i = document.getElementById('ask-in'); if (i) i.focus(); }
  else o.innerHTML = '';
}
function renderAll() { root.innerHTML = shell(); renderView(); renderOverlay(); }
function pushAsk(q) { S.msgs.push({ r: 'u', h: esc(q) }); S.msgs.push({ r: 'a', h: answer(q) }); renderOverlay(); }
function setTab(t) { S.tab = t; S.drawer = null; S.copilot = false; try { history.replaceState(null, '', '#' + t); } catch (e) {} renderAll(); window.scrollTo(0, 0); }

// ---------- events ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-acct]'); if (!t) return;
  const act = t.dataset.act || 'acct', d = t.dataset;
  if (act === 'tab') setTab(d.t);
  else if (act === 'region') { S.region = d.r; renderAll(); }
  else if (act === 'sort') { const cur = S.sort[d.tbl]; S.sort[d.tbl] = [d.k, cur[0] === d.k ? -cur[1] : (d.k === 'name' || d.k === 'account' ? 1 : -1)]; renderView(); }
  else if (act === 'acct') { S.drawer = d.id || d.acct; S.copilot = false; S.brief = false; renderOverlay(); }
  else if (act === 'close') { S.drawer = null; S.copilot = false; renderOverlay(); }
  else if (act === 'copilot') { S.copilot = true; S.drawer = null; renderOverlay(); }
  else if (act === 'brief') { S.brief = !S.brief; renderOverlay(); }
  else if (act === 'copy') { const x = document.getElementById('brief-text'); if (x) { try { navigator.clipboard.writeText(x.textContent).then(() => (t.textContent = 'Copied'), () => sel(x)); } catch (er) { sel(x); } } }
  else if (act === 'alldeals') { S.allDeals = !S.allDeals; renderView(); }
  else if (act === 'ask') pushAsk(d.q);
  else if (act === 'preset') { S.preset = d.k; [S.winUp, S.acvUp] = PRESETS[d.k]; renderView(); }
  else if (act === 'go') { const [k, v] = d.go.split('|'); if (k === 'acct') { S.drawer = v; S.brief = false; renderOverlay(); } else if (k === 'tab') setTab(v); else setTab(k); }
  hideTip();
});
function sel(x) { const r = document.createRange(); r.selectNodeContents(x); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
document.addEventListener('input', (e) => {
  const m = e.target.dataset && e.target.dataset.model; if (!m) return;
  S[m] = +e.target.value; document.getElementById(m + '-v').textContent = e.target.value + '%';
  S.preset = ''; document.querySelectorAll('[data-act="preset"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  document.getElementById('model-out').innerHTML = modelHTML();
});
document.addEventListener('submit', (e) => { if (e.target.id !== 'ask-form') return; e.preventDefault(); const i = document.getElementById('ask-in'); const q = i.value.trim(); if (q) pushAsk(q); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (S.drawer || S.copilot)) { S.drawer = null; S.copilot = false; renderOverlay(); } });
const tip = () => document.getElementById('tip');
function hideTip() { const t = tip(); if (t) t.style.opacity = 0; }
document.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-tip]'); if (!t) return; const el = tip(); el.innerHTML = t.dataset.tip; el.style.opacity = 1; });
document.addEventListener('mousemove', (e) => { const t = e.target.closest('[data-tip]'); const el = tip(); if (!t || !el) return; const w = el.offsetWidth, x = Math.min(e.clientX + 14, window.innerWidth - w - 10); el.style.left = x + 'px'; el.style.top = Math.min(e.clientY + 16, window.innerHeight - el.offsetHeight - 10) + 'px'; });
document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) hideTip(); });
window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (TABS.some((t) => t[0] === h) && h !== S.tab) setTab(h); });
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(mountCharts, 120); });
if (window.__tab) S.tab = window.__tab;
if (window.__drawer) S.drawer = window.__drawer;
if (window.__ask) { S.copilot = true; S.msgs = []; window.__ask.forEach((q) => { S.msgs.push({ r: 'u', h: esc(q) }); S.msgs.push({ r: 'a', h: answer(q) }); }); }
renderAll();
})();
