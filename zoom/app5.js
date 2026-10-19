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
function tierBar() {
  const ls = curLanes();
  return (ls.length ? '<div class="lanebar"><div class="lanes" title="Revenue outcomes are what we get, sales execution is what sellers do, competition is who we meet">' + ['outcome', 'exec', 'comp'].map((k) => laneChip(k, ls.includes(k))).join('') + '</div></div>' : '') + filterBar();
}
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
  const unit = { bookings: 'bookings', retention: 'revenue protected', pipeline: 'pipeline to create' }[a.kind];
  return '<span class="imp mod">' + (a.kind === 'pipeline' ? '' : '+') + fm(a.modeled, 1) + ' ' + unit + ' · Modeled</span>';
}
function actionRow(a) {
  const st = aStatus(a.id), cro = S.role === 'cro';
  return '<div class="act"><div class="ah"><div class="at"><b>' + esc(a.title) + '</b><div class="am">' + impactChip(a) + '<span class="cf ' + a.conf + '">Confidence ' + a.conf + '</span><span class="sub">' + esc(a.owner) + '</span><span class="sub num">Due ' + dateFmt(a.due) + '</span></div></div><div class="aa">' + (st === 'Approved' ? '<span class="appr ok">Authorized</span>' : st === 'Rejected' ? '<span class="appr bad">Rejected</span>' : cro ? '<button class="btn red sm" data-act="aset" data-id="' + a.id + '" data-v="Approved">Authorize</button><button class="btn sm" data-act="aset" data-id="' + a.id + '" data-v="Rejected">Reject</button>' : '<span class="appr">Awaiting leadership</span>') + '</div></div>' +
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
  return [['Intervention authorized', LOOP_SEED.authorized + auth], ['Coach started', LOOP_SEED.started + ss.length], ['Coach completed', LOOP_SEED.completed + ss.filter((x) => x.done).length], ['Missing information resolved', LOOP_SEED.resolved + ss.filter((x) => x.resolved).length], ['Asset reviewed', LOOP_SEED.reviewed + ss.filter((x) => x.reviewed).length], ['Action accepted', LOOP_SEED.accepted + ss.filter((x) => x.accepted).length], ['Buyer next step recorded', LOOP_SEED.buyer + ss.filter((x) => x.buyerNext).length]];
}
function loopCard() {
  const c = loopCounts(), mx_ = Math.max.apply(null, c.map((x) => x[1])), D_ = ['A leader approved an action', 'A seller opened the coach', 'The seller finished the coach', 'A gap was closed (a sponsor named, a baseline obtained)', 'The seller reviewed the brief and deck', 'The seller accepted the recommended action', 'The buyer agreed a dated next step'];
  return '<div class="card" id="loop"><div class="hd"><div><span class="kicker">Is the plan turning into seller action?</span> ' + gMine() + '<h3>Execution loop</h3></div><span class="hd-r">' + infoBtn('loop') + '</span></div><p class="sub" style="color:var(--ink-2);margin:-4px 0 10px;font-size:13px">Each bar counts how many reached that step. Pilot sample plus what you do in this demo: <button class="linkbtn" data-act="opencoach" data-id="' + M.coachAccountId + '">run the coach</button> and watch the counts move.</p><div class="lgroup"><b>What we did</b><span>leading: visible within weeks</span></div>' +
    c.map((x, i) => '<div class="lrow"><span class="ln">' + (i + 1) + '</span><span class="lt2"><b>' + x[0] + '</b><small>' + D_[i] + '</small></span><div class="lb"><i style="width:' + Math.max(4, (x[1] / mx_) * 100) + '%"></i></div><span class="lv num">' + x[1] + '</span></div>').join('') +
    '<div class="lgroup lag"><b>What happened</b><span>lagging: takes about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days</span></div><div class="lrow pend"><span class="ln">8</span><span class="lt2"><b>Revenue outcome</b><small>Expansion won, renewal saved. Not yet observed, so none is claimed</small></span><div class="lb"><i></i></div><span class="lv">-</span></div></div>';
}

