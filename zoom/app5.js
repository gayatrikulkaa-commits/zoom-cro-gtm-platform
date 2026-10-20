// ---------- Command (tier 1): the glance. Few words, plain colours, everything clickable. ----------
const LANES = { outcome: ['Revenue outcomes', 'landing, retention, expansion'], exec: ['Sales execution', 'pipeline, conversion, coaching'], comp: ['Competition', 'rivals in the account book'] };
const laneChip = (k, on) => '<span class="lane ' + k + (on === false ? ' off' : '') + '">' + LANES[k][0] + '</span>';
const STATUS_WORD = { ok: 'Green', warn: 'Amber', bad: 'Red', insufficient: 'Insufficient data', na: 'Not available', none: 'No open deals' };
const dot = (st) => '<i class="dot ' + st + '" aria-hidden="true"></i>';
const gdot = (st) => '<i class="dot g ' + st + '" aria-hidden="true">' + { ok: '✓', warn: '!', bad: '×' }[st] + '</i>';
const CONF_SHORT = { High: 'High', Medium: 'Med', Low: 'Low' };
const sign = (x, d = 1) => (x >= 0 ? '+' : '-') + nf(Math.abs(x), d);
function curLanes() {
  const t = S.tab, sub = S.sub[t];
  if (t === 'command') return ['outcome', 'exec', 'comp'];
  if (t === 'forecast') return sub === 'pipeline' ? ['exec'] : ['outcome'];
  if (t === 'accounts') return ['outcome'];
  if (t === 'sellers' || t === 'pricing' || t === 'coach') return ['exec'];
  if (t === 'compete') return ['comp'];
  if (t === 'decide') return { actions: ['outcome', 'exec'], calls: ['outcome'], agents: ['exec'], studio: ['exec'], controls: ['outcome', 'exec', 'comp'] }[sub] || ['exec'];
  if (t === 'lab') return { scenarios: ['outcome'], lag: ['outcome'], logic: ['outcome', 'exec', 'comp'], levers: ['outcome', 'exec', 'comp'], lens: ['exec', 'comp'] }[sub] || ['outcome'];
  return [];
}
function tierBar() { return filterBar(); }
function filterBar() {
  const f = S.accGroup, r = S.region !== 'All' ? S.region : null; if (!f && !r) return '';
  return '<div class="fbar"><span class="kicker">Filtered to</span>' + (r ? '<button class="chip-x" data-act="region" data-r="All">Region · ' + esc(r) + ' ×</button>' : '') + (f ? '<button class="chip-x" data-act="clearacc">' + ucf(f.lens) + ' · ' + esc(f.label) + ' ×</button>' : '') + (f && f.lens !== 'region' ? '<span class="sub" style="color:var(--ink-3);font-size:12px">Plan is set by region and product, so industry and size filters apply to accounts and deals only.</span>' : '') + '</div>';
}
function whatifBar() {
  const n = S.prep ? S.prep.notes : []; if (!n.length) return '';
  return '<div class="whatif"><div class="wrap"><span class="tag" style="background:var(--data-soft);color:var(--data)">What-if active</span><span>' + n.length + ' change' + (n.length > 1 ? 's' : '') + ' from the workbook or levers: ' + esc(n.slice(0, 2).map((x) => x.t).join(' · ')) + (n.length > 2 ? ' · and ' + (n.length - 2) + ' more' : '') + '</span><button class="linkbtn" data-act="gosub" data-t="lab" data-s="levers">Edit levers</button></div></div>';
}
function whatifNote() { const n = S.prep ? S.prep.notes : []; return n.length ? ' <b>' + n.length + ' what-if change' + (n.length > 1 ? 's are' : ' is') + ' active:</b> ' + esc(n.slice(0, 5).map((x) => x.t).join('; ')) + (n.length > 5 ? '; and ' + (n.length - 5) + ' more' : '') + '.' : ''; }
const inGrp = (a) => !S.accGroup || S.accGroup.lens === 'product' || (S.accGroup.lens === 'industry' ? a.industry_group : S.accGroup.lens === 'size' ? a.size_tier : a.region) === S.accGroup.label;
const inGrpO = (o) => inGrp(o.account) && (!S.accGroup || S.accGroup.lens !== 'product' || o.product_line === S.accGroup.label);
const lagTxt = (w) => (w >= 11.5 ? 'in the last two weeks of the quarter' : 'from about week ' + nf(w, 0) + ' of 13');

