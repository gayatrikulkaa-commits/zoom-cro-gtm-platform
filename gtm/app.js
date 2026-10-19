(function () {
'use strict';
const { accounts: A, meta: M } = window.GTM;
const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (x, d = 0) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (x, d = 0) => '$' + nf(x, d) + 'M';
const pc = (x, d = 0) => nf(x * 100, d) + '%';
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const store = { get(k, d) { try { const v = localStorage.getItem('gtm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('gtm:' + k, JSON.stringify(v)); } catch (e) {} } };

// ---------- Databook's own videos. A published page cannot embed them, so every one is a link out (a new tab) ----------
const YT = 'https://www.youtube.com/watch?v=';
const VID = { overview: YT + 'pmNsL9O3AWI', webinar: YT + 'gj-yZOHLCBw' }, at = (sec) => VID.webinar + '&t=' + sec + 's';
const LINKS = { graph: at(1110), resolve: at(1310), guided: at(1710), studio: at(1800), uplift: at(2100) };

const TABS = [['cro', 'CRO Hub'], ['studio', 'Sales Ops Studio']];
const S = { tab: 'cro', thread: 'T-single', tfilter: 'all', filter: 'all', q: '', fRegion: null, fProd: null, all: false, open: null, erAcct: 'Acme Corp', ed: 'yaml', prompt: null, compiled: null, runLog: [], ranked: null, err: '', ctx: false, playOpen: 'P-single', plays: store.get('plays', {}), guideHide: store.get('guideHide', false), flash: null };
const hashTab = () => { const h = location.hash.replace('#', ''); return TABS.some((t) => t[0] === h) ? h : null; };
S.tab = hashTab() || 'cro';

// ---------- derived from the 40-account array ----------
const REGIONS = ['Americas', 'EMEA', 'APAC'];
const PRODUCTS = [['Workplace', 'Zoom Workplace', 'workplace'], ['Phone', 'Zoom Phone', 'phone'], ['Contact Center', 'Zoom Contact Center', 'contactCenter'], ['AI', 'Zoom AI (Companion, Virtual Agent)', 'ai']];
const prodLabel = (k) => (PRODUCTS.find((p) => p[0] === k) || [])[1] || k;
const byName = (n) => A.find((a) => a.name === n);
const flagged = (a) => a.gong.flags.length > 0, mondayBad = (a) => a.monday.state === 'Blocked' || a.monday.state === 'At risk';
const withProject = A.filter((a) => a.monday.state !== 'No project'), declining = A.filter((a) => a.usage.deltaPct <= -5);
const gongFlagCount = sum(A, (a) => a.gong.flags.length), gongAccts = A.filter(flagged).length, monBad = withProject.filter(mondayBad).length;
const legacyPct = Math.round(M.legacyRate * 100), dbkPct = Math.round(M.databookRate * 100);
const riskCommit = sum(A.filter((a) => a.thread), (a) => a.commit);

function regionStats(r) {
  const s = A.filter((a) => a.region === r), inf = sum(s, (a) => a.inFlight), com = sum(s, (a) => a.commit), fc = sum(s, (a) => a.forecast), up = sum(s, (a) => a.uplift);
  const risk = sum(s.filter((a) => a.thread), (a) => a.commit), healthy = sum(s.filter((a) => !a.thread), (a) => a.inFlight), rival = sum(s.filter((a) => a.rival), (a) => a.inFlight);
  const lights = [
    { k: 'Forecast', v: com / fc, st: com / fc >= 0.9 ? 'ok' : com / fc >= 0.8 ? 'warn' : 'bad', say: 'Commit covers ' + pc(com / fc) + ' of the forecast', bad: 'Commit covers only ' + pc(com / fc) + ' of the forecast' },
    { k: 'Retention', v: risk / com, st: risk / com <= 0.2 ? 'ok' : risk / com <= 0.3 ? 'warn' : 'bad', say: pc(risk / com) + ' of commit sits under a risk thread', bad: pc(risk / com) + ' of commit sits under a risk thread' },
    { k: 'Pipeline', v: healthy / inf, st: healthy / inf >= 0.7 ? 'ok' : healthy / inf >= 0.55 ? 'warn' : 'bad', say: pc(healthy / inf) + ' of pipeline has no risk thread', bad: 'Only ' + pc(healthy / inf) + ' of pipeline has no risk thread' },
    { k: 'Rivals', v: rival / inf, st: rival / inf <= 0.25 ? 'ok' : rival / inf <= 0.45 ? 'warn' : 'bad', say: pc(rival / inf) + ' of pipeline names a rival', bad: pc(rival / inf) + ' of pipeline names a rival' }
  ];
  const rank = { ok: 0, warn: 1, bad: 2 }, worst = lights.slice().sort((x, y) => rank[y.st] - rank[x.st])[0];
  return { r, n: s.length, inf, com, fc, up, lights, worst, overall: worst.st };
}
function productStats(k, region) {
  const s = A.filter((a) => !region || a.region === region), own = PRODUCTS.find((p) => p[0] === k)[2];
  return { inf: sum(s, (a) => a.inFlight * a.mix[k]), com: sum(s, (a) => a.commit * a.mix[k]), owns: A.filter((a) => a.owns[own]).length };
}

// ---------- risk threads (the customer context graph) ----------
const TYPE = { single: ['Single-Threaded Sponsor', 'var(--red)'], business: ['Unclear Business Case', 'var(--orange-bar)'], stalled: ['Stalled Next Steps', 'var(--orange-bar)'] };
const SRC_BADGE = { Salesforce: 'b', Gong: 'o', 'monday.com': 'g', Grafana: 'r' };
const REQUIRED = [
  { id: 'T-single', type: 'single', account: 'Acme Corp', systems: ['Gong', 'Salesforce', 'External signal', 'Zoom calendar'],
    text: 'Cross-referenced via Gong audio transcript + Salesforce Opportunity Delta. Champion at Acme Corp loves Zoom Workplace, but a newly parsed external leadership signal shows a newly appointed CXO has frozen unapproved seat spend. No corresponding meeting scheduled in Zoom logs with the new decision-maker.',
    events: [['Gong', 'Oct 14', 'Audio transcript: the champion at Acme Corp advocates for Zoom Workplace'], ['Salesforce', 'Oct 15', 'Opportunity delta cross-referenced against the call'], ['External signal', 'Oct 16', 'Newly appointed CXO parsed; unapproved seat spend frozen'], ['Zoom calendar', 'Oct 17', 'No meeting scheduled with the new decision-maker']] },
  { id: 'T-business', type: 'business', account: 'Northwind Traders', systems: ['Salesforce', 'monday.com', 'Databook'],
    text: 'Cross-referenced via Salesforce Stage 3 Fields + monday.com workflow task board. The assigned AE is tracking a massive proposal for Zoom Contact Center, but telemetry confirms they are pitching it purely as a legacy technical point-solution replacement instead of mapping deployment directly to the customer\'s stated corporate mandate for Q3 office downsizing.',
    events: [['Salesforce', 'Oct 9', 'Stage 3 fields: a large Zoom Contact Center proposal is in progress'], ['monday.com', 'Oct 13', 'Workflow task board: the AE is tracking the proposal'], ['Databook', 'Oct 16', 'Pitched purely as a point-solution replacement, not mapped to the Q3 office-downsizing mandate']] },
  { id: 'T-stalled', type: 'stalled', account: 'Contoso Ltd', systems: ['Grafana', 'Zoom calendar', 'Salesforce'],
    text: 'Cross-referenced via Grafana product usage metrics + internal calendar logs. Pilot usage for Zoom AI Companion has dropped 45% week-over-week. The enterprise contract renewal has sat in procurement status for 14 days without an active executive meeting or presentation scheduled.',
    events: [['Grafana', 'Oct 10', 'Zoom AI Companion pilot usage down 45% week-over-week'], ['Salesforce', 'Oct 3', 'Renewal enters procurement status, then sits for 14 days'], ['Zoom calendar', 'Oct 17', 'No executive meeting or presentation scheduled']] }
];
function genThread(a) {
  const t = a.thread, ev = [], sg = a.usage.deltaPct > 0 ? '+' + a.usage.deltaPct : String(a.usage.deltaPct); let text;
  if (t === 'single') { text = 'Cross-referenced via Gong call metadata + Salesforce opportunity ' + a.sfdcOppId + '. ' + (a.gong.flags[0] ? a.gong.flags[0].label : 'Executive coverage is thin') + '; ' + a.rep + ' is the only seller engaged on record' + (a.gong.flags.some((f) => f.k === 'comp') ? ', and a competitor is named on recent calls' : '') + '.'; ev.push(['Gong', 'Oct 12', a.gong.flags.map((x) => x.label).slice(0, 2).join('; ') || 'Executive coverage is thin'], ['Salesforce', 'Oct 15', 'Opportunity ' + a.sfdcOppId + ' at ' + a.stage + ', ' + fm(a.inFlight, 1) + ' in flight']); }
  else if (t === 'business') { text = 'Cross-referenced via Salesforce ' + a.stage + ' fields + monday.com project board. The ' + (a.monday.product || a.product) + ' project is ' + a.monday.state.toLowerCase() + (a.monday.blocker ? ' (' + a.monday.blocker.toLowerCase() + ')' : '') + ', and no quantified business case is linked to the opportunity.'; ev.push(['Salesforce', 'Oct 12', 'Stage: ' + a.stage + '; ' + fm(a.inFlight, 1) + ' in flight'], ['monday.com', 'Oct 15', (a.monday.product || a.product) + ': ' + a.monday.state + (a.monday.blocker ? ', ' + a.monday.blocker.toLowerCase() : '')]); }
  else { text = 'Cross-referenced via Grafana usage + Gong call history. Active seats moved ' + sg + '% against last month, the last call was ' + a.gong.lastCallDays + ' days ago, and the renewal is ' + a.renewalDays + ' days out.'; ev.push(['Grafana', 'Oct 10', 'Active seats ' + sg + '% month over month'], ['Gong', 'Oct 17', 'Last call ' + a.gong.lastCallDays + ' days ago']); }
  return { id: 'T-' + a.id, type: t, account: a.name, systems: [...new Set(ev.map((e) => e[0]))], text, events: ev };
}
const reqNames = REQUIRED.map((r) => r.account);
const THREADS = REQUIRED.map((r) => Object.assign({}, r)).concat(A.filter((a) => a.thread && !reqNames.includes(a.name)).sort((x, y) => y.inFlight - x.inFlight).map(genThread));
THREADS.forEach((t) => { const a = byName(t.account); t.amount = a ? a.inFlight : 0; });

// ---------- guided selling: the CRO authorizes a play, the seller gets turn-by-turn guidance ----------
const PLAYS = [
  { id: 'P-single', thread: 'T-single', account: 'Acme Corp', title: 'Earn a meeting with the new CXO',
    why: 'The champion at Acme Corp supports Zoom Workplace, but a new CXO has frozen unapproved seat spend and nobody has met them.',
    steps: [['Read the brief', 'The context graph summarizes the new CXO\'s mandate and the seat freeze.'], ['Ask the champion for an introduction', 'Confirm what the freeze covers and who signs off.'], ['Book 30 minutes with the CXO', 'Offer this week and bring an executive sponsor.'], ['Send the executive briefing', 'Generated from the thread; send it once the meeting is booked.']] },
  { id: 'P-business', thread: 'T-business', account: 'Northwind Traders', title: 'Reframe the Contact Center proposal around the Q3 downsizing mandate',
    why: 'The proposal is pitched as a point-solution replacement. The customer has stated a corporate mandate to downsize offices in Q3.',
    steps: [['Pull the stated mandate', 'The context graph holds the customer\'s own words on Q3 office downsizing.'], ['Rebuild the value case', 'Map the deployment to the savings the mandate asks for.'], ['Confirm the baseline with finance', 'Get the buyer to agree the cost baseline before quantifying.'], ['Reissue the proposal', 'Lead with the business case; keep the technical detail as an appendix.']] },
  { id: 'P-stalled', thread: 'T-stalled', account: 'Contoso Ltd', title: 'Restart the renewal with an executive meeting',
    why: 'AI Companion pilot usage fell 45% week over week and the renewal has sat in procurement for 14 days with no executive in the room.',
    steps: [['Review the usage drop with the admin', 'Find out what changed in the pilot before anyone sells.'], ['Request an executive sponsor meeting', 'Ask procurement who owns the renewal at executive level.'], ['Book the renewal readout', 'Bring the usage findings and a recovery plan.'], ['Record the next step in Salesforce', 'A dated buyer next step closes the loop.']] }
];
const THREAD_PLAY = Object.fromEntries(PLAYS.map((p) => [p.thread, p.id]));
const ps = (id) => S.plays[id] || (S.plays[id] = { auth: false, steps: [false, false, false, false], buyer: false });
const savePlays = () => store.set('plays', S.plays);
function proveCounts() {
  const v = PLAYS.map((p) => ps(p.id)), seed = { auth: 14, started: 11, done: 8, buyer: 5 };
  return [['Plays authorized', seed.auth + v.filter((x) => x.auth).length], ['Sellers started', seed.started + v.filter((x) => x.steps.some(Boolean)).length], ['Plays completed', seed.done + v.filter((x) => x.steps.every(Boolean)).length], ['Buyer next steps agreed', seed.buyer + v.filter((x) => x.buyer).length]];
}

// ---------- views: foundation ----------
function feedsHTML() {
  const f = [['Salesforce', 'Pipeline Values & Stage Changes', '<b>' + A.length + '</b> opportunities · <b>' + fm(M.inFlight) + '</b> in flight'],
    ['Gong', 'Conversation Intelligence & Call Transcripts', '<b>' + gongFlagCount + '</b> active interaction flags on <b>' + gongAccts + '</b> accounts'],
    ['monday.com', 'Account Workflows & Delivery Tasks', '<b>' + monBad + '</b> of ' + withProject.length + ' project tasks at risk or blocked'],
    ['Grafana', 'Real-time Telemetry & Product Consumption Metrics', '<b>' + declining.length + '</b> tenants with usage down 5% or more']];
  return '<div class="feeds">' + f.map((x) => `<div class="feed"><span class="bdg"><b>[</b>${x[0]}<b>]</b><i class="live" aria-hidden="true"></i></span><span class="what">(${x[1]})</span><span class="st">${x[2]}</span></div>`).join('') + '</div><div class="bus" aria-hidden="true"></div>';
}
function erDemo() {
  const a = byName(S.erAcct) || A[0], rows = [['Salesforce', a.sources.salesforce.name, true, true], ['Gong', a.sources.gong.name, a.sources.gong.legacy, a.sources.gong.databook], ['monday.com', a.sources.monday.name, a.sources.monday.legacy, a.sources.monday.databook], ['Grafana', a.sources.grafana.name, a.sources.grafana.legacy, a.sources.grafana.databook]];
  return `<div class="er-demo"><div class="hd"><span>See one account across the four feeds</span><select class="sel" data-act="eracct" aria-label="Account">${A.map((x) => `<option${x.name === a.name ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` +
    rows.map((r) => `<div class="er-line"><span class="sys">${r[0]}</span><span class="rec">${esc(r[1])}</span><span class="${r[2] ? 'ok' : 'no'}">${r[2] ? '✓ text match' : '✕ text match'}</span><span class="${r[3] ? 'ok' : 'no'}">${r[3] ? '✓ Databook' : '! needs review'}</span></div>`).join('') +
    `<div class="er-foot">Resolved node: <b>${esc(a.parent)}</b> <span class="mono dim">D-U-N-S ${esc(a.duns)} (mock)</span>. Across the 40 accounts: ${M.legacyResolved} of ${M.links} cross-system links resolve by text matching, ${M.databookResolved} of ${M.links} with Databook, ${M.links - M.databookResolved} flagged for review.</div></div>`;
}
function foundationPanel() {
  return `<section class="pn" id="foundation"><div class="pn-h"><h2><i>01</i>Ingress Stream Integration</h2><span style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="src ext" href="${LINKS.resolve}" target="_blank" rel="noopener">Databook's version · 21:56</a><span class="chip g"><i class="live"></i>4 feeds streaming</span></span></div><div class="pn-b">${feedsHTML()}
    <div class="er"><div class="er-h"><h3>Databook Entity Resolution Status Bar</h3></div>
    <div class="er-row leg" role="group" aria-label="Legacy System Multi-Source Resolve Rate: ${legacyPct}% (High risk of fragmented context and mapping mismatches)"><div class="top"><span class="lbl">Legacy System Multi-Source Resolve Rate</span><span class="val num">${legacyPct}%</span></div><div class="track"><i style="width:${legacyPct}%"></i></div><span class="cap">(High risk of fragmented context and mapping mismatches)</span></div>
    <div class="er-row dbk" role="group" aria-label="Databook 5-Step Resolution Pipeline Accuracy: ${dbkPct}% Verified Node Match"><div class="top"><span class="lbl">Databook 5-Step Resolution Pipeline Accuracy</span><span class="val num">${dbkPct}%</span></div><div class="track"><i style="width:${dbkPct}%"></i></div><span class="cap"><b>Verified Node Match</b> (Processing D-U-N-S IDs, Fuzzy-Matching Parent/Subsidiaries across millions of corporate nodes)</span>
      <div class="steps5" aria-label="The five steps"><span class="s5">1 Name</span><span class="arr">→</span><span class="s5">2 D-U-N-S ID</span><span class="arr">→</span><span class="s5">3 Domain</span><span class="arr">→</span><span class="s5">4 Industry</span><span class="arr">→</span><span class="s5">5 Fuzzy match</span><span class="arr">→</span><span class="s5 hr">Low confidence goes to human review</span></div></div>
    <p class="sm dim">The 39% and 99% are as Databook stated them in its launch webinar. The account-level matches below are mock data.</p>
    ${erDemo()}</div></div></section>`;
}

// ---------- views: revenue ----------
function portfolioChart() {
  const W = 560, H = 300, L = 44, B = 40, T = 26, mx = 500, ph = H - B - T, y = (v) => T + ph - (v / mx) * ph, bw = 74, gap = (W - L - 10 - bw * 4) / 4;
  const bars = [['In-flight', M.inFlight, '#3558D6', 'Total In-Flight Enterprise Value'], ['Commit', M.commit, '#14243F', 'Current Quarter Commit'], ['Baseline', M.forecast, '#8AA4E8', 'Baseline Run-Rate Forecast']];
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart: in-flight ${fm(M.inFlight)}, commit ${fm(M.commit)}, baseline forecast ${fm(M.forecast)}, with Databook ${fm(M.forecast + M.uplift)}">`;
  [0, 100, 200, 300, 400, 500].forEach((v) => { s += `<line class="gl" x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v ? '$' + v + 'M' : '0'}</text>`; });
  bars.forEach((b, i) => { const x = L + 14 + i * (bw + gap); s += `<g class="hot"><title>${b[3]}: ${fm(b[1])}</title><rect x="${x}" y="${y(b[1])}" width="${bw}" height="${T + ph - y(b[1])}" fill="${b[2]}" rx="3"/></g><text class="val" x="${x + bw / 2}" y="${y(b[1]) - 7}" text-anchor="middle">${fm(b[1])}</text><text x="${x + bw / 2}" y="${H - 18}" text-anchor="middle">${b[0]}</text>`; });
  const x4 = L + 14 + 3 * (bw + gap), top = M.forecast + M.uplift;
  s += `<g class="hot"><title>Baseline forecast ${fm(M.forecast)} plus Databook uplift ${fm(M.uplift)}</title><rect x="${x4}" y="${y(M.forecast)}" width="${bw}" height="${T + ph - y(M.forecast)}" fill="#8AA4E8" opacity=".6" rx="3"/><rect x="${x4}" y="${y(top)}" width="${bw}" height="${y(M.forecast) - y(top)}" fill="#17B26A" rx="3"/></g>` +
    `<text class="val" x="${x4 + bw / 2}" y="${y(top) - 24}" text-anchor="middle" style="fill:#067647">${fm(top)}</text><text x="${x4 + bw / 2}" y="${y(top) - 9}" text-anchor="middle" style="fill:#067647;font-size:11.5px;font-weight:600">+${fm(M.uplift)}</text><text x="${x4 + bw / 2}" y="${H - 18}" text-anchor="middle">With Databook</text></svg>`;
  return s;
}
function revenuePanel() {
  const top = A.filter((a) => a.uplift > 0).sort((x, y) => y.uplift - x.uplift).slice(0, 5), mxq = Math.max.apply(null, M.upliftByQuarter.map((q) => q[1]));
  return `<section class="pn" id="revenue"><div class="pn-h"><h2><i>02</i>Core Revenue Metrics</h2><span style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="src ext" href="${LINKS.uplift}" target="_blank" rel="noopener">Databook's version · 35:00</a><span class="chip">Pulled from the 40-account array</span></span></div><div class="pn-b">
    <h3 class="headline">Baseline forecast ${fm(M.forecast)}. With Databook, ${fm(M.forecast + M.uplift)}. <span class="m">${fm(riskCommit)} of the ${fm(M.commit)} commit sits under a risk thread.</span></h3>
    <div class="kpis"><div class="kpi"><div class="k">Total In-Flight Enterprise Value</div><div class="v num">${fm(M.inFlight)}</div><div class="d">across ${A.length} accounts</div></div><div class="kpi"><div class="k">Current Quarter Commit</div><div class="v num">${fm(M.commit)}</div><div class="d">${nf((M.commit / M.inFlight) * 100)}% of in-flight</div></div><div class="kpi"><div class="k">Baseline Run-Rate Forecast</div><div class="v num">${fm(M.forecast)}</div><div class="d">before Databook uplift</div></div></div>
    <div class="rev"><div>${portfolioChart()}</div><div class="upl"><div class="tag"><i class="live"></i>Databook AI Decision System Uplift<span class="chip o">Mock scenario</span></div><div class="big num">+${fm(M.uplift)}</div><p>Verified net-new revenue over plan, generated through continuous account context alignment.</p><div class="qbars">${M.upliftByQuarter.map((q) => `<div class="qb"><b>${fm(q[1], 1)}</b><i style="height:${Math.max(8, (q[1] / mxq) * 78)}px"></i><span>${q[0]}</span></div>`).join('')}</div><div class="contrib">${top.map((a) => `<div><span>${esc(a.name)}</span><b>+${fm(a.uplift, 1)}</b></div>`).join('')}</div></div></div></div></section>`;
}

// ---------- views: region and product ----------
function regionCard(r) {
  const x = regionStats(r), W = { ok: 'On track', warn: 'Watch', bad: 'Act now' };
  const dots = x.lights.map((l) => `<span class="rd" tabindex="0" title="${esc(l.k + ': ' + l.say)}" aria-label="${esc(r + ', ' + l.k + ', ' + W[l.st] + '. ' + l.say)}"><i class="dot ${l.st}"></i>${l.k}</span>`).join('');
  return `<div class="rc${S.fRegion === r ? ' on' : ''}"><button class="rc-main" data-act="region" data-r="${r}" aria-pressed="${S.fRegion === r}"><span class="rc-top"><b>${r} <small>${x.n} accounts</small></b><span class="rs ${x.overall}"><i class="dot ${x.overall}"></i>${W[x.overall]}</span></span>
    <span class="rc-big"><b class="num">${fm(x.fc, 1)}</b><small>baseline forecast</small></span><span class="rc-sub"><span>In-flight <b style="color:var(--ink)">${fm(x.inf, 1)}</b> · Commit <b style="color:var(--ink)">${fm(x.com, 1)}</b></span><span>With Databook <b>${fm(x.fc + x.up, 1)}</b></span></span>
    <span class="rc-why">${x.overall === 'ok' ? 'All four measures on track' : esc(x.worst.bad)}</span></button><div class="rc-dots" role="group" aria-label="Measures for ${r}">${dots}</div></div>`;
}
function productsPanel() {
  const tot = sum(PRODUCTS, (p) => productStats(p[0]).inf);
  const rows = PRODUCTS.map((p) => { const st = productStats(p[0]); return `<tr class="click${S.fProd === p[0] ? ' on' : ''}" data-act="prod" data-p="${p[0]}"><td><b>${p[1]}</b></td><td><div class="share"><span class="num" style="min-width:48px">${fm(st.inf, 1)}</span><span class="t"><i style="width:${(st.inf / tot) * 100}%"></i></span></div></td><td class="r num">${fm(st.com, 1)}</td><td class="r num">${st.owns} of ${A.length}</td>${REGIONS.map((r) => `<td class="r num">${fm(productStats(p[0], r).inf, 1)}</td>`).join('')}</tr>`; }).join('');
  const rivals = {}; A.filter((a) => a.rival).forEach((a) => (rivals[a.rival] = (rivals[a.rival] || 0) + a.inFlight));
  const rv = Object.entries(rivals).sort((x, y) => y[1] - x[1]).slice(0, 5), rmx = rv.length ? rv[0][1] : 1;
  return `<section class="pn" id="regions"><div class="pn-h"><h2><i>03</i>Region and product</h2><span class="chip">Select a region or product to filter the accounts below</span></div><div class="pn-b"><div class="rgrid">${REGIONS.map(regionCard).join('')}</div>
    <div class="two"><div><div class="sub-h">What Zoom is selling <small>· open opportunities by product line</small></div><div class="tw"><table><thead><tr><th>Product</th><th>In-flight</th><th class="r">Commit</th><th class="r">Owned by</th>${REGIONS.map((r) => `<th class="r">${r}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>
    <div><div class="sub-h">Where rivals show up <small>· in-flight on accounts naming a rival</small></div><div class="bars">${rv.map((x) => `<div class="bar-r"><span>${esc(x[0])}</span><span class="t"><i style="width:${(x[1] / rmx) * 100}%"></i></span><b class="num">${fm(x[1])}</b></div>`).join('')}</div></div></div></div></section>`;
}

// ---------- views: guided selling ----------
function playHTML(p, i) {
  const a = byName(p.account), st = ps(p.id), open = S.playOpen === p.id, done = st.steps.filter(Boolean).length, nextI = st.steps.findIndex((x) => !x);
  const steps = p.steps.map((s, j) => `<li><label class="${st.steps[j] ? 'done' : ''}${st.auth ? '' : ' dis'}"><input type="checkbox" data-act="pstep" data-id="${p.id}" data-i="${j}" ${st.steps[j] ? 'checked' : ''} ${st.auth ? '' : 'disabled'}><span class="t"><b>${j + 1}. ${esc(s[0])}</b><span class="dim">${esc(s[1])}</span></span></label></li>`).join('');
  const msg = !st.auth ? '<div class="idle">Appears in Slack and Salesforce once you authorize the play.</div>' : `<div class="msg"><b>Next best move · ${esc(p.account)}</b>${esc(p.title)}</div><div class="nx">${nextI < 0 ? 'All four steps done. Record the buyer\'s next step.' : 'Step ' + (nextI + 1) + ' of 4: ' + esc(p.steps[nextI][0])}</div>`;
  return `<div class="play${open ? ' open' : ''}${st.auth ? ' auth' : ''}${S.flash === p.id ? ' flash' : ''}" id="${p.id}"><button class="play-h" data-act="play" data-id="${p.id}" aria-expanded="${open}"><span class="pn-n">${st.auth ? '✓' : i + 1}</span><span><b>${esc(p.title)}</b><span class="m"><span>${esc(p.account)}</span><span>${fm(a.inFlight, 1)} in flight</span><span>Seller: ${esc(a.rep)}</span></span></span>${st.auth ? `<span class="chip g">${st.steps.every(Boolean) ? 'Completed' : 'Authorized · ' + done + ' of 4'}</span>` : '<span class="chip o">Awaiting you</span>'}</button>
    <div class="play-x"><div><p class="why"><b>Why.</b> ${esc(p.why)}</p><ol class="gsteps">${steps}</ol><div class="act-row">${st.auth ? `<label class="chip ${st.buyer ? 'g' : ''}" style="cursor:pointer"><input type="checkbox" data-act="buyer" data-id="${p.id}" ${st.buyer ? 'checked' : ''} ${st.steps.every(Boolean) ? '' : 'disabled'} style="margin:0 6px 0 0"> Buyer agreed a dated next step</label>` : `<button class="btn go" data-act="auth" data-id="${p.id}">Authorize play</button>`}<button class="btn" data-act="openthread" data-id="${p.thread}">See the evidence</button></div></div>
    <div class="slack"><div class="hd"><span class="av">Z</span>What ${esc(a.rep.split(' ')[0])} sees in Slack and Salesforce (simulated)</div>${msg}</div></div></div>`;
}
function guidedPanel() {
  const c = proveCounts(), mx = Math.max.apply(null, c.map((x) => x[1]));
  return `<section class="pn" id="guided"><div class="pn-h"><h2><i>04</i>Guided selling · next best moves</h2><span style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="src ext" href="${LINKS.guided}" target="_blank" rel="noopener">Databook's version · 28:30</a><span class="chip b">Decide → Guide → Prove</span></span></div><div class="pn-b"><div class="plays">${PLAYS.map(playHTML).join('')}</div>
    <div class="prove"><h3>Is it working? <small>Pilot sample plus what you do in this demo</small></h3>${c.map((x) => `<div class="prow"><span>${x[0]}</span><div class="lb"><i style="width:${Math.max(4, (x[1] / mx) * 100)}%"></i></div><b class="num">${x[1]}</b></div>`).join('')}<div class="prow pend"><span>Revenue outcome</span><div class="lb"><i></i></div><b>-</b></div><p class="note">Revenue lags the plays by weeks, so none is claimed yet. Databook measures it over a 90-day proof of value.</p></div></div></section>`;
}

// ---------- views: account engine ----------
const monChip = (a) => `<span class="chip s-${a.monday.state.replace(/\W+/g, '').toLowerCase()}">${esc(a.monday.state)}</span>`;
const gongChips = (a) => a.gong.flags.length ? a.gong.flags.slice(0, 2).map((f) => `<span class="chip ${f.k === 'comp' || f.k === 'noexec' ? 'r' : 'o'}">${esc(f.label)}</span>`).join('') + (a.gong.flags.length > 2 ? `<span class="chip">+${a.gong.flags.length - 2}</span>` : '') : '<span class="chip g">Clear</span>';
function visibleAccounts() {
  let r = A.slice();
  if (S.fRegion) r = r.filter((a) => a.region === S.fRegion);
  if (S.fProd) r = r.filter((a) => a.mix[S.fProd] >= 0.25);
  if (S.filter === 'risk') r = r.filter((a) => a.thread); else if (S.filter === 'gong') r = r.filter(flagged); else if (S.filter === 'blocked') r = r.filter(mondayBad);
  if (S.q) r = r.filter((a) => (a.name + ' ' + a.parent + ' ' + a.sfdcOppId + ' ' + a.rep).toLowerCase().includes(S.q.toLowerCase()));
  return r.sort((x, y) => y.inFlight - x.inFlight);
}
function detailHTML(a) {
  const t = THREADS.find((x) => x.account === a.name), mixTop = Object.entries(a.mix).filter((e) => e[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 3).map((e) => prodLabel(e[0]).replace(' (Companion, Virtual Agent)', ' AI') + ' ' + pc(e[1])).join(', ');
  const owns = PRODUCTS.map((p) => `${a.owns[p[2]] ? '✓' : '○'} ${p[1].replace('Zoom ', '').replace(' (Companion, Virtual Agent)', ' AI')}`).join(' · ');
  return `<div class="det"><div><h4>Cross-system record</h4><ul><li>Parent node: <b>${esc(a.parent)}</b> <span class="mono dim">${esc(a.duns)}</span></li><li>Salesforce opportunity <span class="mono">${esc(a.sfdcOppId)}</span> · ${esc(a.stage)}</li><li>Seller: ${esc(a.rep)} · ${esc(a.region)} · ${esc(a.industry)}</li><li>Forecast ${fm(a.forecast, 1)}${a.uplift ? ' · Databook uplift +' + fm(a.uplift, 1) : ''}</li></ul></div>
    <div><h4>Zoom products</h4><ul><li>Owns: ${owns}</li><li>In flight: ${esc(mixTop)}</li><li>Rival named: ${esc(a.rival || 'none')}</li><li>Renewal in ${a.renewalDays} days${a.legacyExpiryDays != null ? ' · legacy contract expires in ' + a.legacyExpiryDays + ' days' : ''}</li></ul></div>
    <div style="grid-column:1/-1"><h4>Signals</h4><ul><li>Gong: ${a.gong.flags.length ? esc(a.gong.flags.map((f) => f.label).join('; ')) : 'no active flags'}</li><li>monday.com: ${esc(a.monday.state)}${a.monday.phase ? ' · ' + esc(a.monday.phase) : ''}${a.monday.blocker ? ' · ' + esc(a.monday.blocker) : ''}</li><li>Grafana: active seats ${a.usage.deltaPct > 0 ? '+' : ''}${a.usage.deltaPct}% month over month, ${a.usage.activePct}% of licensed seats active</li></ul></div>
    ${t ? `<div style="grid-column:1/-1"><button class="btn sm" data-act="openthread" data-id="${t.id}">Open risk thread in the Customer Context Graph</button></div>` : ''}</div>`;
}
function accountsPanel() {
  const all = visibleAccounts(), rows = S.all ? all : all.slice(0, 10), fb = (k, l) => `<button data-act="filter" data-f="${k}" aria-pressed="${S.filter === k}">${l}</button>`;
  return `<section class="pn" id="accounts"><div class="pn-h"><h2><i>05</i>Account Engine · ${A.length} accounts</h2><div class="tools"><div class="seg" role="group" aria-label="Filter">${fb('all', 'All')}${fb('risk', 'Risk threads')}${fb('gong', 'Gong flags')}${fb('blocked', 'Tasks at risk')}</div><input class="search" type="search" placeholder="Search account, ID, rep" value="${esc(S.q)}" data-act="search" aria-label="Search accounts"></div></div>` +
    (S.fRegion || S.fProd ? `<div class="fbar">Filtered to ${S.fRegion ? `<button class="fx" data-act="region" data-r="${S.fRegion}">${S.fRegion} ×</button>` : ''}${S.fProd ? `<button class="fx" data-act="prod" data-p="${S.fProd}">${prodLabel(S.fProd)} ×</button>` : ''}</div>` : '') +
    `<div class="acc"><div class="tr hd"><span>Account · parent node · lead product</span><span class="sf">Salesforce Opp ID</span><span>Gong interaction flags</span><span>monday.com</span><span class="r">In-flight</span><span class="r co">Commit</span></div>` +
    rows.map((a) => `<button class="tr" data-act="row" data-id="${a.id}" aria-expanded="${S.open === a.id}"><span class="nm"><b>${esc(a.name)} <span class="chip">${esc(a.region)}</span></b><span>${esc(a.parent)} · ${esc(prodLabel(a.product).replace(' (Companion, Virtual Agent)', ' AI'))}</span></span><span class="mono sf">${esc(a.sfdcOppId)}</span><span class="chips gongc">${gongChips(a)}</span><span class="mon">${monChip(a)}</span><span class="r num inf">${fm(a.inFlight, 1)}</span><span class="r num co">${fm(a.commit, 1)}</span></button>${S.open === a.id ? detailHTML(a) : ''}`).join('') + '</div>' +
    `<div class="more"><span>Showing ${rows.length} of ${all.length}${all.length === A.length ? '' : ' matching'} accounts</span>${all.length > 10 ? `<button class="btn sm" data-act="all">${S.all ? 'Show top 10' : 'Show all ' + all.length}</button>` : ''}</div></section>`;
}

// ---------- start here ----------
function guidePanel() {
  if (S.guideHide) return '<div class="more" style="padding:0"><span></span><button class="btn sm" data-act="guide">Show the review guide</button></div>';
  const st = [['See the number', 'Forecast, commit and the Databook uplift', 'revenue'], ['Open a risk thread', 'The customer context graph: why a deal is at risk, with the evidence', 'thread'], ['Authorize a guided play', 'The CRO approves; the seller gets turn-by-turn guidance', 'guided'], ['Build a scoring workbench', 'A plain-English prompt becomes a rules engine', 'studio']];
  const lk = [['Databook in 2 minutes', 'overview video', VID.overview], ['The context graph', 'webinar · 18:30', LINKS.graph], ['Entity resolution', 'webinar · 21:56', LINKS.resolve], ['The AI Studio demo', 'webinar · 30:00', LINKS.studio], ['Full launch webinar', '51 min', VID.webinar]];
  return `<section class="pn guide" id="guide"><div class="pn-h"><h2>Start here · a three-minute review</h2><button class="btn sm" data-act="guide">Hide</button></div><div class="pn-b"><ol class="g-steps">${st.map((s, i) => `<li><button data-act="gstep" data-k="${s[2]}"><span class="g-n">${i + 1}</span><span><b>${s[0]}</b><span class="d">${s[1]}</span></span><span class="gt">Go →</span></button></li>`).join('')}</ol>
    <div class="g-links"><h3>Databook's own videos</h3><p>These open YouTube in a new tab, because a published page cannot play them.</p><ul>${lk.map((l) => `<li><a class="ext" href="${l[2]}" target="_blank" rel="noopener">${l[0]}<small>${l[1]}</small></a></li>`).join('')}</ul></div></div></section>`;
}
function viewCRO() { return guidePanel() + foundationPanel() + revenuePanel() + productsPanel() + guidedPanel() + accountsPanel(); }

// ---------- Sales Ops Studio: a simulated compiler ----------
const SAMPLE = 'Prompt: Create a new custom scoring workbench targeted at Chief Information Officers (CIOs) and Procurement Leaders for the Zoom Virtual Agent rollout. Cross-reference Grafana usage declines against Salesforce renewal windows, and automatically increase target priority weighting for enterprises experiencing active legacy contract expirations.';
S.prompt = SAMPLE;
const PERSONAS = [[/\bCIOs?\b|chief information officer/i, 'CIO'], [/procurement/i, 'Procurement Leader'], [/\bCFOs?\b|chief financial/i, 'CFO'], [/\bCTOs?\b|chief technology/i, 'CTO'], [/\bCISOs?\b|security leader/i, 'CISO'], [/\bCROs?\b|chief revenue/i, 'CRO'], [/\bCMOs?\b|chief marketing/i, 'CMO']];
const PRODS = [[/virtual agent/i, 'Zoom Virtual Agent'], [/contact center/i, 'Zoom Contact Center'], [/ai companion/i, 'Zoom AI Companion'], [/workplace/i, 'Zoom Workplace'], [/\bphone\b/i, 'Zoom Phone'], [/\brooms?\b/i, 'Zoom Rooms']];
function parsePrompt(t) {
  const personas = PERSONAS.filter((p) => p[0].test(t)).map((p) => p[1]), product = (PRODS.find((p) => p[0].test(t)) || [])[1];
  return { personas, product, sig: { usage: /usage|grafana|decline|drop/i.test(t), renewal: /renewal/i.test(t), legacy: /legacy|expir/i.test(t) } };
}
function buildCfg(p) {
  const slug = (p.product || 'zoom').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), pers = p.personas.map((x) => x.toLowerCase().replace(/[^a-z]+/g, '_')).join('_');
  const sources = [], signals = {}, rules = [];
  if (p.sig.usage) { sources.push({ id: 'grafana.usage', system: 'Grafana', metric: 'active_seats_delta_pct', window: '30d', refresh: '1h' }); signals.usage_decline = { source: 'grafana.usage', when: 'active_seats_delta_pct <= -5' }; }
  if (p.sig.renewal) { sources.push({ id: 'salesforce.renewals', system: 'Salesforce', object: 'Account', field: 'renewal_date', refresh: '15m' }); signals.renewal_window = { source: 'salesforce.renewals', when: 'days_to_renewal <= 180' }; }
  if (p.sig.legacy) { sources.push({ id: 'salesforce.contracts', system: 'Salesforce', object: 'Contract', field: 'legacy_contract_end', refresh: '15m' }); signals.legacy_expiry = { source: 'salesforce.contracts', when: 'days_to_legacy_expiry <= 240' }; }
  if (p.sig.usage && p.sig.renewal) rules.push({ id: 'usage_decline_in_renewal_window', description: 'Grafana usage decline cross-referenced with a Salesforce renewal window', when: { all: ['usage_decline', 'renewal_window'] }, effect: { priority_weight: '+0.25' }, approval: 'sales_ops_review' });
  else if (p.sig.usage) rules.push({ id: 'usage_decline', description: 'Grafana usage decline', when: { all: ['usage_decline'] }, effect: { priority_weight: '+0.15' }, approval: 'sales_ops_review' });
  if (p.sig.legacy) rules.push({ id: 'active_legacy_contract_expiry', description: 'Enterprise is inside an active legacy contract expiry window', when: { all: ['legacy_expiry'] }, effect: { priority_weight: '+0.35' }, approval: 'automatic' });
  return { workbench: { id: 'wb_' + slug + (pers ? '_' + pers : ''), name: (p.product || 'Zoom') + ' priority scoring' + (p.personas.length ? ' for ' + p.personas.join(' and ') : ''), version: '1.0.0', owner: 'sales_ops', status: 'compiled' }, audience: { personas: p.personas, product: p.product || 'Zoom (all products)', accounts_in_scope: A.length }, sources, signals, rules, scoring: { base: 'in_flight_value_percentile', combine: 'additive', cap: 1.0, tiers: { P1: '>= 85', P2: '>= 65', P3: '< 65' } }, output: { format: 'json', schema: 'databook.workbench.score.v1' } };
}
function evalCfg(cfg) {
  const has = (k) => k in cfg.signals, mxv = Math.max.apply(null, A.map((a) => a.inFlight));
  return A.map((a) => {
    const fired = [], sg = { usage_decline: a.usage.deltaPct <= -5, renewal_window: a.renewalDays <= 180, legacy_expiry: a.legacyExpiryDays != null && a.legacyExpiryDays <= 240 };
    cfg.rules.forEach((r) => { if (r.when.all.every((k) => has(k) && sg[k])) fired.push(r); });
    const base = Math.round(30 + 40 * Math.sqrt(a.inFlight / mxv)), w = sum(fired, (r) => parseFloat(r.effect.priority_weight)), final = Math.min(100, Math.round(base * (1 + w)));
    return { a, base, w, final, fired };
  }).sort((x, y) => y.final - x.final || y.a.inFlight - x.a.inFlight);
}
function schemaDoc(cfg, ranked) {
  const top = ranked[0], ex = { account: { id: top.a.id, name: top.a.name, parentNode: { name: top.a.parent, duns: top.a.duns }, sfdcOppId: top.a.sfdcOppId }, signals: { usage_decline: top.a.usage.deltaPct <= -5, renewal_window: top.a.renewalDays <= 180, legacy_expiry: top.a.legacyExpiryDays != null && top.a.legacyExpiryDays <= 240 }, score: { base: top.base, weight_delta: +top.w.toFixed(2), final: top.final, tier: top.final >= 85 ? 'P1' : top.final >= 65 ? 'P2' : 'P3' }, drivers: top.fired.map((r) => ({ rule: r.id, weight: r.effect.priority_weight })) };
  return { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'databook.workbench.score.v1', title: cfg.workbench.name, type: 'object',
    compiled: { workbench: cfg.workbench, audience: cfg.audience, signals: Object.keys(cfg.signals).map((k) => ({ id: k, source: cfg.signals[k].source, predicate: cfg.signals[k].when })), rules: cfg.rules.map((r) => ({ id: r.id, requires: r.when.all, effect: { target: 'priority_weight', op: 'add', value: parseFloat(r.effect.priority_weight) }, approval: r.approval })), scoring: cfg.scoring },
    properties: { account: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, parentNode: { type: 'object', properties: { name: { type: 'string' }, duns: { type: 'string' } }, required: ['name', 'duns'] }, sfdcOppId: { type: 'string', pattern: '^006[A-Za-z0-9]{15}$' } }, required: ['id', 'name', 'parentNode'] },
      signals: { type: 'object', properties: Object.fromEntries(Object.keys(cfg.signals).map((k) => [k, { type: 'boolean' }])) },
      score: { type: 'object', properties: { base: { type: 'integer', minimum: 0, maximum: 100 }, weight_delta: { type: 'number' }, final: { type: 'integer', minimum: 0, maximum: 100 }, tier: { enum: ['P1', 'P2', 'P3'] } }, required: ['base', 'final', 'tier'] },
      drivers: { type: 'array', items: { type: 'object', properties: { rule: { type: 'string' }, weight: { type: 'string' } } } } },
    required: ['account', 'score'], example: ex };
}
function yaml(v, ind) {
  const pad = '  '.repeat(ind), sc = (x) => (typeof x === 'string' && (/[:#\[\]{},&*!|<>'"%@`]|^\s|\s$|^$|^[-?]/.test(x) || /^(true|false|null|\d)/.test(x)) ? JSON.stringify(x) : String(x));
  if (Array.isArray(v)) { if (!v.length) return pad + '[]\n'; if (v.every((x) => typeof x !== 'object')) return pad + '[' + v.map(sc).join(', ') + ']\n'; return v.map((x) => { const inner = yaml(x, ind + 1).replace(/^\s+/, ''); return pad + '- ' + inner; }).join(''); }
  if (v && typeof v === 'object') return Object.keys(v).map((k) => { const x = v[k]; if (x && typeof x === 'object' && !(Array.isArray(x) && (!x.length || x.every((y) => typeof y !== 'object')))) return pad + k + ':\n' + yaml(x, ind + 1); return pad + k + ': ' + (Array.isArray(x) ? yaml(x, 0).trim() : sc(x)) + '\n'; }).join('');
  return pad + sc(v) + '\n';
}
const hlYaml = (l) => { const c = l.indexOf(' #'); let body = c >= 0 ? l.slice(0, c) : l; const cm = c >= 0 ? l.slice(c) : ''; body = esc(body).replace(/^(\s*(?:- )?)([A-Za-z0-9_.$-]+)(:)/, '$1<span class="tk-k">$2</span>$3').replace(/(&quot;[^&]*?&quot;)/g, '<span class="tk-s">$1</span>').replace(/(: |\[|, )(-?\d+(?:\.\d+)?)(?=\]|,|$)/g, '$1<span class="tk-n">$2</span>').replace(/(: )(true|false)$/g, '$1<span class="tk-b">$2</span>'); return l.trim().startsWith('#') ? '<span class="tk-c">' + esc(l) + '</span>' : body + (cm ? '<span class="tk-c">' + esc(cm) + '</span>' : ''); };
const hlJson = (l) => esc(l).replace(/^(\s*)(&quot;[^&]*?&quot;)(:)/, '$1<span class="tk-k">$2</span>$3').replace(/(: )(&quot;[^&]*?&quot;)/, '$1<span class="tk-s">$2</span>').replace(/([\[,] ?|: )(&quot;[^&]*?&quot;)(?=,?$|\])/g, '$1<span class="tk-s">$2</span>').replace(/(: )(-?\d+(?:\.\d+)?)(,?)$/, '$1<span class="tk-n">$2</span>$3').replace(/(: )(true|false|null)(,?)$/, '$1<span class="tk-b">$2</span>$3');
function compile() {
  const p = parsePrompt(S.prompt || '');
  if (!p.sig.usage && !p.sig.renewal && !p.sig.legacy) { S.err = 'No scoring signal found. This simulated compiler recognises usage declines, renewal windows and legacy contract expiries, plus personas and Zoom products.'; return; }
  S.err = ''; const cfg = buildCfg(p), ranked = evalCfg(cfg); S.cfg = cfg; S.ranked = ranked; S.parsed = p;
  S.compiled = { yaml: '# Databook AI Studio · Sales Ops Workbench\n# Compiled from the directive on the left (simulated compiler)\n' + yaml(cfg, 0), json: JSON.stringify(schemaDoc(cfg, ranked), null, 2) };
}
function runCompile() {
  const steps = ['Parsing directive', 'Resolving personas and product', 'Binding Grafana and Salesforce signals', 'Compiling rules engine', 'Validating output schema'];
  S.runLog = [];
  steps.forEach((t, i) => setTimeout(() => { S.runLog.push(t); if (i === steps.length - 1) { compile(); S.runLog.push(S.err ? 'Stopped: nothing to compile' : 'Compiled with 0 errors'); } if (S.tab === 'studio') renderStudioParts(); }, 220 * (i + 1)));
  renderStudioParts();
}
function editorHTML() {
  const txt = S.compiled ? (S.ed === 'yaml' ? S.compiled.yaml : S.compiled.json) : '', lines = txt.replace(/\n$/, '').split('\n'), hl = S.ed === 'yaml' ? hlYaml : hlJson;
  return `<div class="ed"><div class="ed-t"><div class="ed-tabs" role="tablist"><button role="tab" data-act="ed" data-k="yaml" aria-selected="${S.ed === 'yaml'}">scoring_workbench.yaml</button><button role="tab" data-act="ed" data-k="json" aria-selected="${S.ed === 'json'}">compiled_output.schema.json</button></div><button class="btn sm" data-act="copy">Copy</button></div>` +
    (S.compiled ? `<div class="ed-body"><div class="ed-gut" aria-hidden="true">${lines.map((_, i) => i + 1).join('\n')}</div><pre class="ed-code" style="margin:0" tabindex="0" aria-label="${S.ed === 'yaml' ? 'YAML configuration' : 'JSON output schema'}">${lines.map(hl).join('\n')}</pre></div>` : '<div class="ed-body"><div class="ed-gut"></div><div class="ed-code dim">Compile a directive to see the configuration here.</div></div>') +
    `<div class="ed-s"><span>${S.ed === 'yaml' ? 'YAML' : 'JSON'} · UTF-8 · ${lines.length} lines</span><span class="${S.compiled && !S.err ? 'ok' : ''}">${S.compiled ? '● Compiled · 0 errors' : 'Not compiled'}</span></div></div>`;
}
function leftExtras() {
  const p = S.parsed;
  return (S.err ? `<div class="errbox">${esc(S.err)}</div>` : '') + (p ? '<div class="parsed">' + p.personas.map((x) => `<span class="chip b">${esc(x)}</span>`).join('') + (p.product ? `<span class="chip g">${esc(p.product)}</span>` : '') + (p.sig.usage ? '<span class="chip o">Grafana usage decline</span>' : '') + (p.sig.renewal ? '<span class="chip o">Salesforce renewal window</span>' : '') + (p.sig.legacy ? '<span class="chip r">Legacy contract expiry</span>' : '') + '</div>' : '') +
    (S.runLog.length ? '<div class="runlog">' + S.runLog.map((l) => `<div>${esc(l)}</div>`).join('') + '</div>' : '') +
    (S.ranked ? `<div><div class="sub-h">Preview on the 40 accounts</div><div class="rank">${S.ranked.slice(0, 6).map((r, i) => `<div class="rk"><span class="n">${i + 1}</span><span><b>${esc(r.a.name)}</b><br><span class="dim sm">${r.fired.length ? esc(r.fired.map((x) => x.id.replace(/_/g, ' ')).join(' + ')) : 'no rule fired'}</span></span><span class="sc num">${r.final}${r.w ? `<small>+${Math.round(r.w * 100)}% weight</small>` : ''}</span></div>`).join('')}</div></div>` : '');
}
function viewStudio() {
  return `<div class="studio"><section class="pn"><div class="pn-h"><h2>Directive</h2><span style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="src ext" href="${LINKS.studio}" target="_blank" rel="noopener">Databook's version · 30:00</a><span class="chip g"><i class="live"></i>AI Studio</span></span></div><div class="pn-b" style="display:flex;flex-direction:column;gap:14px"><textarea class="prompt" id="prompt" spellcheck="false" aria-label="Workbench directive">${esc(S.prompt)}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn go" data-act="compile">Compile workbench</button><button class="btn" data-act="sample">Reset to sample</button></div><div id="st-extras" style="display:flex;flex-direction:column;gap:14px">${leftExtras()}</div></div></section><section class="pn"><div class="pn-h"><h2>Rules engine</h2><span class="chip">Simulated compiler</span></div><div class="pn-b" id="st-editor">${editorHTML()}</div></section></div>`;
}
function renderStudioParts() { const a = $('#st-extras'), b = $('#st-editor'); if (a) a.innerHTML = leftExtras(); if (b) b.innerHTML = editorHTML(); }

// ---------- right rail: the customer context graph ----------
function ctxHTML() {
  const list = THREADS.filter((t) => S.tfilter === 'all' || t.type === S.tfilter), fb = (k, l) => `<button data-act="tfilter" data-f="${k}" aria-pressed="${S.tfilter === k}">${l}</button>`;
  return `<div class="ctx-h"><button class="ctx-x" data-act="ctxclose" aria-label="Close">×</button><h2><i class="live"></i>Customer Context Graph</h2><span class="sub">Timeline provenance · ${THREADS.length} active risk threads across four systems · <a class="src ext" href="${LINKS.graph}" target="_blank" rel="noopener">Databook's version · 18:30</a></span><div class="seg" role="group" aria-label="Thread type">${fb('all', 'All')}${fb('single', 'Sponsor')}${fb('business', 'Business case')}${fb('stalled', 'Next steps')}</div></div><div class="threads">` +
    list.map((t) => { const ty = TYPE[t.type], open = S.thread === t.id, pid = THREAD_PLAY[t.id]; return `<div class="th${open ? ' open' : ''}" style="--c:${ty[1]}" id="${t.id}"><button class="th-b" data-act="thread" data-id="${t.id}" aria-expanded="${open}"><span class="th-t"><span class="ty">[RISK THREAD: ${ty[0]}]</span><span class="car" aria-hidden="true">▸</span></span><span class="th-m"><b>${esc(t.account)}</b><span class="amt num">${fm(t.amount, 1)} in flight</span></span><span class="th-s">${t.systems.map((s) => `<span class="chip ${SRC_BADGE[s] || ''}">${esc(s)}</span>`).join('')}</span></button><div class="th-x"><div class="prov-h">Provenance Chain</div><p class="prov-t">${esc(t.text)}</p><ol class="tl">${t.events.map((e) => `<li><div class="when"><span class="chip ${SRC_BADGE[e[0]] || ''}">${esc(e[0])}</span><span>${esc(e[1])} (mock timestamp)</span></div>${esc(e[2])}</li>`).join('')}</ol>${pid ? `<div class="th-act"><button class="btn go sm" data-act="gotoplay" data-id="${pid}">See the guided play</button></div>` : ''}</div></div>`; }).join('') + '</div>';
}

// ---------- shell and events ----------
function shell() {
  return `<div class="gx"><header class="gh"><div class="gh-t"><span class="mark" aria-hidden="true"></span><div><h1><span class="dim">Databook Labs, Inc. //</span> Zoom Enterprise GTM Operating System</h1><p>Live Deployment Environment // Review Panel: Anton &amp; Hriday</p></div></div><div class="gh-r"><span class="sim" title="Every account, deal and figure on this page is generated mock data">Mock data · illustrative</span><a class="btn ext" href="${VID.overview}" target="_blank" rel="noopener">Databook in 2 min</a></div></header>` +
    `<nav class="gtabs" role="tablist" aria-label="Perspective">${TABS.map((t) => `<button role="tab" data-act="tab" data-t="${t[0]}" aria-selected="${S.tab === t[0]}">${t[1]}</button>`).join('')}</nav>` +
    `<div class="gbody${S.tab === 'studio' ? ' wide' : ''}"><main id="gmain"></main><aside class="ctx${S.ctx ? ' open' : ''}" id="ctx" aria-label="Customer Context Graph"></aside></div><button class="ctx-bar" data-act="ctxopen"><span><i class="live"></i>Customer Context Graph</span><span class="dim">${THREADS.length} risk threads ▴</span></button></div>`;
}
function renderMain() { $('#gmain').innerHTML = { cro: viewCRO, studio: viewStudio }[S.tab](); }
function renderCtx() { $('#ctx').innerHTML = ctxHTML(); }
function render() { $('#gtm').innerHTML = shell(); renderMain(); renderCtx(); if (S.tab === 'studio' && !S.compiled) { compile(); S.runLog = ['Compiled with 0 errors']; renderMain(); } }
function go(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function flashPlay(id) { S.flash = id; renderMain(); go(id); setTimeout(() => { S.flash = null; const el = document.getElementById(id); if (el) el.classList.remove('flash'); }, 1700); }

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t) return; const a = t.dataset.act, d = t.dataset;
  if (t.tagName === 'SELECT' || t.tagName === 'INPUT' && a !== 'pstep' && a !== 'buyer') return;
  if (a === 'tab') { S.tab = d.t; S.ctx = false; try { history.replaceState(null, '', '#' + d.t); } catch (er) {} render(); window.scrollTo(0, 0); }
  else if (a === 'thread') { S.thread = S.thread === d.id ? null : d.id; renderCtx(); }
  else if (a === 'openthread') { if (S.tab !== 'cro') { S.tab = 'cro'; } S.thread = d.id; S.tfilter = 'all'; S.ctx = true; render(); const el = document.getElementById(d.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  else if (a === 'gotoplay') { S.ctx = false; $('#ctx').classList.remove('open'); S.playOpen = d.id; flashPlay(d.id); }
  else if (a === 'tfilter') { S.tfilter = d.f; renderCtx(); }
  else if (a === 'filter') { S.filter = d.f; S.all = false; renderMain(); }
  else if (a === 'region') { S.fRegion = S.fRegion === d.r ? null : d.r; S.all = false; S.open = null; renderMain(); if (S.fRegion) go('accounts'); }
  else if (a === 'prod') { S.fProd = S.fProd === d.p ? null : d.p; S.all = false; S.open = null; renderMain(); if (S.fProd) go('accounts'); }
  else if (a === 'row') { S.open = S.open === d.id ? null : d.id; renderMain(); }
  else if (a === 'all') { S.all = !S.all; renderMain(); }
  else if (a === 'play') { S.playOpen = S.playOpen === d.id ? null : d.id; renderMain(); }
  else if (a === 'auth') { ps(d.id).auth = true; savePlays(); S.playOpen = d.id; renderMain(); }
  else if (a === 'pstep') { const st = ps(d.id); if (!st.auth) return; st.steps[+d.i] = t.checked; if (!st.steps.every(Boolean)) st.buyer = false; savePlays(); renderMain(); }
  else if (a === 'buyer') { ps(d.id).buyer = t.checked; savePlays(); renderMain(); }
  else if (a === 'guide') { S.guideHide = !S.guideHide; store.set('guideHide', S.guideHide); renderMain(); }
  else if (a === 'gstep') {
    if (d.k === 'revenue') go('revenue');
    else if (d.k === 'thread') { S.thread = 'T-single'; S.tfilter = 'all'; S.ctx = true; render(); const el = document.getElementById('T-single'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else if (d.k === 'guided') { S.playOpen = 'P-single'; flashPlay('P-single'); }
    else if (d.k === 'studio') { S.tab = 'studio'; S.ctx = false; try { history.replaceState(null, '', '#studio'); } catch (er) {} render(); window.scrollTo(0, 0); }
  }
  else if (a === 'ctxopen') { S.ctx = true; $('#ctx').classList.add('open'); }
  else if (a === 'ctxclose') { S.ctx = false; $('#ctx').classList.remove('open'); }
  else if (a === 'compile') { const p = $('#prompt'); if (p) S.prompt = p.value; runCompile(); }
  else if (a === 'sample') { S.prompt = SAMPLE; renderMain(); }
  else if (a === 'ed') { S.ed = d.k; renderStudioParts(); }
  else if (a === 'copy') { const txt = S.compiled ? (S.ed === 'yaml' ? S.compiled.yaml : S.compiled.json) : ''; try { navigator.clipboard.writeText(txt).then(() => { t.textContent = 'Copied'; setTimeout(() => (t.textContent = 'Copy'), 1400); }, () => { t.textContent = 'Select the text to copy'; }); } catch (er) { t.textContent = 'Select the text to copy'; } }
});
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset.act === 'search') { S.q = t.value; S.all = false; const pos = t.selectionStart; renderMain(); const n = $('.search'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } else if (t.id === 'prompt') S.prompt = t.value; });
document.addEventListener('change', (e) => { if (e.target.dataset.act === 'eracct') { S.erAcct = e.target.value; renderMain(); } });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.ctx) { S.ctx = false; $('#ctx').classList.remove('open'); }
  const t = e.target.closest && e.target.closest('.gtabs [role=tab]'); if (t && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const i = TABS.findIndex((x) => x[0] === S.tab), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0]; S.tab = n; render(); const b = $('.gtabs [aria-selected=true]'); if (b) b.focus(); }
});
window.addEventListener('hashchange', () => { const h = hashTab(); if (h && h !== S.tab) { S.tab = h; render(); } });
render();
})();