// ---------- the Command page: the number, the route, the moves ----------
const stDot = (st) => (['ok', 'warn', 'bad'].includes(st) ? st : 'none');
const RWORD = { ok: 'On track', warn: 'Watch', bad: 'Act now', insufficient: 'Thin data', na: 'n/a', none: 'No data' };
const SHORT = { perf: 'To date', fcst: 'Forecast', ret: 'Retention', grow: 'Pipeline', comp: 'Rivals' };
function reasonPhrase(k, c) {
  if (k === 'perf') return 'Behind plan to date: ' + pc(c.value, 0);
  if (k === 'fcst') return 'Forecast is ' + pc(c.value, 0) + ' of the full-year plan';
  if (k === 'ret') return fm(c.atRisk, 1) + ' of revenue at risk';
  if (k === 'grow') return 'Only ' + pc(c.value, 0) + ' of pipeline is healthy';
  return pc(c.value, 0) + ' of open pipeline names a rival';
}
function overallOf(row) {
  const rank = { bad: 3, warn: 2, ok: 1 }; let best = null;
  MCOLS.forEach((c) => { const x = row[c[0]], r = rank[x.status] || 0; if (r && (!best || r > best.r)) best = { r, st: x.status, k: c[0], x }; });
  return best || { r: 0, st: 'insufficient', k: 'fcst', x: row.fcst };
}
function regionCard(row) {
  const b = M.bridge[row.label], o = overallOf(row), max = Math.max(b.plan, b.landing) * 1.08, drill = (k) => 'data-act="mdrill" data-lens="region" data-g="' + esc(row.label) + '" data-k="' + k + '"';
  const dots = MCOLS.map((c) => { const x = row[c[0]], v = x.status === 'na' || x.status === 'insufficient' ? null : mval(c[0], x); return '<button class="rd ' + stDot(x.status) + '" ' + drill(c[0]) + ' title="' + esc(c[1] + ': ' + (v ? v[0] + ' · ' + v[1] + ' · ' : '') + (RWORD[x.status] || '')) + '" aria-label="' + esc(row.label + ', ' + c[1] + ', ' + (RWORD[x.status] || '')) + '"><i class="dot ' + stDot(x.status) + '"></i><span>' + SHORT[c[0]] + '</span></button>'; }).join('');
  return '<div class="rc ' + stDot(o.st) + (S.region === row.label ? ' on' : '') + '"><button class="rc-main" ' + drill(o.k) + '><span class="rc-top"><b>' + esc(row.label) + '</b><span class="rs">' + dot(stDot(o.st)) + RWORD[o.st] + '</span></span><span class="rc-big"><b class="num">' + fm(b.landing, 1) + '</b><small>expected, of ' + fm(b.plan, 1) + ' plan</small></span><span class="rc-bar"><i style="width:' + (b.landing / max) * 100 + '%"></i><u style="left:' + (b.plan / max) * 100 + '%"></u></span><span class="rc-why">' + (o.st === 'ok' ? 'All five measures on track' : esc(reasonPhrase(o.k, o.x))) + '</span></button><div class="rc-dots" role="group" aria-label="The five measures for ' + esc(row.label) + '">' + dots + '</div></div>';
}
function motionRail(B, R, pending) {
  const c = loopCounts(), review = R.reduce((t, r) => t + MCOLS.filter((m) => ['bad', 'warn'].includes(r[m[0]].status)).length, 0);
  const step = (n, name, line, stat, attrs, next) => '<li><button class="ms' + (next ? ' next' : '') + '" ' + attrs + '><span class="mnum">' + n + '</span><span class="mtx"><b>' + name + '</b><span class="ml">' + line + '</span></span><span class="mv num">' + stat + '</span>' + (next ? '<span class="mtag">Your move</span>' : '') + '</button></li>';
  return '<section class="rail"><div class="sec-h"><h3>The route</h3><span class="muted">From the number to the seller to proof. Each step opens its tab.</span></div><ol class="motion">' +
    step(1, 'See', 'Where revenue is heading', gfm(GM.forecast) + ' forecast', 'data-act="tab" data-t="revenue"') +
    step(2, 'Find', 'Where it can change', review + ' to review', 'data-act="tab" data-t="regprod"') +
    step(3, 'Decide', 'Authorize the move', pending ? pending + ' waiting' : 'All authorized', 'data-act="scrollto" data-to="moves"', pending > 0) +
    step(4, 'Guide', 'Equip the seller', c[2][1] + ' coached', 'data-act="tab" data-t="guided"', pending === 0) +
    step(5, 'Prove', 'Did execution improve', c[5][1] + ' accepted', 'data-act="scrollto" data-to="prove"') + '</ol></section>';
}
function moveRow(a, i) {
  const st = aStatus(a.id), cro = S.role === 'cro', ev = '<button class="btn sm ghost" data-act="hgo" data-go="' + a.go.join('|') + '">Evidence</button>', guide = a.accountId ? '<button class="btn sm' + (st === 'Approved' ? ' red' : ' ghost') + '" data-act="opencoach" data-id="' + a.accountId + '">Guide the seller</button>' : '';
  const act = st === 'Approved' ? '<span class="appr ok">Authorized</span>' + guide + ev : st === 'Rejected' ? '<span class="appr bad">Rejected</span>' + ev : (cro ? '<button class="btn red sm" data-act="aset" data-id="' + a.id + '" data-v="Approved">Authorize</button>' : '<span class="appr">Awaiting leadership</span>') + guide + ev;
  return '<div class="move"><span class="mn">' + (i + 1) + '</span><div class="mb"><b>' + esc(a.title) + '</b><div class="mm">' + impactChip(a) + '<span class="cf ' + a.conf + '">Confidence ' + a.conf + '</span><span class="sub">' + M.horizons[a.h].range + '</span></div></div><div class="ma">' + act + '</div></div>';
}
function proveCard() {
  const c = loopCounts(), pick = [['Actions authorized', c[0][1]], ['Coaches started', c[1][1]], ['Actions accepted by sellers', c[5][1]], ['Buyer next steps agreed', c[6][1]]], mx = Math.max.apply(null, pick.map((x) => x[1]));
  return '<div class="card" id="prove"><div class="hd"><div><h3>Is it working?</h3><span class="kicker">Does the plan turn into seller action?</span></div><span class="hd-r">' + infoBtn('loop') + '</span></div>' +
    pick.map((x) => '<div class="prow"><span>' + x[0] + '</span><div class="lb"><i style="width:' + Math.max(4, (x[1] / mx) * 100) + '%"></i></div><b class="num">' + x[1] + '</b></div>').join('') +
    '<div class="prow pend"><span>Revenue outcome</span><div class="lb"><i></i></div><b>-</b></div><p class="muted sm">Revenue lags by about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days, so none is claimed yet. Pilot sample plus what you do in this demo.</p></div>';
}
const wk = (key, title, html) => '<div id="' + key + '"><details class="more" data-k="' + key + '"' + (S.open[key] ? ' open' : '') + '><summary>' + title + '</summary><div class="more-b">' + html + '</div></details></div>';
function viewCommand() {
  const R = M.matrix.region, A = M.matrix.all, row = S.region === 'All' ? A : (R.find((r) => r.label === S.region) || A), B = M.bridge[row === A ? 'All' : row.label] || M.bridge.All;
  const reds = R.flatMap((r) => MCOLS.filter((c) => r[c[0]].status === 'bad').map((c) => r.label + ' ' + c[1].toLowerCase()));
  const picks = ['sponsor', 'rescue', 'asks'].map((id) => M.actions.find((a) => a.id === id)).filter(Boolean), pending = picks.filter((a) => aStatus(a.id) === 'Pending').length;
  const gR = S.region === 'All' ? { fc: GM.forecast, up: GM.uplift } : gRegion(S.region);
  const q = (w, big, d, st, go) => '<button class="q2 ' + stDot(st) + '" data-act="hgo" data-go="' + go + '"><span class="qk">' + dot(stDot(st)) + w + '</span><b class="qv num">' + big + '</b><span class="qd">' + d + '</span></button>';
  const head = '<section class="answer" id="ans"><span class="kicker">' + M.curQ + ' · ' + M.cur.daysLeft + ' days left' + (S.region !== 'All' ? ' · ' + esc(S.region) : '') + '</span><h2>Baseline forecast ' + gfm(gR.fc, S.region === 'All' ? 0 : 1) + ', ' + gfm(gR.fc + gR.up, S.region === 'All' ? 0 : 1) + ' with Databook. <span class="h2s">Net-new bookings land at ' + fm(B.landing) + ' against a ' + fm(B.plan) + ' plan' + (B.gap > 0 ? ', ' + fm(B.gap, 1) + ' short' : '') + '.' + (B.incr > 0 ? ' ' + fm(B.incr, 1) + ' more is within reach.' : '') + '</span></h2>' +
    '<div class="qrow2">' + q('Track', pc(row.perf.value, 0), 'of the plan due by today', row.perf.status, 'tab|forecast') + q('Grow', '+' + fm(B.incr, 1), 'upside if two actions land', 'ok', 'accfocus|priority') + q('Recover', fm(row.ret.atRisk || 0, 1), 'of revenue at risk', row.ret.status, 'accfocus|priority') + q('Compete', pc(row.comp.value, 0), 'of open pipeline names a rival', row.comp.status, 'gosub-compete|map') + '</div>' +
    '<details class="why"><summary>Why this matters</summary><p>Closed so far plus the risk-weighted forecast gives the landing. Upside is only what a named action could add beyond the forecast, at assumed success rates, and is not in the forecast today. Red now: ' + (reds.join('; ') || 'none') + '.' + whatifNote() + '</p></details></section>';
  const regions = '<section id="regions"><div class="sec-h"><h3>Where it stands</h3><button class="linkbtn" data-act="scrollto" data-to="measures">All measures</button></div><div class="rgrid">' + R.map(regionCard).join('') + '</div></section>';
  const moves = '<section id="moves"><div class="sec-h"><h3>Your next three moves</h3><span class="muted">Authorize, then guide the seller</span></div><div class="card flush">' + picks.map(moveRow).join('') + '</div></section>';
  const working = '<section class="working"><div class="sec-h"><h3>The working</h3><span class="muted">Everything above is built from these</span></div>' +
    wk('measures', 'All measures, by region, industry, size and product', matrixCard() + treesCard()) + wk('bridge', 'Where the year lands, by region', bridgeCard()) + wk('horizons', 'Every action, by 0-30, 31-90 and 91-180 days', actionsCard()) + wk('loopd', 'The execution loop, step by step', loopCard()) + '</section>';
  return filterBar() + head + motionRail(B, R, pending) + gApproachTeaser() + gLeversTeaser() + regions + moves + '<div class="grid g2">' + mapCard({ compact: true }) + proveCard() + '</div>' + gPlatformMap() + working + provStrip(['m_fcst', 'bridge', 'm_comp']);
}