// ---------- the matrix ----------
const MCOLS = [['perf', 'Performance', 'against plan to date', 'Rear-view mirror'], ['fcst', 'Forecast', 'against full-year plan', 'Windscreen'], ['ret', 'Retention risk', 'keep and grow', 'Windscreen'], ['grow', 'Growth execution', 'pipeline health', 'Route guidance'], ['comp', 'Competitive exposure', 'rival named in deal', 'Route guidance']];
function mval(k, c) {
  if (k === 'perf') return [pc(c.value, 0), 'Closed ' + fm(c.actual, 1) + ' of ' + fm(c.elapsed, 1)];
  if (k === 'fcst') return [pc(c.value, 0), 'Lands ' + fm(c.landing, 1) + ' of ' + fm(c.fyPlan, 1)];
  if (k === 'ret') return [pc(c.value, 1), fm(c.atRisk, 1) + ' at risk'];
  if (k === 'grow') return [pc(c.value, 0), 'of pipeline is healthy'];
  return [pc(c.value, 0), 'of pipeline names a rival'];
}
function mcell(row, k) {
  const c = row[k], col = MCOLS.find((x) => x[0] === k);
  if (c.status === 'na') return '<div class="mcw" data-label="' + col[1] + '"><div class="mc na" title="' + esc(c.why) + '"><span class="ml">n/a</span><span class="ms">' + esc(k === 'ret' ? 'Not tracked by product' : 'Plan set by region and product') + '</span></div></div>';
  if (c.status === 'insufficient') return '<div class="mcw" data-label="' + col[1] + '"><div class="mc insuff" title="' + esc(c.why) + '"><span class="mt">' + dot('none') + '</span><span class="ml">Insufficient data</span><span class="ms">' + esc(c.why) + '</span></div></div>';
  const v = mval(k, c);
  return '<div class="mcw" data-label="' + col[1] + '"><button class="mc ' + c.status + '" data-act="mdrill" data-lens="' + row.lens + '" data-g="' + esc(row.label) + '" data-k="' + k + '" aria-label="' + esc(row.label + ', ' + col[1] + ', ' + STATUS_WORD[c.status] + ', ' + v[0] + ', confidence ' + c.conf) + '"><span class="mt">' + gdot(c.status) + '<b class="num">' + v[0] + '</b></span><span class="ms">' + esc(v[1]) + '</span><span class="mconf ' + c.conf + '" title="Confidence ' + c.conf + '">' + CONF_SHORT[c.conf] + '</span></button><button class="info mi" data-act="prov" data-k="m_' + k + '" data-row="' + esc(row.lens + '|' + row.label) + '" aria-label="How this status is calculated">i</button></div>';
}
function matrixCard() {
  const lens = S.lens, rows = M.matrix[lens].concat(lens === 'region' ? [M.matrix.all] : []);
  const lb = (k, l) => '<button data-act="lens" data-l="' + k + '" aria-pressed="' + (lens === k) + '">' + l + '</button>';
  let h = '<div class="card mx-card" id="matrix"><div class="hd"><div><span class="kicker">Select any status to open the evidence behind it</span><h3>Where we stand, by ' + { region: 'region', industry: 'industry', size: 'customer size', product: 'product' }[lens] + '</h3></div><span class="hd-r"><div class="seg light-seg" role="group" aria-label="Group by">' + lb('region', 'Region') + lb('industry', 'Industry') + lb('size', 'Size') + lb('product', 'Product') + '</div></span></div>';
  h += '<div class="legend mlegend"><span>' + gdot('ok') + 'Green: on track</span><span>' + gdot('warn') + 'Amber: slipping</span><span>' + gdot('bad') + 'Red: off track</span><span>' + dot('none') + 'Not enough evidence</span><span><span class="mconf Medium">Med</span>Tag = confidence in the evidence (High, Med, Low)</span></div>';
  h += '<div class="mx"><div class="mh grp"></div>' + MCOLS.map((c) => '<div class="mh grp g-' + c[3].split(' ')[0].toLowerCase() + '">' + c[3] + '</div>').join('') + '<div class="mh"></div>' + MCOLS.map((c) => '<div class="mh"><b>' + c[1] + '</b><small>' + c[2] + '</small></div>').join('');
  rows.forEach((r) => { h += '<div class="mrow"><button class="mr' + (S.focus && S.focus.lens === r.lens && S.focus.label === r.label ? ' on' : '') + '" data-act="focus" data-l="' + r.lens + '" data-g="' + esc(r.label) + '" title="Show the accounts in this row"><b>' + esc(r.label) + '</b><small>' + (r.lens === 'product' ? 'all accounts' : r.n + ' accounts') + '</small></button>' + MCOLS.map((c) => mcell(r, c[0])).join('') + '</div>'; });
  return h + '</div></div>';
}
function treesCard() {
  if (!S.focus) return '';
  const rows = M.matrix[S.focus.lens].concat([M.matrix.all]), g = rows.find((x) => x.label === S.focus.label); if (!g) return '';
  const sev = (a) => ['lightGrow', 'lightRet', 'lightComp'].reduce((t, k) => t + (a[k] === 'bad' ? 2 : a[k] === 'warn' ? 1 : 0), 0), accs = g.accs.slice().sort((a, b) => sev(b) - sev(a) || b.arr_current - a.arr_current), show = S.allTrees ? accs : accs.slice(0, 8);
  const lt = (st, why) => '<span class="mini-l" data-tip="' + esc(why) + '">' + dot(st) + '</span>';
  return '<div class="card" id="trees"><div class="hd"><div><span class="kicker">Accounts in this row, worst first</span><h3>' + esc(g.label) + '</h3></div><span class="hd-r"><button class="btn sm" data-act="opengroup" data-l="' + g.lens + '" data-g="' + esc(g.label) + '">Open in Accounts</button><button class="x" data-act="focusclear" aria-label="Close">×</button></span></div><div class="tbl-wrap"><table><thead><tr><th>Account</th><th class="r">Yearly revenue $M</th><th>Retention</th><th>Growth execution</th><th>Rival exposure</th></tr></thead><tbody>' +
    show.map((a) => '<tr class="click" data-act="graph" data-id="' + a.account_id + '"><td><b>' + esc(a.account_name) + '</b><div class="sub">' + a.region + ' · ' + esc(a.industry_group) + ' · ' + a.size_tier + '</div></td><td class="r num">' + nf(a.arr_current, 1) + '</td><td>' + lt(a.lightRet, 'Health ' + a.health + '; renews in ' + a.renewalDays + ' days') + ' <span class="sub num">' + a.health + '</span></td><td>' + lt(a.lightGrow, a.growOpen ? pc(a.growShare, 0) + ' of open pipeline is healthy' : 'No open deals this or next quarter') + (a.lightGrow === 'none' ? ' <span class="sub">no open deals</span>' : '') + '</td><td>' + lt(a.lightComp, a.lost4 > 0 ? fm(a.lost4, 1) + ' lost to a named rival in four quarters' : 'No rival named') + (a.lost4 > 0 ? ' <span class="sub">' + fm(a.lost4, 1) + ' lost</span>' : '') + '</td></tr>').join('') + '</tbody></table></div>' + (accs.length > 8 ? '<div style="margin-top:10px"><button class="btn sm" data-act="alltrees">' + (S.allTrees ? 'Show the worst 8' : 'Show all ' + accs.length) + '</button></div>' : '') + '</div>';
}

// ---------- the map ----------
const CPOS = { US: [39, -98], CA: [56, -103], AR: [-36, -65], UK: [54, -2], DE: [51, 10], CH: [46.8, 8.2], FR: [46.6, 2.5], ES: [40, -3.7], NL: [52.2, 5.3], JP: [36.5, 138], KR: [36.5, 128], IN: [22, 79], AU: [-25, 134], SG: [1.35, 103.8] };
const CNAME = { US: 'United States', CA: 'Canada', AR: 'Argentina', UK: 'United Kingdom', DE: 'Germany', CH: 'Switzerland', FR: 'France', ES: 'Spain', NL: 'Netherlands', JP: 'Japan', KR: 'South Korea', IN: 'India', AU: 'Australia', SG: 'Singapore' };
const CREG = { US: 'Americas', CA: 'Americas', AR: 'Americas', UK: 'EMEA', DE: 'EMEA', CH: 'EMEA', FR: 'EMEA', ES: 'EMEA', NL: 'EMEA', JP: 'APAC', KR: 'APAC', IN: 'APAC', AU: 'APAC', SG: 'APAC' };
const MAP_METRICS = [['lost', 'Lost to a named rival', 'Yearly revenue of closed-lost deals that name a competitor, last four quarters'], ['open', 'Open deals naming a rival', 'Open pipeline where the CRM names a competitor (a mention, not a loss)']];
const CF = () => (S.accGroup || S.region !== 'All' ? M.compFor((o) => inReg(o.account.region) && inGrpO(o)) : M.comp);
function countryVal(c, metric) { const b = CF().byCountry[c]; return b ? (metric === 'lost' ? b.lost : b.openAmt) : 0; }
function tipOf(c, metric) {
  const b = CF().byCountry[c] || { lost: 0, n: 0, comps: {}, openAmt: 0, openN: 0 }, top = Object.entries(b.comps).sort((x, y) => y[1] - x[1])[0];
  if (metric === 'open') return b.openN ? b.openN + ' open deals name a rival, ' + fm(b.openAmt, 1) : 'No open deal names a rival';
  return b.n ? fm(b.lost, 1) + ' lost in ' + b.n + ' deals' + (top ? '; most often to ' + top[0] : '') : 'No recorded rival losses';
}
function mapSVG(metric, big) {
  const W = GEO.w, H = GEO.h, px = (la, lo) => [((lo - GEO.lon0) / (GEO.lon1 - GEO.lon0)) * W, ((GEO.lat1 - la) / (GEO.lat1 - GEO.lat0)) * H];
  const codes = Object.keys(CPOS), vals = codes.map((c) => countryVal(c, metric)), vmax = Math.max.apply(null, vals.concat([0.0001]));
  let s = '<svg class="map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="World map of rival exposure by country"><path class="land" d="' + GEO.land + '"/>';
  Object.keys(GEO.c).forEach((c) => { const v = countryVal(c, metric), k = v / vmax; s += '<path class="ctry' + (S.country === c ? ' sel' : '') + '" data-act="country" data-c="' + c + '" data-tip="' + esc('<b>' + CNAME[c] + '</b><br>' + tipOf(c, metric)) + '" d="' + GEO.c[c] + '" style="fill:' + (v > 0 ? 'color-mix(in srgb,var(--bad) ' + Math.round(16 + 62 * Math.sqrt(k)) + '%,var(--line-2))' : 'var(--line)') + '"/>'; });
  const nodes = codes.filter((c, i) => vals[i] > 0).map((c) => { const p = px(CPOS[c][0], CPOS[c][1]), v = countryVal(c, metric); return { c, x0: p[0], y0: p[1], x: p[0], y: p[1], r: 6 + (big ? 17 : 14) * Math.sqrt(v / vmax), v }; });
  for (let it = 0; it < 90; it++) for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01, m = a.r + b.r + 2; if (d < m) { const f = (m - d) / 2 / d; a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f; } }
  nodes.forEach((n) => { if (Math.hypot(n.x - n.x0, n.y - n.y0) > 5) s += '<line class="lead" x1="' + n.x0 + '" y1="' + n.y0 + '" x2="' + n.x + '" y2="' + n.y + '"/>'; });
  nodes.forEach((n) => { s += '<g class="bub" data-act="country" data-c="' + n.c + '" data-tip="' + esc('<b>' + CNAME[n.c] + '</b><br>' + tipOf(n.c, metric)) + '"><circle cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '"/>' + (n.r >= 11 ? '<text x="' + n.x + '" y="' + (n.y + 3.5) + '" text-anchor="middle">' + nf(n.v, 0) + '</text>' : '') + '</g>'; });
  return s + '</svg>';
}
function mapCard(opts) {
  const metric = S.mapMetric, mm = MAP_METRICS.find((x) => x[0] === metric), big = !(opts && opts.compact);
  return '<div class="card" id="map"><div class="hd"><div><span class="kicker">Rival exposure in this account book, not market share</span><h3>Where rivals show up</h3></div><span class="hd-r"><div class="seg light-seg" role="group" aria-label="Map measure">' + MAP_METRICS.map((m) => '<button data-act="mapmetric" data-m="' + m[0] + '" aria-pressed="' + (metric === m[0]) + '">' + m[1] + '</button>').join('') + '</div></span></div><div class="mapwrap">' + mapSVG(metric, big) + '</div><p class="sub" style="color:var(--ink-3);font-size:12px;margin:6px 0 0">' + esc(mm[2]) + '. Bubble = $M. Select a country.</p></div>';
}

// ---------- bridge ----------
function bridgeCard() {
  const rows = M.regions.concat(['All']).map((r) => ({ r, b: M.bridge[r] })), max = Math.max.apply(null, rows.map((x) => Math.max(x.b.plan, x.b.scenario))) * 1.04;
  const seg = (v, col, nm, x0, extra) => { const w = Math.max(0, (v / max) * 100); return { html: '<i data-tip="<b>' + nm + '</b><br>' + fm(v, 1) + '" style="left:' + x0 + '%;width:' + w + '%;background:' + col + (extra || '') + '"></i>', w }; };
  const bar = (b) => { let x = 0, h = ''; [[b.closed, 'var(--ink)', 'Closed so far'], [b.weighted, 'var(--peri)', 'Forecast: risk-weighted open deals'], [b.creation, 'var(--ink-3)', 'Assumed new pipeline (an assumption)']].forEach((p) => { const s = seg(p[0], p[1], p[2], x); h += s.html; x += s.w; }); const u = seg(b.incr, 'var(--ok)', 'Incremental upside if selected actions land', x, ';opacity:.55'); return '<div class="stack" style="height:22px">' + h + u.html + '<span class="tgt" style="left:' + (b.plan / max) * 100 + '%"></span></div>'; };
  return '<div class="card"><div class="hd"><div><span class="kicker">Net new yearly revenue booked this fiscal year, not recognized revenue</span><h3>Where the year lands</h3></div><span class="hd-r">' + infoBtn('bridge') + '</span></div>' +
    rows.map(({ r, b }) => '<div class="brow"><div class="bn"><b>' + (r === 'All' ? 'All regions' : r) + '</b></div><div>' + bar(b) + '<div class="bsum"><span>Plan <b class="num">' + fm(b.plan, 1) + '</b></span><span>Lands <b class="num">' + fm(b.landing, 1) + '</b></span><span class="' + (b.gap > 0 ? 'down' : 'up') + '">' + (b.gap > 0 ? 'Gap ' + fm(b.gap, 1) : 'Ahead ' + fm(-b.gap, 1)) + '</span><span class="up">+' + fm(b.incr, 1) + ' incremental</span></div></div></div>').join('') +
    '<div class="legend" style="margin-top:8px"><span><i style="background:var(--ink)"></i>Closed</span><span><i style="background:var(--peri)"></i>Forecast</span><span><i style="background:var(--ink-3)"></i>Assumed new pipeline</span><span><i style="background:var(--ok);opacity:.55"></i>Incremental upside</span><span><i style="background:var(--ink);width:3px;height:12px;border-radius:0"></i>Plan</span></div>' +
    more('Show the arithmetic', bridgeTable()) + '</div>';
}
function bridgeTable() {
  const r = M.regions.concat(['All']), cell = (f) => r.map((k) => '<td class="r num">' + f(M.bridge[k]) + '</td>').join('');
  const L = (t, f, cls) => '<tr class="' + (cls || '') + '"><td>' + t + '</td>' + cell(f) + '</tr>', sec = (t) => '<tr><td colspan="' + (r.length + 1) + '" class="sub" style="background:var(--surface-2)"><b>' + t + '</b></td></tr>';
  return '<div class="tbl-wrap"><table><thead><tr><th>$M, net new yearly revenue booked</th>' + r.map((k) => '<th class="r">' + k + '</th>').join('') + '</tr></thead><tbody>' +
    L('Plan for the year', (b) => nf(b.plan, 1)) + L('Closed so far (elapsed periods)', (b) => nf(b.closed, 1)) + L('Forecast for what remains: risk-weighted open deals', (b) => nf(b.weighted, 1)) + L('Forecast for what remains: assumed new pipeline', (b) => nf(b.creation, 1)) +
    L('<b>Expected landing</b>', (b) => '<b>' + nf(b.landing, 1) + '</b>', 'tot') + L('<b>Gap to plan</b>', (b) => '<b>' + nf(b.gap, 1) + '</b>', 'tot') + sec('Opportunity pool, split so nothing is counted twice') +
    L('Open deals this and next quarter, unweighted', (b) => nf(b.grossOpen, 1)) + L('Expansion customers asked for, no deal yet', (b) => nf(b.asksG, 1)) + L('<b>Gross eligible pool</b>', (b) => '<b>' + nf(b.grossPool, 1) + '</b>', 'tot') +
    L('Already in the forecast', (b) => nf(b.weighted, 1)) + L('Open deals not expected to close', (b) => nf(b.remainder, 1)) + L('&nbsp;&nbsp;of which fixable by a sponsor or fresh contact', (b) => nf(b.fixPot, 1)) + sec('Incremental to the forecast, if the selected actions succeed') +
    L('Fixable deals x ' + pc(M.lv.sponsor_push_success_rate, 0) + ' success', (b) => nf(b.fixAct, 1)) + L('Expansion x ' + pc(M.lv.expansion_conversion_rate, 0) + ' conversion x ' + pc(M.lv.expansion_in_year_share, 0) + ' closing this year', (b) => nf(b.askIn, 1)) +
    L('<b>Incremental upside this year</b>', (b) => '<b>' + nf(b.incr, 1) + '</b>', 'tot') + L('Expansion that lands next year instead', (b) => nf(b.askLater, 1)) + L('<b>Scenario landing</b>', (b) => '<b>' + nf(b.scenario, 1) + '</b>', 'tot') +
    '</tbody></table></div><p class="note" style="margin-top:10px">Only the fixable and expansion lines are added to the forecast, at the rates shown. Both rates are assumptions you can change. Pipeline is not revenue and bookings are not recognized revenue.</p>';
}

// ---------- decisions and actions ----------
const aStatus = (id) => (desk.actionStatus || {})[id] || 'Pending';
function impactChip(a) {
  if (a.modeled == null) return '<span class="imp un">Unquantified</span>';
  const unit = { bookings: 'new sales', retention: 'renewals kept', pipeline: 'pipeline to create' }[a.kind];
  return '<span class="imp mod">' + (a.kind === 'pipeline' ? '' : '+') + fm(a.modeled, 1) + ' ' + unit + ' · estimate</span>';
}
function actionRow(a) {
  const st = aStatus(a.id), cro = S.role === 'cro';
  return '<div class="act"><div class="ah"><div class="at"><b>' + esc(a.title) + '</b><div class="am">' + impactChip(a) + '<span class="cf ' + a.conf + '">Confidence ' + a.conf + '</span><span class="sub">' + esc(a.owner) + '</span><span class="sub num">Due ' + dateFmt(a.due) + '</span></div></div><div class="aa">' + (st === 'Approved' ? '<span class="appr ok">Approved</span>' : st === 'Rejected' ? '<span class="appr bad">Deferred</span>' : cro ? '<button class="btn red sm" data-act="aset" data-id="' + a.id + '" data-v="Approved">Approve</button><button class="btn sm" data-act="aset" data-id="' + a.id + '" data-v="Rejected">Defer</button>' : '<span class="appr">Awaiting leadership</span>') + '</div></div>' +
    '<details class="ad"><summary>Details</summary><div class="adg"><div><span class="k">Problem</span>' + esc(a.problem) + '</div><div><span class="k">Proposed decision</span>' + esc(a.decision) + '</div><div><span class="k">Metric affected</span>' + esc(a.metric) + '</div><div><span class="k">How the impact is estimated</span>' + esc(a.basis) + (a.additive === false ? ' <b>Not additive.</b>' : '') + '</div>' + (a.observed ? '<div><span class="k">Observed</span>' + esc(a.observed) + '</div>' : '') + '<div><span class="k">Depends on</span>' + (a.deps.length ? esc(a.deps.join('; ')) : 'Nothing outside the team') + '</div><div><span class="k">Approval</span>' + st + '</div></div><div class="ad-links"><button class="linkbtn" data-act="hgo" data-go="' + a.go.join('|') + '">Open the evidence</button>' + (a.accountId ? '<button class="linkbtn" data-act="opencoach" data-id="' + a.accountId + '">Open the seller coach</button>' : '') + '</div></details></div>';
}
function actionsCard() {
  const h = S.horizon || 'now', list = M.actions.filter((a) => a.h === h), sums = {};
  list.filter((a) => a.modeled != null && a.additive !== false).forEach((a) => (sums[a.kind] = (sums[a.kind] || 0) + a.modeled));
  const tot = Object.keys(sums).map((k) => ({ bookings: 'Bookings', retention: 'Revenue protected', pipeline: 'Pipeline to create' }[k] + ' ' + fm(sums[k], 1))).join(' · ');
  return '<div class="card"><div class="hd"><div><span class="kicker">Route guidance · owner, date and approval on every action</span><h3>Actions by horizon</h3></div><span class="hd-r"><div class="seg light-seg" role="group" aria-label="Horizon">' + ['now', 'next', 'later'].map((k) => '<button data-act="horizon" data-h="' + k + '" aria-pressed="' + (h === k) + '">' + M.horizons[k].range + '</button>').join('') + '</div></span></div><div class="hsumm"><b>' + M.horizons[h].label + '</b>' + (tot ? '<span class="sub">Modeled, kinds not added together: ' + esc(tot) + '</span>' : '<span class="sub">Nothing quantified in this horizon</span>') + '</div><div class="alist">' + list.map(actionRow).join('') + '</div></div>';
}

// ---------- the execution loop ----------
const LOOP_SEED = { authorized: 14, started: 11, completed: 9, resolved: 7, reviewed: 6, accepted: 5, buyer: 4 };
function loopCounts() {
  const ss = desk.coach.sessions || [], auth = Object.values(desk.actionStatus || {}).filter((v) => v === 'Approved').length;
  return [['Move approved', LOOP_SEED.authorized + auth], ['Seller started the coach', LOOP_SEED.started + ss.length], ['Seller finished the coach', LOOP_SEED.completed + ss.filter((x) => x.done).length], ['Missing information resolved', LOOP_SEED.resolved + ss.filter((x) => x.resolved).length], ['Seller reviewed the brief and deck', LOOP_SEED.reviewed + ss.filter((x) => x.reviewed).length], ['Seller accepted the action', LOOP_SEED.accepted + ss.filter((x) => x.accepted).length], ['Buyer next step recorded', LOOP_SEED.buyer + ss.filter((x) => x.buyerNext).length]];
}
function loopCard() {
  const c = loopCounts(), mx_ = Math.max.apply(null, c.map((x) => x[1])), D_ = ['You approved a move', 'A seller opened the guided coach', 'The seller finished the coach', 'A gap was closed (a sponsor named, a baseline obtained)', 'The seller reviewed the brief and deck', 'The seller accepted the recommended action', 'The buyer agreed a dated next step'];
  return '<div class="card" id="loop"><div class="hd"><div><span class="kicker">Is the plan turning into seller action?</span><h3>Execution loop</h3></div><span class="hd-r">' + infoBtn('loop') + '</span></div><p class="sub" style="color:var(--ink-2);margin:-4px 0 10px;font-size:13px">Each bar counts how many reached that step. Pilot sample plus what you do in this demo: <button class="linkbtn" data-act="opencoach" data-id="' + M.coachAccountId + '">run the coach</button> and watch the counts move.</p><div class="lgroup"><b>What we did</b><span>leading: visible within weeks</span></div>' +
    c.map((x, i) => '<div class="lrow"><span class="ln">' + (i + 1) + '</span><span class="lt2"><b>' + x[0] + '</b><small>' + D_[i] + '</small></span><div class="lb"><i style="width:' + Math.max(4, (x[1] / mx_) * 100) + '%"></i></div><span class="lv num">' + x[1] + '</span></div>').join('') +
    '<div class="lgroup lag"><b>What happened</b><span>lagging: takes about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days</span></div><div class="lrow pend"><span class="ln">8</span><span class="lt2"><b>Revenue outcome</b><small>Expansion won, renewal saved. Not yet observed, so none is claimed</small></span><div class="lb"><i></i></div><span class="lv">-</span></div></div>';
}

// ---------- the CRO Hub: the 50,000-foot view. Four numbers, three regions, three moves, one proof. ----------
const stDot = (st) => (['ok', 'warn', 'bad'].includes(st) ? st : 'none');
const RWORD = { ok: 'On track', warn: 'Watch', bad: 'Act now', insufficient: 'Thin data', na: 'n/a', none: 'No data' };
const SHORT = { perf: 'To date', fcst: 'Forecast', ret: 'Retention', grow: 'Pipeline', comp: 'Rivals' };
const RANK = { bad: 3, warn: 2, ok: 1 };
const worstOf = (...sts) => sts.reduce((w, x) => ((RANK[x] || 0) > (RANK[w] || 0) ? x : w), 'insufficient');
function reasonPhrase(k, c) {
  if (k === 'perf') return 'Behind plan to date: ' + pc(c.value, 0);
  if (k === 'fcst') return 'Forecast is ' + pc(c.value, 0) + ' of the full-year plan';
  if (k === 'ret') return fm(c.atRisk, 1) + ' of revenue at risk';
  if (k === 'grow') return 'Only ' + pc(c.value, 0) + ' of pipeline is healthy';
  return pc(c.value, 0) + ' of open pipeline names a rival';
}
function overallOf(row) {
  let best = null;
  MCOLS.forEach((c) => { const x = row[c[0]], r = RANK[x.status] || 0; if (r && (!best || r > best.r)) best = { r, st: x.status, k: c[0], x }; });
  return best || { r: 0, st: 'insufficient', k: 'fcst', x: row.fcst };
}
// the four measures a region card shows, in plain words. "Forecast vs actuals" joins what has closed so far with where the year is forecast to land.
const HM = [['fva', 'Forecast vs actuals'], ['ret', 'Retention'], ['grow', 'Pipeline'], ['comp', 'Competitive positioning']];
function hMeasure(row, k) {
  if (k === 'fva') {
    const p = row.perf, f = row.fcst, st = worstOf(p.status, f.status);
    return { st, k: 'fcst', text: p.status === 'insufficient' ? 'Too few closed deals yet' : fm(p.actual, 1) + ' closed against ' + fm(p.elapsed, 1) + ' planned so far' };
  }
  const c = row[k]; if (!c || c.status === 'insufficient' || c.status === 'na') return { st: 'insufficient', k, text: 'Not enough deals to judge' };
  return { st: c.status, k, text: k === 'ret' ? fm(c.atRisk, 1) + ' of revenue at risk' : k === 'grow' ? pc(c.value, 0) + ' of open pipeline is healthy' : pc(c.value, 0) + ' of open pipeline names a rival' };
}
const hdrill = (row, k) => 'data-act="mdrill" data-lens="' + row.lens + '" data-g="' + esc(row.label) + '" data-k="' + k + '"';
function hMeasureRows(row) {
  return '<div class="hm" role="group" aria-label="Measures for ' + esc(row.label) + '">' + HM.map((m) => { const x = hMeasure(row, m[0]); return '<button class="hmr" ' + hdrill(row, x.k) + ' aria-label="' + esc(row.label + ', ' + m[1] + ', ' + RWORD[x.st] + ', ' + x.text) + '"><span class="hml">' + m[1] + '</span><span class="hmv">' + esc(x.text) + '</span><span class="hms ' + stDot(x.st) + '">' + (RANK[x.st] ? gdot(x.st) : dot('none')) + RWORD[x.st] + '</span></button>'; }).join('') + '</div>';
}
function hOverall(row) { const sts = HM.map((m) => hMeasure(row, m[0])), st = worstOf.apply(null, sts.map((x) => x.st)), w = sts.find((x) => x.st === st) || sts[0]; return { st, k: w.k }; }
function regionCard(row) {
  const b = M.bridge[row.label], o = hOverall(row), max = Math.max(b.plan, b.landing) * 1.08;
  return '<div class="rc ' + stDot(o.st) + (S.region === row.label ? ' on' : '') + '"><button class="rc-main" ' + hdrill(row, o.k) + '><span class="rc-top"><b>' + esc(row.label) + '</b><span class="rs">' + dot(stDot(o.st)) + RWORD[o.st] + '</span></span><span class="rc-big"><b class="num">' + fm(b.landing, 1) + '</b><small>forecast · plan ' + fm(b.plan, 1) + '</small></span><span class="rc-bar"><i style="width:' + (b.landing / max) * 100 + '%"></i><u style="left:' + (b.plan / max) * 100 + '%"></u></span></button>' + hMeasureRows(row) + '</div>';
}
// the five steps from the deck, as a thin strip: each opens the place where that step is done
function stepStrip(pending) {
  const st = (n, name, line, attrs, now) => '<button class="stp' + (now ? ' now' : '') + '" ' + attrs + '><span class="stn">' + n + '</span><span class="stt"><b>' + name + '</b><small>' + line + '</small></span></button>';
  return '<nav class="steps" aria-label="The five steps">' + st(1, 'See', 'Where revenue is heading', 'data-act="tab" data-t="revenue"') + st(2, 'Find', 'Where it can change', 'data-act="tab" data-t="regprod"') + st(3, 'Decide', 'Approve a move', 'data-act="scrollto" data-to="moves"', pending > 0) + st(4, 'Guide', 'Equip the seller', 'data-act="tab" data-t="guided"', pending === 0) + st(5, 'Prove', 'Did it lift revenue', 'data-act="scrollto" data-to="prove"') + '</nav>';
}

// the next three moves: plain titles, one line of impact, and the detail one click away
const HUB_MOVE = {
  reframe: { title: (a) => 'Reframe the Contact Center pitch on ' + (a.title.match(/\d+/) || ['these'])[0] + ' deals', what: 'These Contact Center deals name a rival or have no senior leader behind them. Contact Center wins about a quarter of the deals it decides.', does: 'Each seller leads the pitch with the customer\'s own priority and a quantified business case instead of a feature comparison. Product marketing supplies proof points. Nothing is sent to a customer.', why: (a, L) => 'Based on this book\'s past deals. We assume ' + pc(L.sponsor_push_success_rate, 0) + ' of these deals respond. Medium because that rate is an assumption.' },
  sponsor: { title: (a) => 'Get a senior customer leader behind ' + (a.title.match(/\d+/) || ['these'])[0] + ' open deals', what: 'No senior person at the customer is backing these deals. Deals like this close less often and slip more often.', does: 'Each deal goes on its seller\'s task list with a guided coach. The seller asks for a meeting with a senior leader at the customer. Nothing is sent to a customer.', why: (a, L) => 'Based on this book\'s past deals: the win chance rises when a senior customer leader is involved. We assume ' + pc(L.sponsor_push_success_rate, 0) + ' of these deals respond. Medium because that rate is an assumption and the sample of comparable deals is modest.' },
  rescue: { title: (a) => 'Rescue ' + (a.title.match(/\d+/) || ['these'])[0] + ' renewals that are slipping', what: 'These customers renew soon and their health score is low (falling usage, quiet calls, stalled delivery).', does: 'Customer success managers book an executive check-in and an adoption sprint with each customer before a renewal quote goes out.', why: (a, L) => 'Health combines usage, calls and delivery status from four feeds. We assume ' + pc(L.renewal_rescue_save_rate, 0) + ' of at-risk revenue is saved. Medium because the save rate is an assumption.' },
  asks: { title: (a) => 'Open ' + (a.title.match(/\d+/) || ['these'])[0] + ' expansion deals customers asked for', what: 'Healthy customers asked about another Zoom product on calls, but nobody has opened a deal.', does: 'Sellers create the opportunities and run the expansion coach on each one.', why: (a, L) => 'These asks come from call transcripts, not from signed intent. We assume ' + pc(L.expansion_conversion_rate, 0) + ' convert and only ' + pc(L.expansion_in_year_share, 0) + ' of those close this year. Low because both rates are assumptions.' }
};
const hMove = (a) => HUB_MOVE[a.id] || { title: (x) => x.title, what: a.problem, does: a.decision, why: () => 'Confidence ' + a.conf + '.' };
function moveRow(a, i) {
  const st = aStatus(a.id), hm = hMove(a), cro = S.role === 'cro';
  const act = st === 'Approved' ? '<span class="appr ok">Approved</span>' + (a.accountId ? '<button class="btn sm red" data-act="opencoach" data-id="' + a.accountId + '">Guide the seller</button>' : '') : st === 'Rejected' ? '<span class="appr bad">Deferred</span>' : '';
  return '<div class="move"><span class="mn">' + (i + 1) + '</span><div class="mb"><b>' + esc(hm.title(a)) + '</b><div class="mm">' + impactChip(a) + '<span class="cf ' + a.conf + '">Confidence: ' + a.conf + '</span></div></div><div class="ma">' + act + '<button class="btn sm' + (st === 'Pending' && cro ? ' red' : ' ghost') + '" data-act="mv-open" data-id="' + a.id + '">' + (st === 'Pending' ? (cro ? 'Review' : 'Details') : 'Details') + '</button></div></div>';
}
function moveDetail(id) {
  const a = M.actions.find((x) => x.id === id); if (!a) return '';
  const hm = hMove(a), st = aStatus(a.id), cro = S.role === 'cro', L = M.lv;
  const unit = { bookings: 'new sales', retention: 'renewals kept', pipeline: 'pipeline to create' }[a.kind];
  return '<div class="panel-hd"><div><span class="kicker">Next move · ' + M.horizons[a.h].range + '</span><h3>' + esc(hm.title(a)) + '</h3></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="panel-bd">' +
    '<div class="mv-blk"><h4>What is going on</h4><p>' + esc(hm.what) + '</p><p class="mv-fact">' + esc(a.problem) + '.' + (a.who ? ' Largest: ' + esc(a.who) + '.' : '') + '</p></div>' +
    '<div class="mv-blk"><h4>What approving does</h4><p>' + esc(hm.does) + '</p><p class="mv-fact">Owner: ' + esc(a.owner) + ' · due ' + dateFmt(a.due) + '</p></div>' +
    '<div class="mv-blk"><h4>Expected impact</h4><p>' + (a.modeled == null ? 'Not estimated.' : '<b>' + (a.kind === 'pipeline' ? '' : '+') + fm(a.modeled, 1) + ' ' + unit + '</b> (an estimate, not a result)') + '</p><p class="mv-fact">' + esc(a.basis) + '</p></div>' +
    '<div class="mv-blk"><h4>Confidence: ' + a.conf + '</h4><p>' + esc(hm.why(a, L)) + '</p>' + (a.observed ? '<p class="mv-fact">' + esc(a.observed) + '</p>' : '') + '</div>' +
    '<div class="mv-act">' + (st === 'Approved' ? '<span class="appr ok">Approved</span>' + (a.accountId ? '<button class="btn red" data-act="opencoach" data-id="' + a.accountId + '">Guide the seller</button>' : '') : st === 'Rejected' ? '<span class="appr bad">Deferred</span><button class="btn" data-act="mv-set" data-id="' + a.id + '" data-v="Approved">Approve instead</button>' : cro ? '<button class="btn red" data-act="mv-set" data-id="' + a.id + '" data-v="Approved">Approve this move</button><button class="btn" data-act="mv-set" data-id="' + a.id + '" data-v="Rejected">Defer</button>' : '<span class="appr">Waiting for the CRO</span>') + '<button class="btn ghost" data-act="hgo" data-go="' + a.go.join('|') + '">See the deals</button></div></div>';
}

// proof: did the five steps lift revenue? Each box counts one step; revenue comes last because it lags.
function proveCard() {
  const c = loopCounts(), co = M.cohort, lag = nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0);
  const steps = [['Approved', c[0][1], 'moves you approved'], ['Started', c[1][1], 'sellers who opened the guided coach'], ['Completed', c[2][1], 'sellers who finished it'], ['Accepted', c[5][1], 'sellers who took the advice'], ['Buyer step', c[6][1], 'buyers who agreed a dated next step']];
  return '<div class="card" id="prove"><div class="hd"><div><span class="kicker">Step 5 · Prove</span><h3>Did execution improve, and is it lifting revenue?</h3></div><span class="hd-r">' + infoBtn('loop') + '</span></div>' +
    '<div class="pv">' + steps.map((x) => '<div class="pvs"><b class="num">' + x[1] + '</b><span>' + x[0] + '</span><small>' + x[2] + '</small></div>').join('') + '<div class="pvs pend"><b>Not yet</b><span>Revenue</span><small>lags about ' + lag + ' days</small></div></div>' +
    '<p class="pv-read"><b>Early read:</b> pilot sellers have a senior customer leader on ' + pc(co.pilot.exec, 0) + ' of their deals, against ' + pc(co.control.exec, 0) + ' for other sellers. Revenue is not claimed until it shows up in closed deals.</p>' +
    '<div class="pv-act"><button class="btn sm" data-act="opencoach" data-id="' + anchorId() + '">Try the coach as a seller</button></div></div>';
}
const wk = (key, title, html) => '<div id="' + key + '"><details class="more" data-k="' + key + '"' + (S.open[key] ? ' open' : '') + '><summary>' + title + '</summary><div class="more-b">' + html + '</div></details></div>';
