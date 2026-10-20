// ---------- the platform: five tabs, the customer context graph rail, and the Sales Ops Studio ----------
// Merged from the GTM operating-system prototype. The 40 accounts are the same accounts as the rest of the dashboard, joined by account id,
// so a region, a seller or a rival means the same thing on every screen. Portfolio figures (in-flight, commit, run-rate forecast, uplift) come from window.GTM.
const GA = window.GTM.accounts, GM = window.GTM.meta;
const gfm = (x, d = 0) => '$' + nf(x, d) + 'M', gpc = (x, d = 0) => nf(x * 100, d) + '%';
const gsum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const GREG = ['Americas', 'EMEA', 'APAC'];
const GPROD = [['Workplace', 'Zoom Workplace', 'workplace'], ['Phone', 'Zoom Phone', 'phone'], ['Contact Center', 'Zoom Contact Center', 'contactCenter'], ['AI', 'Zoom AI (Companion, Virtual Agent)', 'ai']];
const gProdLabel = (k) => (GPROD.find((p) => p[0] === k) || [])[1] || k, gProdShort = (k) => gProdLabel(k).replace('Zoom ', '').replace(' (Companion, Virtual Agent)', ' AI');
const gByName = (n) => GA.find((a) => a.name === n);
const gFlagged = (a) => a.gong.flags.length > 0, gMonBad = (a) => a.monday.state === 'Blocked' || a.monday.state === 'At risk';
const gLegacyPct = Math.round(GM.legacyRate * 100), gDbkPct = Math.round(GM.databookRate * 100), gRiskCommit = gsum(GA.filter((a) => a.thread), (a) => a.commit);
const GSAMPLE = 'Prompt: Create a new custom scoring workbench targeted at Chief Information Officers (CIOs) and Procurement Leaders for the Zoom Virtual Agent rollout. Cross-reference Grafana usage declines against Salesforce renewal windows, and automatically increase target priority weighting for enterprises experiencing active legacy contract expirations.';
const GX = { threads: [], thread: 'T-single', tfilter: 'all', fRegion: null, fProd: null, filter: 'all', q: '', all: false, open: null, erAcct: 'Acme Corp', ed: 'yaml', prompt: GSAMPLE, compiled: null, runLog: [], ranked: null, err: '', playOpen: 'P-single', wts: {}, picks: store.get('gxpicks', ['risk', 'deal', 'forecast']), methAcct: 'Acme Corp', msg: null, sent: {}, plays: store.get('gxplays', {}), flash: null };

// ----- risk threads: the customer context graph -----
const GTYPE = { single: ['Single-Threaded Sponsor', 'var(--bad)'], business: ['Unclear Business Case', 'var(--dot-warn)'], stalled: ['Stalled Next Steps', 'var(--dot-warn)'] };
const GSRC = { Salesforce: 'b', Gong: 'o', 'monday.com': 'g', Grafana: 'r' };
const GREQ = [
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
function gGenThread(a) {
  const t = a.thread, ev = [], sg = a.usage.deltaPct > 0 ? '+' + a.usage.deltaPct : String(a.usage.deltaPct); let text;
  if (t === 'single') { text = 'Cross-referenced via Gong call metadata + Salesforce opportunity ' + a.sfdcOppId + '. ' + (a.gong.flags[0] ? a.gong.flags[0].label : 'Executive coverage is thin') + '; ' + a.rep + ' is the only seller engaged on record' + (a.gong.flags.some((f) => f.k === 'comp') ? ', and a competitor is named on recent calls' : '') + '.'; ev.push(['Gong', 'Oct 12', a.gong.flags.map((x) => x.label).slice(0, 2).join('; ') || 'Executive coverage is thin'], ['Salesforce', 'Oct 15', 'Opportunity ' + a.sfdcOppId + ' at ' + a.stage + ', ' + gfm(a.inFlight, 1) + ' in open deals']); }
  else if (t === 'business') { text = 'Cross-referenced via Salesforce ' + a.stage + ' fields + monday.com project board. The ' + (a.monday.product || a.product) + ' project is ' + a.monday.state.toLowerCase() + (a.monday.blocker ? ' (' + a.monday.blocker.toLowerCase() + ')' : '') + ', and no quantified business case is linked to the opportunity.'; ev.push(['Salesforce', 'Oct 12', 'Stage: ' + a.stage + '; ' + gfm(a.inFlight, 1) + ' in open deals'], ['monday.com', 'Oct 15', (a.monday.product || a.product) + ': ' + a.monday.state + (a.monday.blocker ? ', ' + a.monday.blocker.toLowerCase() : '')]); }
  else { text = 'Cross-referenced via Grafana usage + Gong call history. Active seats moved ' + sg + '% against last month, the last call was ' + a.gong.lastCallDays + ' days ago, and the renewal is ' + a.renewalDays + ' days out.'; ev.push(['Grafana', 'Oct 10', 'Active seats ' + sg + '% month over month'], ['Gong', 'Oct 17', 'Last call ' + a.gong.lastCallDays + ' days ago']); }
  return { id: 'T-' + a.id, type: t, account: a.name, systems: [...new Set(ev.map((e) => e[0]))], text, events: ev };
}
(function () {
  const req = GREQ.map((r) => r.account);
  GX.threads = GREQ.map((r) => Object.assign({}, r)).concat(GA.filter((a) => a.thread && !req.includes(a.name)).sort((x, y) => y.inFlight - x.inFlight).map(gGenThread));
  GX.threads.forEach((t) => { const a = gByName(t.account); t.amount = a ? a.inFlight : 0; t.aid = a ? a.id : null; });
})();

// ----- guided selling: the CRO authorizes a play, the seller is guided step by step -----
const GPLAYS = [
  { id: 'P-single', thread: 'T-single', account: 'Acme Corp', title: 'Earn a meeting with the new CXO',
    why: 'The champion at Acme Corp supports Zoom Workplace, but a new CXO has frozen unapproved seat spend and nobody has met them.', change: 'An outside signal: a newly appointed CXO has frozen unapproved seat spend.', now: 'No meeting is scheduled with the new decision-maker.', us: 'The champion already runs Zoom Workplace and speaks well of it.',
    steps: [['Read the brief', 'The context graph summarizes the new CXO\'s mandate and the seat freeze.'], ['Ask the champion for an introduction', 'Confirm what the freeze covers and who signs off.'], ['Book 30 minutes with the CXO', 'Offer this week and bring an executive sponsor.'], ['Send the executive briefing', 'Generated from the thread; send it once the meeting is booked.']] },
  { id: 'P-business', thread: 'T-business', account: 'Northwind Traders', title: 'Reframe the Contact Center proposal around the Q3 downsizing mandate',
    why: 'The proposal is pitched as a point-solution replacement. The customer has stated a corporate mandate to downsize offices in Q3.', change: 'The customer has stated a corporate mandate to downsize offices in Q3.', now: 'The proposal is at Stage 3 and pitched as a legacy point-solution replacement.', us: 'Contact Center can be mapped to the mandate with a quantified saving.',
    steps: [['Pull the stated mandate', 'The context graph holds the customer\'s own words on Q3 office downsizing.'], ['Rebuild the value case', 'Map the deployment to the savings the mandate asks for.'], ['Confirm the baseline with finance', 'Get the buyer to agree the cost baseline before quantifying.'], ['Reissue the proposal', 'Lead with the business case; keep the technical detail as an appendix.']] },
  { id: 'P-stalled', thread: 'T-stalled', account: 'Contoso Ltd', title: 'Restart the renewal with an executive meeting',
    why: 'AI Companion pilot usage fell 45% week over week and the renewal has sat in procurement for 14 days with no executive in the room.', change: 'Pilot usage of Zoom AI Companion is down 45% week over week.', now: 'The renewal has sat in procurement for 14 days with no executive meeting.', us: 'The pilot data shows where adoption stalled, so the recovery plan can be specific.',
    steps: [['Review the usage drop with the admin', 'Find out what changed in the pilot before anyone sells.'], ['Request an executive sponsor meeting', 'Ask procurement who owns the renewal at executive level.'], ['Book the renewal readout', 'Bring the usage findings and a recovery plan.'], ['Record the next step in Salesforce', 'A dated buyer next step closes the loop.']] }
];
const GTHREAD_PLAY = Object.fromEntries(GPLAYS.map((p) => [p.thread, p.id]));
const gps = (id) => GX.plays[id] || (GX.plays[id] = { auth: false, steps: [false, false, false, false], buyer: false });
const gSavePlays = () => store.set('gxplays', GX.plays);
function gProve() {
  GPLAYS.forEach((p) => gps(p.id)); const v = Object.keys(GX.plays).map((k) => GX.plays[k]), seed = { auth: 14, started: 11, done: 8, buyer: 5 };
  return [['Plays approved', seed.auth + v.filter((x) => x.auth).length], ['Sellers coached', seed.started + v.filter((x) => x.steps.some(Boolean)).length], ['Plays completed', seed.done + v.filter((x) => x.steps.every(Boolean)).length], ['Buyer next steps agreed', seed.buyer + v.filter((x) => x.buyer).length]];
}

// ----- region and product facts -----
function gRegion(r) {
  const s = GA.filter((a) => a.region === r), inf = gsum(s, (a) => a.inFlight), com = gsum(s, (a) => a.commit), fc = gsum(s, (a) => a.forecast), up = gsum(s, (a) => a.uplift);
  return { r, n: s.length, inf, com, fc, up };
}
function gProduct(k, region) {
  const s = GA.filter((a) => !region || a.region === region), own = GPROD.find((p) => p[0] === k)[2];
  return { inf: gsum(s, (a) => a.inFlight * a.mix[k]), com: gsum(s, (a) => a.commit * a.mix[k]), owns: GA.filter((a) => a.owns[own]).length };
}

// ================= tab: ingress and resolution =================
const GFEEDS = [['Salesforce', 'Pipeline Values & Stage Changes', 'sf_opportunities'], ['Gong', 'Conversation Intelligence & Call Transcripts', 'gong_calls'], ['monday.com', 'Account Workflows & Delivery Tasks', 'monday_projects'], ['Grafana', 'Real-time Telemetry & Product Consumption Metrics', 'grafana_usage']];
function gFeedStat(k) {
  const withProject = GA.filter((a) => a.monday.state !== 'No project');
  if (k === 'Salesforce') return '<b>' + GA.length + '</b> opportunities · <b>' + gfm(GM.inFlight) + '</b> in open deals';
  if (k === 'Gong') return '<b>' + gsum(GA, (a) => a.gong.flags.length) + '</b> active interaction flags on <b>' + GA.filter(gFlagged).length + '</b> accounts';
  if (k === 'monday.com') return '<b>' + withProject.filter(gMonBad).length + '</b> of ' + withProject.length + ' project tasks at risk or blocked';
  return '<b>' + GA.filter((a) => a.usage.deltaPct <= -5).length + '</b> tenants with usage down 5% or more';
}
function gFeeds() {
  return '<div class="gx-feeds">' + GFEEDS.map((f) => { const i = dsInfo(f[2]); return '<div class="gx-feed"><span class="gx-bdg"><b>[</b>' + f[0] + '<b>]</b><i class="gx-live" aria-hidden="true"></i></span><span class="gx-what">(' + f[1] + ')</span><span class="gx-st">' + gFeedStat(f[0]) + '</span>' + (i ? '<span class="gx-fresh' + (i.stale ? ' stale' : '') + '">' + (i.stale ? 'Out of date · ' : '') + 'Updated ' + tsFmt(i.updated).replace(' UTC', '') + ' · ' + esc(i.cadence) + '</span>' : '') + '</div>'; }).join('') + '</div><div class="gx-bus" aria-hidden="true"></div>';
}
function gResolutionDemo() {
  const a = gByName(GX.erAcct) || GA[0], rows = [['Salesforce', a.sources.salesforce.name, true, true], ['Gong', a.sources.gong.name, a.sources.gong.legacy, a.sources.gong.databook], ['monday.com', a.sources.monday.name, a.sources.monday.legacy, a.sources.monday.databook], ['Grafana', a.sources.grafana.name, a.sources.grafana.legacy, a.sources.grafana.databook]];
  return '<div class="gx-erdemo"><div class="gx-hd"><span>See one account across the four feeds</span><select class="fld" style="width:auto;min-width:200px" data-act="gx-eracct" aria-label="Account">' + GA.map((x) => '<option' + (x.name === a.name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
    rows.map((r) => '<div class="gx-erline"><span class="gx-sys">' + r[0] + '</span><span class="gx-rec">' + esc(r[1]) + '</span><span class="' + (r[2] ? 'gx-ok' : 'gx-no') + '">' + (r[2] ? '✓ text match' : '✕ text match') + '</span><span class="' + (r[3] ? 'gx-ok' : 'gx-no') + '">' + (r[3] ? '✓ Databook' : '! needs review') + '</span></div>').join('') +
    '<div class="gx-erfoot">Resolved node: <b>' + esc(a.parent) + '</b> <span class="mono">D-U-N-S ' + esc(a.duns) + ' (mock)</span>. Across the 40 accounts: ' + GM.legacyResolved + ' of ' + GM.links + ' cross-system links resolve by text matching, ' + GM.databookResolved + ' of ' + GM.links + ' with Databook, ' + (GM.links - GM.databookResolved) + ' flagged for review.</div></div>';
}
function gxIngress() {
  const sets = [['Seller activity', 'Calls, messages, email and calendar', 'Gong'], ['CRM', 'Opportunities, stage changes and deal values', 'Salesforce'], ['Real-time signals', 'Executive changes, financial performance, analyst sentiment', 'External and third-party data (illustrative)'], ['Product marketing', 'Launches, customer wins and events', 'Zoom content (not built in this prototype)'], ['Delivery workflows', 'Projects and tasks', 'monday.com (Zoom first-party)'], ['Product consumption', 'Usage and telemetry', 'Grafana (Zoom first-party)']];
  return answerCard({ kicker: 'Data layer · ingress and resolution', headline: 'Four feeds stream in. Text matching links ' + gLegacyPct + '% of them to the right company; Databook links ' + gDbkPct + '%.', stats: [['4', 'feeds streaming'], [gLegacyPct + '%', 'linked by text matching'], [gDbkPct + '%', 'linked by Databook'], [String(GM.links - GM.databookResolved), 'link flagged for review']], sowhat: 'If the AI resolves the wrong company, everything it reasons on top is built on the wrong data and still sounds confident. The 39% and 99% are the figures Databook states; the account-level matches below are mock data.' }) +
    '<div class="card"><div class="hd"><div><span class="kicker">Streaming now</span><h3>Ingress Stream Integration</h3></div><span class="hd-r"><span class="gx-chip g"><i class="gx-live"></i>4 feeds streaming</span><button class="linkbtn" data-act="tab" data-t="sources">Sources, owners and freshness</button></span></div>' + gFeeds() + '</div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">One company, four spellings</span><h3>Databook Entity Resolution Status Bar</h3></div></div><div class="gx-er">' +
    '<div class="gx-erow leg" role="group" aria-label="Legacy System Multi-Source Resolve Rate: ' + gLegacyPct + '% (High risk of fragmented context and mapping mismatches)"><div class="gx-top"><span class="gx-lbl">Legacy System Multi-Source Resolve Rate</span><span class="gx-val num">' + gLegacyPct + '%</span></div><div class="gx-track"><i style="width:' + gLegacyPct + '%"></i></div><span class="gx-cap">(High risk of fragmented context and mapping mismatches)</span></div>' +
    '<div class="gx-erow dbk" role="group" aria-label="Databook 5-Step Resolution Pipeline Accuracy: ' + gDbkPct + '% Verified Node Match"><div class="gx-top"><span class="gx-lbl">Databook 5-Step Resolution Pipeline Accuracy</span><span class="gx-val num">' + gDbkPct + '%</span></div><div class="gx-track"><i style="width:' + gDbkPct + '%"></i></div><span class="gx-cap"><b>Verified Node Match</b> (Processing D-U-N-S IDs, Fuzzy-Matching Parent/Subsidiaries across millions of corporate nodes)</span>' +
    '<div class="gx-steps5"><span class="gx-s5">1 Name</span><span class="gx-arr">→</span><span class="gx-s5">2 D-U-N-S ID</span><span class="gx-arr">→</span><span class="gx-s5">3 Domain</span><span class="gx-arr">→</span><span class="gx-s5">4 Industry</span><span class="gx-arr">→</span><span class="gx-s5">5 Fuzzy match</span><span class="gx-arr">→</span><span class="gx-s5 hr">Low confidence goes to human review</span></div></div>' + gResolutionDemo() + '</div></div>' +
    gHandoffs() + gContextLayers() + gDevelopments() + gImport() + '<div class="card"><div class="hd"><div><span class="kicker">Where the context graph gets its facts</span><h3>Databook\'s data sets, and what feeds them here</h3></div></div><div class="tbl-wrap"><table><thead><tr><th>Data set</th><th>What it holds</th><th>In this prototype</th></tr></thead><tbody>' + sets.map((s) => '<tr><td><b>' + s[0] + '</b></td><td>' + s[1] + '</td><td>' + s[2] + '</td></tr>').join('') + '</tbody></table></div><p class="note" style="margin-top:10px">Databook reads four data sets into the customer context graph: seller activity, CRM, real-time signals and product marketing. Zoom\'s delivery and usage data join as first-party sources.</p></div>';
}

// ================= tab: revenue and uplift =================

// ================= tab: region and product =================
const GW = { ok: 'On track', warn: 'Watch', bad: 'Act now', insufficient: 'Thin data' };
function gRegionCard(r) {
  const g = gRegion(r), row = M.matrix.region.find((q) => q.label === r), o = hOverall(row), b = M.bridge[r], max = Math.max(b.plan, b.landing) * 1.08;
  return '<div class="rc ' + stDot(o.st) + (GX.fRegion === r ? ' on' : '') + '"><button class="rc-main" data-act="gx-region" data-r="' + r + '" title="Open this region in the account engine"><span class="rc-top"><b>' + r + ' <small style="color:var(--ink-3);font-weight:450">' + g.n + ' accounts</small></b><span class="rs">' + dot(stDot(o.st)) + RWORD[o.st] + '</span></span>' +
    '<span class="rc-big"><b class="num">' + fm(b.landing, 1) + '</b><small>forecast · plan ' + fm(b.plan, 1) + '</small></span><span class="rc-bar"><i style="width:' + (b.landing / max) * 100 + '%"></i><u style="left:' + (b.plan / max) * 100 + '%"></u></span>' +
    '</button>' + hMeasureRows(row) + '</div>';
}
function gxRegProd() {
  const tot = gsum(GPROD, (p) => gProduct(p[0]).inf), regs = GREG.map(gRegion).sort((x, y) => y.fc - x.fc), prods = GPROD.map((p) => [p, gProduct(p[0]).inf]).sort((x, y) => y[1] - x[1]);
  const rows = GPROD.map((p) => { const st = gProduct(p[0]); return '<tr class="click' + (GX.fProd === p[0] ? ' on' : '') + '" data-act="gx-prod" data-p="' + p[0] + '" title="Open this product in the account engine"><td><b>' + p[1] + '</b></td><td><div class="bar-cell"><span class="num" style="min-width:52px">' + gfm(st.inf, 1) + '</span><div class="mini"><i style="width:' + (st.inf / tot) * 100 + '%;background:var(--data)"></i></div></div></td><td class="r num">' + gfm(st.com, 1) + '</td><td class="r num">' + st.owns + ' of ' + GA.length + '</td>' + GREG.map((r) => '<td class="r num">' + gfm(gProduct(p[0], r).inf, 1) + '</td>').join('') + '</tr>'; }).join('');
  const rivals = {}; GA.filter((a) => a.rival).forEach((a) => (rivals[a.rival] = (rivals[a.rival] || 0) + a.inFlight));
  const rv = Object.entries(rivals).sort((x, y) => y[1] - x[1]).slice(0, 5), rmx = rv.length ? rv[0][1] : 1;
  return answerCard({ kicker: 'Intelligence layer · region and product', headline: GREG.map((r) => ({ r, fc: M.bridge[r].landing })).sort((x, y) => y.fc - x.fc).slice(0, 1).map((x) => x.r + ' carries the most bookings forecast (' + gfm(x.fc, 1) + ').').join('') + ' ' + prods[0][0][1] + ' holds the most open pipeline (' + gfm(prods[0][1], 1) + ' of ' + gfm(tot, 1) + ').', sowhat: 'Each region card shows the same four measures as the CRO Hub. Select a card or a product to open its accounts. Product values split each account\'s open pipeline across its open opportunities.' }) +
    '<div class="gx-rgrid">' + GREG.map(gRegionCard).join('') + '</div>' + 
    '<div class="grid"><div class="card"><div class="hd"><div><span class="kicker">Open opportunities by product line</span><h3>What Zoom is selling</h3></div></div><div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Open deals</th><th class="r">Agreed</th><th class="r">Owned by</th>' + GREG.map((r) => '<th class="r">' + r + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">Open deals naming a rival</span><h3>Where rivals show up</h3></div><span class="hd-r"><button class="linkbtn" data-act="gosub" data-t="compete" data-s="map">Open the country map</button></span></div>' + rv.map((x) => '<div class="hbar"><span class="hn">' + esc(x[0]) + '</span><div class="mini" style="height:10px"><i style="width:' + (x[1] / rmx) * 100 + '%;background:var(--dot-warn)"></i></div><span class="hv num">' + gfm(x[1]) + '</span></div>').join('') + '</div></div>';
}

// ================= tab: guided selling =================
function gPlay(p, i) {
  const a = gByName(p.account), st = gps(p.id), open = GX.playOpen === p.id, done = st.steps.filter(Boolean).length, nextI = st.steps.findIndex((x) => !x);
  const steps = p.steps.map((s, j) => '<li><label class="' + (st.steps[j] ? 'done' : '') + (st.auth ? '' : ' dis') + '"><input type="checkbox" data-act="gx-pstep" data-id="' + p.id + '" data-i="' + j + '" ' + (st.steps[j] ? 'checked' : '') + ' ' + (st.auth ? '' : 'disabled') + '><span class="t"><b>' + (j + 1) + '. ' + esc(s[0]) + '</b><span style="color:var(--ink-3)">' + esc(s[1]) + '</span></span></label></li>').join('');
  const posted = GX.sent[a.id] ? '<div class="msg" style="margin-top:8px"><b>Posted to #acct-' + gSlug(a.name) + ' (simulated)</b>' + esc(GX.sent[a.id].split('\n')[0]) + '</div>' : '';
  const msg = !st.auth ? '<div class="idle">Appears in Slack and Salesforce once you approve the play.</div>' : '<div class="msg"><b>Next best move · ' + esc(p.account) + '</b>' + esc(p.title) + '</div><div class="nx">' + (nextI < 0 ? 'All four steps done. Record the buyer\'s next step.' : 'Step ' + (nextI + 1) + ' of 4: ' + esc(p.steps[nextI][0])) + '</div>';
  const msgAll = msg + posted;
  return '<div class="gx-play' + (open ? ' open' : '') + (st.auth ? ' auth' : '') + (GX.flash === p.id ? ' flash' : '') + '" id="gx-' + p.id + '"><button class="gx-play-h" data-act="gx-play" data-id="' + p.id + '" aria-expanded="' + open + '"><span class="gx-pn">' + (st.auth ? '✓' : i + 1) + '</span><span><b>' + esc(p.title) + '</b><span class="gx-m"><span>' + esc(p.account) + '</span><span>' + playStake(p, a) + '</span><span>Seller: ' + esc(a.rep) + '</span></span></span>' + (st.auth ? '<span class="gx-chip g">' + (st.steps.every(Boolean) ? 'Completed' : 'Approved · ' + done + ' of 4') + '</span>' : '<span class="gx-chip o">Waiting for you</span>') + '</button>' +
    '<div class="gx-play-x"><div><p class="gx-why"><b>Why.</b> ' + esc(p.why) + '</p><dl class="gx-case"><dt>Why change</dt><dd>' + esc(p.change) + '</dd><dt>Why now</dt><dd>' + esc(p.now) + '</dd><dt>Why us</dt><dd>' + esc(p.us) + '</dd></dl><ol class="gx-gsteps">' + steps + '</ol><div class="gx-act">' + (st.auth ? '<label class="gx-chip ' + (st.buyer ? 'g' : '') + '" style="cursor:pointer"><input type="checkbox" data-act="gx-buyer" data-id="' + p.id + '" ' + (st.buyer ? 'checked' : '') + ' ' + (st.steps.every(Boolean) ? '' : 'disabled') + ' style="margin:0 6px 0 0"> Buyer agreed a dated next step</label>' : '<button class="btn red" data-act="gx-auth" data-id="' + p.id + '">Approve play</button>' + (p.decision ? '<button class="btn" data-act="mv-set" data-id="' + p.decision + '" data-v="Rejected">Defer</button><button class="btn ghost" data-act="hb-evid" data-id="' + p.decision + '">Ask for evidence</button>' : '')) + '' + (st.auth ? '<button class="btn ghost" data-act="gx-undo" data-id="' + p.id + '">Undo approval</button>' : '') + '<button class="btn" data-act="hb-acct" data-id="' + a.id + '">See the account</button><button class="btn" data-act="gx-msg" data-a="' + a.id + '">Message the account team</button><button class="btn" data-act="opencoach" data-id="' + a.id + '">Open the six-step coach</button></div></div>' +
    '<div class="gx-slack"><div class="gx-hd"><span class="gx-av">Z</span>What ' + esc(a.rep.split(' ')[0]) + ' sees in Slack and Salesforce (simulated)</div>' + msgAll + '</div></div></div>';
}
function gxGuided() {
  const c = gProve(), mx = Math.max.apply(null, c.map((x) => x[1])), waiting = GPLAYS.filter((p) => !gps(p.id).auth).length;
  return answerCard({ kicker: 'Execution layer · guided selling', headline: waiting ? waiting + ' move' + (waiting > 1 ? 's are' : ' is') + ' waiting for you. Approve one and the seller is guided step by step.' : 'All three moves are approved. Watch the sellers work through them.', sowhat: 'The CRO decides, the seller is guided in Slack and Salesforce, and the result flows back so the CRO can see whether execution improved. The CRO approves first because sellers tend to ignore an AI nudge that does not come from a manager or a colleague.' }) +
    '<div class="card"><div class="hd"><div><span class="kicker">From issue to action: decide, guide, prove</span><h3>Next best moves</h3></div><span class="hd-r"><button class="linkbtn" data-act="tab" data-t="coach">Seller coach</button></span></div><div class="gx-plays">' + GPLAYS.map(gPlay).join('') + '</div>' +
    '<div class="gx-prove"><h3>Is it lifting revenue? <small>Pilot sample plus what you do in this demo</small></h3>' + c.map((x) => '<div class="gx-prow"><span>' + x[0] + '</span><div class="gx-lb"><i style="width:' + Math.max(4, (x[1] / mx) * 100) + '%"></i></div><b class="num">' + x[1] + '</b></div>').join('') + '<div class="gx-prow pend"><span>Revenue outcome</span><div class="gx-lb"><i></i></div><b>-</b></div><p class="gx-pnote">Revenue lags the plays by weeks, so none is claimed yet. A 90-day proof of value measures it against the baseline agreed up front.</p></div></div>' +
    gAssets() +
    gMethodology() +
    wk('loopd', 'The execution loop, step by step', loopCard()) +
    '<div class="card"><div class="hd"><div><span class="kicker">What the threads are watching for</span><h3>Common risks that drive down win rates and pipeline forecasts</h3></div></div><div class="tbl-wrap"><table><thead><tr><th>Risk</th><th>Where it shows here</th><th class="r">Accounts</th></tr></thead><tbody>' + [['Not engaging with budget authority', 'Single-threaded sponsor', GA.filter((a) => a.thread === 'single').length], ['Missed steps in the sales motion', 'Stalled next steps', GA.filter((a) => a.thread === 'stalled').length], ['Project misaligned with the board\'s priority', 'Unclear business case: no link to the customer\'s stated mandate', GA.filter((a) => a.thread === 'business').length], ['Not quantifying the business case', 'Unclear business case', GA.filter((a) => a.thread === 'business').length], ['No proof of value during the cycle', 'Stalled next steps: pilot usage falling', GA.filter((a) => a.thread === 'stalled').length]].map((r) => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td class="r num">' + r[2] + '</td></tr>').join('') + '</tbody></table></div><p class="note" style="margin-top:10px">Each risk is a thread in the Customer Context Graph. Threads are not topics: new evidence that contradicts what is known changes the weight given to each fact, and the graph keeps reasoning.</p></div>';
}

// ================= tab: account engine =================

// ================= tab: Sales Ops Studio (a simulated compiler) =================
const GPERSONAS = [[/\bCIOs?\b|chief information officer/i, 'CIO'], [/procurement/i, 'Procurement Leader'], [/\bCFOs?\b|chief financial/i, 'CFO'], [/\bCTOs?\b|chief technology/i, 'CTO'], [/\bCISOs?\b|security leader/i, 'CISO'], [/\bCROs?\b|chief revenue/i, 'CRO'], [/\bCMOs?\b|chief marketing/i, 'CMO']];
const GPRODS = [[/virtual agent/i, 'Zoom Virtual Agent'], [/contact center/i, 'Zoom Contact Center'], [/ai companion/i, 'Zoom AI Companion'], [/workplace/i, 'Zoom Workplace'], [/\bphone\b/i, 'Zoom Phone'], [/\brooms?\b/i, 'Zoom Rooms']];
function gParse(t) {
  const personas = GPERSONAS.filter((p) => p[0].test(t)).map((p) => p[1]), product = (GPRODS.find((p) => p[0].test(t)) || [])[1];
  return { personas, product, sig: { usage: /usage|grafana|decline|drop/i.test(t), renewal: /renewal/i.test(t), legacy: /legacy|expir/i.test(t), lost: /lost (a|an|the)? ?(deal|opportunit)|lost to (a )?(rival|competitor)|rival loss|displaced/i.test(t) } };
}
function gBuildCfg(p) {
  const slug = (p.product || 'zoom').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), pers = p.personas.map((x) => x.toLowerCase().replace(/[^a-z]+/g, '_')).join('_');
  const sources = [], signals = {}, rules = [];
  if (p.sig.usage) { sources.push({ id: 'grafana.usage', system: 'Grafana', metric: 'active_seats_delta_pct', window: '30d', refresh: '1h' }); signals.usage_decline = { source: 'grafana.usage', when: 'active_seats_delta_pct <= -5' }; }
  if (p.sig.renewal) { sources.push({ id: 'salesforce.renewals', system: 'Salesforce', object: 'Account', field: 'renewal_date', refresh: '15m' }); signals.renewal_window = { source: 'salesforce.renewals', when: 'days_to_renewal <= 180' }; }
  if (p.sig.legacy) { sources.push({ id: 'salesforce.contracts', system: 'Salesforce', object: 'Contract', field: 'legacy_contract_end', refresh: '15m' }); signals.legacy_expiry = { source: 'salesforce.contracts', when: 'days_to_legacy_expiry <= 240' }; }
  if (p.sig.lost) { sources.push({ id: 'salesforce.closed_lost', system: 'Salesforce', object: 'Opportunity', field: 'competitor_on_closed_lost', refresh: '15m' }); signals.lost_to_rival = { source: 'salesforce.closed_lost', when: 'rival_losses_12m >= 1' }; signals.untapped_product = { source: 'sf_accounts', when: 'untapped_revenue >= 2' }; rules.push({ id: 'rival_loss_with_untapped_product', plain: 'Lost a deal to a rival in the last year and still has an untapped product', description: 'Lost a deal to a rival in the last year and still has an untapped Zoom product', when: { all: ['lost_to_rival', 'untapped_product'] }, effect: { priority_weight: '+0.50' }, approval: 'sales_ops_review' }); }
  if (p.sig.usage && p.sig.renewal) rules.push({ id: 'usage_decline_in_renewal_window', plain: 'Usage is down 5% or more and the renewal is within 6 months', description: 'Grafana usage decline cross-referenced with a Salesforce renewal window', when: { all: ['usage_decline', 'renewal_window'] }, effect: { priority_weight: '+0.25' }, approval: 'sales_ops_review' });
  else if (p.sig.usage) rules.push({ id: 'usage_decline', plain: 'Usage is down 5% or more', description: 'Grafana usage decline', when: { all: ['usage_decline'] }, effect: { priority_weight: '+0.15' }, approval: 'sales_ops_review' });
  if (p.sig.legacy) rules.push({ id: 'active_legacy_contract_expiry', plain: 'The legacy contract expires within 8 months', description: 'Enterprise is inside an active legacy contract expiry window', when: { all: ['legacy_expiry'] }, effect: { priority_weight: '+0.35' }, approval: 'automatic' });
  return { workbench: { id: 'wb_' + slug + (pers ? '_' + pers : ''), name: (p.product || 'Zoom') + ' priority scoring' + (p.personas.length ? ' for ' + p.personas.join(' and ') : ''), version: '1.0.0', owner: 'sales_ops', status: 'compiled' }, audience: { personas: p.personas, product: p.product || 'Zoom (all products)', accounts_in_scope: GA.length }, sources, signals, rules, scoring: { base: 'in_flight_value_percentile', combine: 'additive', cap: 1.0, tiers: { P1: '>= 85', P2: '>= 65', P3: '< 65' } }, output: { format: 'json', schema: 'databook.workbench.score.v1' } };
}
function gEval(cfg, wts) {
  const has = (k) => k in cfg.signals, mxv = Math.max.apply(null, GA.map((a) => a.inFlight));
  return GA.map((a) => {
    const fired = [], zz = M.acc[a.id] || {}, sg = { usage_decline: a.usage.deltaPct <= -5, renewal_window: a.renewalDays <= 180, legacy_expiry: a.legacyExpiryDays != null && a.legacyExpiryDays <= 240, lost_to_rival: (zz.lost4 || 0) > 0, untapped_product: (zz.whitespace || 0) >= 2 };
    cfg.rules.forEach((r) => { if (r.when.all.every((k) => has(k) && sg[k])) fired.push(r); });
    const base = Math.round(30 + 40 * Math.sqrt(a.inFlight / mxv)), w = gsum(fired, (r) => (wts && wts[r.id] != null ? wts[r.id] : parseFloat(r.effect.priority_weight))), final = Math.min(100, Math.round(base * (1 + w)));
    return { a, base, w, final, fired };
  }).sort((x, y) => y.final - x.final || y.a.inFlight - x.a.inFlight);
}
const gTier = (n) => (n >= 85 ? 'P1' : n >= 65 ? 'P2' : 'P3');
function gSchema(cfg, ranked) {
  const top = ranked[0], ex = { account: { id: top.a.id, name: top.a.name, parentNode: { name: top.a.parent, duns: top.a.duns }, sfdcOppId: top.a.sfdcOppId }, signals: { usage_decline: top.a.usage.deltaPct <= -5, renewal_window: top.a.renewalDays <= 180, legacy_expiry: top.a.legacyExpiryDays != null && top.a.legacyExpiryDays <= 240 }, score: { base: top.base, weight_delta: +top.w.toFixed(2), final: top.final, tier: top.final >= 85 ? 'P1' : top.final >= 65 ? 'P2' : 'P3' }, drivers: top.fired.map((r) => ({ rule: r.id, weight: r.effect.priority_weight })) };
  return { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'databook.workbench.score.v1', title: cfg.workbench.name, type: 'object',
    compiled: { workbench: cfg.workbench, audience: cfg.audience, signals: Object.keys(cfg.signals).map((k) => ({ id: k, source: cfg.signals[k].source, predicate: cfg.signals[k].when })), rules: cfg.rules.map((r) => ({ id: r.id, requires: r.when.all, effect: { target: 'priority_weight', op: 'add', value: parseFloat(r.effect.priority_weight) }, approval: r.approval })), scoring: cfg.scoring },
    properties: { account: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, parentNode: { type: 'object', properties: { name: { type: 'string' }, duns: { type: 'string' } }, required: ['name', 'duns'] }, sfdcOppId: { type: 'string', pattern: '^006[A-Za-z0-9]{15}$' } }, required: ['id', 'name', 'parentNode'] },
      signals: { type: 'object', properties: Object.fromEntries(Object.keys(cfg.signals).map((k) => [k, { type: 'boolean' }])) },
      score: { type: 'object', properties: { base: { type: 'integer', minimum: 0, maximum: 100 }, weight_delta: { type: 'number' }, final: { type: 'integer', minimum: 0, maximum: 100 }, tier: { enum: ['P1', 'P2', 'P3'] } }, required: ['base', 'final', 'tier'] },
      drivers: { type: 'array', items: { type: 'object', properties: { rule: { type: 'string' }, weight: { type: 'string' } } } } },
    required: ['account', 'score'], example: ex };
}
function gYaml(v, ind) {
  const pad = '  '.repeat(ind), sc = (x) => (typeof x === 'string' && (/[:#\[\]{},&*!|<>'"%@`]|^\s|\s$|^$|^[-?]/.test(x) || /^(true|false|null|\d)/.test(x)) ? JSON.stringify(x) : String(x));
  if (Array.isArray(v)) { if (!v.length) return pad + '[]\n'; if (v.every((x) => typeof x !== 'object')) return pad + '[' + v.map(sc).join(', ') + ']\n'; return v.map((x) => pad + '- ' + gYaml(x, ind + 1).replace(/^\s+/, '')).join(''); }
  if (v && typeof v === 'object') return Object.keys(v).map((k) => { const x = v[k]; if (x && typeof x === 'object' && !(Array.isArray(x) && (!x.length || x.every((y) => typeof y !== 'object')))) return pad + k + ':\n' + gYaml(x, ind + 1); return pad + k + ': ' + (Array.isArray(x) ? gYaml(x, 0).trim() : sc(x)) + '\n'; }).join('');
  return pad + sc(v) + '\n';
}
const gHlYaml = (l) => { if (l.trim().startsWith('#')) return '<span class="gx-tk-c">' + esc(l) + '</span>'; return esc(l).replace(/^(\s*(?:- )?)([A-Za-z0-9_.$-]+)(:)/, '$1<span class="gx-tk-k">$2</span>$3').replace(/(&quot;[^&]*?&quot;)/g, '<span class="gx-tk-s">$1</span>').replace(/(: |\[|, )(-?\d+(?:\.\d+)?)(?=\]|,|$)/g, '$1<span class="gx-tk-n">$2</span>').replace(/(: )(true|false)$/g, '$1<span class="gx-tk-b">$2</span>'); };
const gHlJson = (l) => esc(l).replace(/^(\s*)(&quot;[^&]*?&quot;)(:)/, '$1<span class="gx-tk-k">$2</span>$3').replace(/(: )(&quot;[^&]*?&quot;)/, '$1<span class="gx-tk-s">$2</span>').replace(/([\[,] ?|: )(&quot;[^&]*?&quot;)(?=,?$|\])/g, '$1<span class="gx-tk-s">$2</span>').replace(/(: )(-?\d+(?:\.\d+)?)(,?)$/, '$1<span class="gx-tk-n">$2</span>$3').replace(/(: )(true|false|null)(,?)$/, '$1<span class="gx-tk-b">$2</span>$3');
function gCompile() {
  const p = gParse(GX.prompt || '');
  if (!p.sig.usage && !p.sig.renewal && !p.sig.legacy && !p.sig.lost) { GX.err = 'No scoring signal found. This simulated compiler recognises usage declines, renewal windows and legacy contract expiries, plus personas and Zoom products.'; return; }
  GX.err = ''; GX.wts = {}; const cfg = gBuildCfg(p), ranked = gEval(cfg); GX.cfg = cfg; GX.ranked = ranked; GX.parsed = p;
  GX.compiled = { yaml: '# Databook AI Studio · Sales Ops Workbench\n# Compiled from the directive on the left (simulated compiler)\n' + gYaml(cfg, 0), json: JSON.stringify(gSchema(cfg, ranked), null, 2) };
}
function gRunCompile() {
  const steps = ['Parsing directive', 'Resolving personas and product', 'Binding Grafana and Salesforce signals', 'Compiling rules engine', 'Validating output schema'];
  GX.runLog = [];
  steps.forEach((t, i) => setTimeout(() => { GX.runLog.push(t); if (i === steps.length - 1) { gCompile(); GX.runLog.push(GX.err ? 'Stopped: nothing to compile' : 'Compiled with 0 errors'); } if (S.tab === 'studio') gStudioParts(); }, 220 * (i + 1)));
  gStudioParts();
}
function gEditor() {
  const canvas = GX.ed === 'canvas', txt = GX.compiled ? (GX.ed === 'yaml' ? GX.compiled.yaml : GX.compiled.json) : '', lines = txt.replace(/\n$/, '').split('\n'), hl = GX.ed === 'yaml' ? gHlYaml : gHlJson;
  return '<div class="gx-ed"><div class="gx-ed-t"><div class="gx-ed-tabs" role="tablist"><button role="tab" data-act="gx-ed" data-k="yaml" aria-selected="' + (GX.ed === 'yaml') + '">scoring_workbench.yaml</button><button role="tab" data-act="gx-ed" data-k="json" aria-selected="' + (GX.ed === 'json') + '">compiled_output.schema.json</button><button role="tab" data-act="gx-ed" data-k="canvas" aria-selected="' + canvas + '">agent composer</button></div><button class="btn sm" data-act="gx-copy">Copy</button></div>' +
    (canvas ? '<div class="gx-canvas">' + gCanvas() + '</div>' : GX.compiled ? '<div class="gx-ed-body"><div class="gx-ed-gut" aria-hidden="true">' + lines.map((_, i) => i + 1).join('\n') + '</div><pre class="gx-ed-code" style="margin:0" tabindex="0" aria-label="' + (GX.ed === 'yaml' ? 'YAML configuration' : 'JSON output schema') + '">' + lines.map(hl).join('\n') + '</pre></div>' : '<div class="gx-ed-body"><div class="gx-ed-gut"></div><div class="gx-ed-code" style="color:var(--ink-3)">Compile a directive to see the configuration here.</div></div>') +
    '<div class="gx-ed-s"><span>' + (canvas ? 'Agent composer · the same workflow as a graph' : (GX.ed === 'yaml' ? 'YAML' : 'JSON') + ' · UTF-8 · ' + lines.length + ' lines') + '</span><span class="' + (GX.compiled && !GX.err ? 'gx-ok' : '') + '">' + (GX.compiled ? '● Compiled · 0 errors' : 'Not compiled') + '</span></div></div>';
}
function gStudioLeft() {
  const p = GX.parsed;
  return (GX.err ? '<div class="gx-errbox">' + esc(GX.err) + '</div>' : '') + (p ? '<div class="gx-parsed">' + p.personas.map((x) => '<span class="gx-chip b">' + esc(x) + '</span>').join('') + (p.product ? '<span class="gx-chip g">' + esc(p.product) + '</span>' : '') + (p.sig.usage ? '<span class="gx-chip o">Grafana usage decline</span>' : '') + (p.sig.renewal ? '<span class="gx-chip o">Salesforce renewal window</span>' : '') + (p.sig.legacy ? '<span class="gx-chip r">Legacy contract expiry</span>' : '') + (p.sig.lost ? '<span class="gx-chip r">Lost to a rival, product untapped</span>' : '') + '</div>' : '') +
    (GX.runLog.length ? '<div class="gx-runlog">' + GX.runLog.map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>' : '') +
    (GX.cfg ? gWeighting() : '');
}
function gxStudio() {
  if (!GX.compiled) { gCompile(); GX.runLog = ['Compiled with 0 errors']; }
  return '<div class="sec-title"><span class="kicker">Analyst · AI Studio</span><h2>Sales Ops Studio</h2><p>Describe a scoring workbench in plain English. The studio compiles it into a rules engine and scores the 40 accounts as a preview.</p></div>' +
    '<div class="gx-studio"><div class="card"><div class="hd"><h3>Directive</h3><span class="gx-chip g"><i class="gx-live"></i>AI Studio</span></div><div style="display:flex;flex-direction:column;gap:14px"><textarea class="gx-prompt" id="gx-prompt" spellcheck="false" aria-label="Workbench directive">' + esc(GX.prompt) + '</textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn red" data-act="gx-compile">Compile workbench</button><button class="btn" data-act="gx-sample">Reset to sample</button></div><div id="gx-left" style="display:flex;flex-direction:column;gap:14px">' + gStudioLeft() + '</div></div></div>' +
    '<div class="card"><div class="hd"><h3>Rules engine</h3><span class="gx-chip">Simulated compiler</span></div><div id="gx-editor">' + gEditor() + '</div></div></div>';
}
function gStudioParts() { const a = document.getElementById('gx-left'), b = document.getElementById('gx-editor'); if (a) a.innerHTML = gStudioLeft(); if (b) b.innerHTML = gEditor(); }

// ================= the customer context graph: inside the account engine =================
function gThreadBody(t) {
  const ty = GTYPE[t.type], pid = GTHREAD_PLAY[t.id];
  return '<div class="gx-th-x"><div class="cg"><div class="cg-src" style="--c:' + ty[1] + '">' + t.events.map((e) => '<div class="cg-r"><span class="gx-chip ' + (GSRC[e[0]] || '') + '">' + esc(e[0]) + '</span><span class="cg-d">' + esc(e[1]) + '</span><span class="cg-t">' + esc(e[2]) + '</span></div>').join('') + '</div><div class="cg-node" style="--c:' + ty[1] + '"><small>Account</small><b>' + esc(t.account) + '</b><span>' + ty[0] + '</span><em class="num">' + gfm(t.amount, 1) + ' in open deals</em></div></div>' +
    '<div class="gx-provh">Provenance chain <span class="cg-mock">mock timestamps</span></div><p class="gx-prov">' + esc(t.text) + '</p><div class="gx-th-act">' + (pid ? '<button class="btn red sm" data-act="gx-gotoplay" data-id="' + pid + '">See the guided play</button>' : '') + (t.aid ? '<button class="btn sm" data-act="gx-msg" data-a="' + t.aid + '">Message the account team</button><button class="btn sm" data-act="graph" data-id="' + t.aid + '">Open the account graph</button>' : '') + '</div></div>';
}

// ================= events =================
const gGo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
function gOpenThread(id) { GX.thread = id; GX.tfilter = 'all'; if (S.tab !== 'accounts') { S.move = null; S.tab = 'accounts'; S.sub.accounts = 'priority'; pushHash(); } renderAll(); const el = document.getElementById('gx-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function gGotoPlay(id) { GX.playOpen = id; GX.flash = id; if (S.tab !== 'guided') { S.tab = 'guided'; pushHash(); renderAll(); window.scrollTo(0, 0); } else renderView(); setTimeout(() => { gGo('gx-' + id); }, 30); setTimeout(() => { GX.flash = null; const el = document.getElementById('gx-' + id); if (el) el.classList.remove('flash'); }, 1800); }
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act^="gx-"]'); if (!t) return; const a = t.dataset.act, d = t.dataset;
  if (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && a !== 'gx-pstep' && a !== 'gx-buyer')) return;
  if (a === 'gx-thread') { GX.thread = GX.thread === d.id ? null : d.id; renderView(); }
  else if (a === 'gx-openthread') gOpenThread(d.id);
  else if (a === 'gx-gotoplay') gGotoPlay(d.id);
  else if (a === 'gx-tfilter') { GX.tfilter = d.f; renderView(); }
  else if (a === 'gx-filter') { GX.filter = d.f; GX.all = false; renderView(); }
  else if (a === 'gx-region') { S.region = d.r; S.sub.accounts = 'priority'; setTab('accounts'); }
  else if (a === 'gx-prod') { S.sub.accounts = 'priority'; setTab('accounts'); }
  else if (a === 'gx-row') { GX.open = GX.open === d.id ? null : d.id; renderView(); }
  else if (a === 'gx-all') { GX.all = !GX.all; renderView(); }
  else if (a === 'gx-play') { GX.playOpen = GX.playOpen === d.id ? null : d.id; renderView(); }
  else if (a === 'gx-auth') { gps(d.id).auth = true; gSavePlays(); GX.playOpen = d.id; const pl = GPLAYS.find((x) => x.id === d.id); if (pl && pl.decision) { desk.actionStatus[pl.decision] = 'Approved'; saveDesk(); audit('Approved play: ' + pl.title); } renderView(); }
  else if (a === 'gx-pstep') { const st = gps(d.id); if (!st.auth) return; st.steps[+d.i] = t.checked; if (!st.steps.every(Boolean)) st.buyer = false; gSavePlays(); renderView(); }
  else if (a === 'gx-buyer') { gps(d.id).buyer = t.checked; gSavePlays(); renderView(); }
  else if (a === 'gx-compile') { const p = document.getElementById('gx-prompt'); if (p) GX.prompt = p.value; gRunCompile(); }
  else if (a === 'gx-sample') { GX.prompt = GSAMPLE; renderView(); }
  else if (a === 'gx-ed') { GX.ed = d.k; gStudioParts(); }
  else if (a === 'gx-copy') { const txt = GX.compiled ? (GX.ed === 'yaml' ? GX.compiled.yaml : GX.compiled.json) : ''; try { navigator.clipboard.writeText(txt).then(() => { t.textContent = 'Copied'; setTimeout(() => (t.textContent = 'Copy'), 1400); }, () => { t.textContent = 'Select the text to copy'; }); } catch (er) { t.textContent = 'Select the text to copy'; } }
});
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.act === 'gx-search') { GX.q = t.value; GX.all = false; const pos = t.selectionStart; renderView(); const n = document.querySelector('.gx-search'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } else if (t.id === 'gx-prompt') GX.prompt = t.value; });
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.act === 'gx-eracct') { GX.erAcct = e.target.value; renderView(); } });

// ================= tab: without vs with Databook =================
// Figures marked "as Databook states" are Databook's own illustration of the economics; the sized lines come from this prototype's model.
const gCommercial = () => '<div class="gx-comm">' + [['Where we have been', 'Account-based', ['Priced per account', 'Invoiced up front, renewed annually', 'Business case difficult to measure based on "buffet" access'], ''], ['Fast to start, easy to scale', 'Consumption-based', ['Start with one team, widen as workflows prove out', 'No big-bang commitment', 'Finance sees cost move with adoption'], 'mid'], ['Full risk-sharing partnership', 'Outcome-based', ['Small platform fee, then 3% of revenue above your financial plan', 'Baseline is your CFO\'s plan, agreed before work begins', 'System-measured, not self-reported by Databook'], 'new']].map((c) => '<div class="gx-cm ' + c[3] + '"><span class="gx-cmk">' + c[0] + (c[3] === 'new' ? '<i class="gx-new">New</i>' : '') + '</span><b>' + c[1] + '</b><ul>' + c[2].map((x) => '<li>' + x + '</li>').join('') + '</ul></div>').join('') + '</div>';

// ================= ingress tab: handoffs, context layers, outside signals =================
function gHandoffs() {
  const rows = [['Marketing', 'Generates demand', 700], ['SDR', 'Qualifies the lead', 490], ['Account Executive', 'Runs discovery', 343], ['Solution Consultant', 'Scopes the solution', 240], ['Value Engineer', 'Builds the business case', 168], ['Deal Desk', 'Structures and closes', 118], ['Customer Success', 'Onboards the customer', 58]], loss = ['', '-30%', '-30%', '-30%', '-30%', '-30%', '-51%'];
  return '<div class="card"><div class="hd"><div><span class="kicker">Why context degrades</span><h3>The compounding math of handoffs</h3></div><span class="gx-chip o">Databook\'s illustration</span></div><p class="gx-lead">Seven ownership changes run from lead to live customer. Context is lost at every one, so 700 inbound leads end up as roughly 58 customers, an 8.2% conversion rate.</p><div class="gx-hand">' +
    rows.map((r, i) => '<div class="gx-hrow"><span class="gx-hn"><b>' + r[0] + '</b><small>' + r[1] + '</small></span><span class="gx-hbar"><i style="width:' + (r[2] / 700) * 100 + '%"></i></span><b class="num gx-hv">' + r[2] + '</b><span class="gx-hl">' + (loss[i] ? loss[i] + ' lost' : '') + '</span></div>').join('') + '</div>' +
    '<div class="gx-why5"><b>Why the leaks happen</b><span class="gx-chip r">System silos</span><span class="gx-chip r">Incomplete CRM fields</span><span class="gx-chip r">Mapping mismatches</span><span class="gx-chip r">Employee turnover: the account\'s history walks out the door</span><span class="gx-chip r">Only the seller\'s view: the champion filters what the seller hears</span></div></div>';
}
function gContextLayers() {
  return '<div class="card"><div class="hd"><div><span class="kicker">Start from the customer\'s ground truth</span><h3>The customer context graph: why change, why now, why us</h3></div></div><div class="gx-layers"><div class="gx-lay us"><b>Why us</b><span>First-party: CRM, calls, documents, planning data. In this prototype: Salesforce, Gong, monday.com and Grafana.</span></div><div class="gx-lay chg"><b>Why change · why now</b><span>Third-party: industry shifts, financials, stated priorities, contacts. In this prototype: outside signals, illustrative.</span></div><div class="gx-lay dat"><b>Data, resolved once</b><span>Your systems of record, transcripts and documents, licensed market data. The entity resolution above runs here, before anything reasons on top.</span></div></div>' +
    '<p class="note" style="margin-top:12px">The point is to begin with what the customer needs, then tie it to Zoom\'s own context and systems, so sellers sell to the customer\'s priorities and not to the deal. A new CXO, a stated Q3 downsizing mandate or a stalled pilot each change the case, and the graph keeps reasoning as evidence arrives.</p></div>';
}
const GSIGNAL = { 'Executive move': 'Leadership changes tend to reopen vendor priorities and budget reviews.', Earnings: 'Financial performance shapes how much budget the customer can commit.', News: 'Stated priorities show what the customer says it is trying to do.', Technology: 'What the customer already runs shows where Zoom fits or conflicts.', Hiring: 'Job postings show where the customer is investing.' };
function gDevelopments() {
  const a = gByName(GX.erAcct) || GA[0], ev = (T.external_signals || []).filter((e) => e.account_id === a.id).sort((x, y) => (x.published_date < y.published_date ? 1 : -1));
  return '<div class="card"><div class="hd"><div><span class="kicker">Outside data, beside the internal feeds</span><h3>Recent developments</h3></div><select class="fld" style="width:auto;min-width:200px" data-act="gx-eracct" aria-label="Account">' + GA.map((x) => '<option' + (x.name === a.name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
    (ev.length ? '<div class="gx-dev">' + ev.slice(0, 5).map((e) => '<div class="gx-dv"><span class="gx-chip ' + (e.type === 'Executive move' ? 'r' : e.type === 'Earnings' ? 'o' : 'b') + '">' + esc(e.type) + '</span><span class="gx-dt">' + dateFmt(e.published_date) + '</span><div><b>' + esc(e.text) + '</b><small>' + esc(GSIGNAL[e.type] || '') + '</small></div></div>').join('') + '</div>' : '<p class="note">No outside signals recorded for this account.</p>') +
    '<p class="note" style="margin-top:12px">Executive moves, financial performance, analyst sentiment, customer signals and job postings join Salesforce, Gong and the other internal systems in one view. These signals are illustrative; the reading on each line is how the graph would use it.</p></div>';
}

// ================= the platform at a glance (CRO Hub) and the layers (Why Databook) =================
function gPlatformMap() {
  const L = [['Your GTM team', 'The human work no AI replaces', ['Politics', 'Relationships', 'Negotiation', 'Champion building'], null, 'team'], ['Interfaces', 'Headless: it meets your teams where they already work', ['CRM', 'Chat', 'Email', 'Planning', 'Enablement', '+ your surface'], ['guided', 'Slack and Salesforce previews'], ''], ['Agentic workflows', 'Your methodology and stages, designed and owned by you', ['Territory planning', 'Champion mapping', 'Prospecting', 'Account planning', 'Mutual action plan'], ['studio', 'Sales Ops Studio'], ''], ['Customer context graph', 'The foundation everything reasons from', ['Why us: first-party CRM, calls, documents, planning data', 'Why change · why now: third-party industry shifts, financials, stated priorities, contacts'], ['ingress', 'Ingress and resolution'], 'graph'], ['Data', 'Resolved once, not per tool', ['Your systems of record', 'Transcripts and documents', 'Licensed market data'], ['ingress', 'Ingress and resolution'], '']];
  return '<section class="gx-pmap"><div class="sec-h"><h3>The platform at a glance</h3><span class="muted">How the pieces fit, as Databook describes the decision system. Each layer opens its tab.</span></div><div class="gx-pm"><div class="gx-pm-badges"><span>Enterprise-grade security</span><span>SOC 2 · GDPR</span><span>Your data stays yours</span></div><div class="gx-pm-main"><div class="gx-pm-rows">' +
    L.map((l) => '<div class="gx-pmr ' + l[4] + '"><div class="gx-pml"><b>' + l[0] + '</b><small>' + l[1] + '</small></div><div class="gx-pmc">' + l[2].map((x) => '<span>' + x + '</span>').join('') + '</div>' + (l[3] ? '<button class="linkbtn" data-act="tab" data-t="' + l[3][0] + '">' + l[3][1] + '</button>' : '<span></span>') + '</div>').join('') +
    '</div><button class="gx-loop" data-act="tab" data-t="revenue"><b>Closed-loop analytics</b><small>Outcomes feed back into the graph</small><span class="linkbtn">Revenue and uplift</span></button></div></div></section>';
}
function gReasoning() {
  const rows = [['Reasoning', 'Data evaluation', ['Summarize the case for change', 'Pick the right narrative', 'Target the right executives'], 'r1'], ['Isolate impact', 'Decipher operational performance from macro and inorganic change', ['Strip out macro effects', 'Adjust for M&A', 'Read market sentiment'], 'r2'], ['Algos', 'Leverage domain expertise and patented algorithms', ['Investor expectations', 'Analyst and earnings signals', 'Board and management priorities'], 'r3'], ['First principles', 'Requires high-fidelity data accuracy globally', ['Value drivers', 'Segment financials', 'Industry and operating metrics'], 'r4']];
  return '<div class="card"><div class="hd"><div><span class="kicker">How the case for change is produced</span><h3>The reasoning engine: why change and why now, to lead to why us</h3></div><span class="gx-chip">As Databook describes it</span></div><div class="gx-reason">' + rows.map((r) => '<div class="gx-rrow ' + r[3] + '"><div class="gx-rl"><b>' + r[0] + '</b><small>' + r[1] + '</small></div>' + r[2].map((x) => '<span class="gx-rc">' + x + '</span>').join('') + '</div>').join('') + '</div><p class="note" style="margin-top:12px">Public and private companies, financial services and software, fiscal years that do not end in December: the metrics and value drivers differ by industry, so each layer has to be grounded in verified facts before a seller sees a recommendation.</p></div>';
}
function gWhyExtra() {
  const blocks = ['Seller personalization', 'Customer customization', 'Seller maturity analytics', 'Observability and monitoring', 'GTM agent orchestration', 'Sales assets (deck, doc)', 'Multi-layer quality eval', 'GTM deep reasoning', '1P and 3P use cases', 'Solution fit', 'Stakeholder analysis', 'Sales process and tools', 'Sales coaching and know-how', 'Functional knowledge', 'Industry knowledge', 'Model routing and parallelism', '3P licensed and proprietary data', 'Integrations'];
  return gContextNotPlatform() + gReasoning() + '<div class="card"><div class="hd"><div><span class="kicker">Why a horizontal tool falls short</span><h3>How Databook built the vertical platform</h3></div><span class="gx-chip">As Databook describes it</span></div><div class="gx-blocks">' + blocks.map((b) => '<span>' + b + '</span>').join('') + '</div><p class="note" style="margin-top:12px">Each block of structured guidance compounds on the one before. The trust problem is concrete: sellers ignore AI advice that is generic or factually wrong, which is what tends to happen when a team builds the reasoning itself on a general model. Databook cites a Gartner finding that two thirds of sales leaders report low trust in AI-generated insights.</p></div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">The question to settle early</span><h3>Who owns what, and how switching models works</h3></div></div><div class="grid g2"><div class="gx-own"><h4>As Databook states</h4><ul><li>The customer keeps the IP and the know-how it puts into the system.</li><li>It can switch to a faster, cheaper, open or closed-source model at any time.</li><li>The system is headless and composable: your interfaces, your workflows, your methodology.</li><li>Your data stays yours, behind enterprise-grade security, SOC 2 and GDPR.</li><li>Model routing and running several models in parallel are part of the platform.</li></ul></div>' +
    '<div class="gx-own ask"><h4>To confirm in the first meeting</h4><ul><li>Which artifacts count as Zoom\'s IP: workflow and agent definitions, scoring weights, playbooks, prompts, thresholds?</li><li>In what format can Zoom export them, and can they run without Databook?</li><li>Who picks the model for each workflow, and what does a change cost?</li><li>What stays with Databook: the graph reasoning, licensed third-party data, proprietary algorithms?</li><li>What happens to Zoom\'s graph and data when the contract ends?</li></ul></div></div><p class="note" style="margin-top:12px">The webinar states the outcome but not the mechanics, so the right-hand list is a set of questions, not answers. The Sales Ops Studio shows the shape of the idea: a plain-English directive compiles into a YAML file and a JSON schema that Zoom could read, review and keep.</p></div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">For the commercial conversation</span><h3>Evolving commercial models</h3></div></div>' + gCommercial() + '</div>';
}

function gCase(a) {
  const ev = (T.external_signals || []).filter((e) => e.account_id === a.id).sort((x, y) => (x.published_date < y.published_date ? 1 : -1))[0], z = M.acc[a.id];
  const now = [a.renewalDays <= 180 ? 'renewal in ' + a.renewalDays + ' days' : null, a.legacyExpiryDays != null && a.legacyExpiryDays <= 240 ? 'legacy contract ends in ' + a.legacyExpiryDays + ' days' : null, a.usage.deltaPct <= -5 ? 'usage down ' + Math.abs(a.usage.deltaPct) + '% on the month' : null].filter(Boolean).join('; ') || 'nothing time-bound this quarter';
  return '<div class="gx-detcase"><h4>Case for change</h4><dl class="gx-case"><dt>Why change</dt><dd>' + esc(ev ? ev.type + ': ' + ev.text : 'No outside signal recorded for this account') + '</dd><dt>Why now</dt><dd>' + esc(now) + '</dd><dt>Why us</dt><dd>' + esc((z && z.nextProd ? 'Next product ' + z.nextProd + '. ' : '') + 'Owns ' + (GPROD.filter((p) => a.owns[p[2]]).map((p) => gProdShort(p[0])).join(', ') || 'no Zoom products')) + '</dd></dl></div>';
}

// ================= methodology check: what should exist at this stage, and what the context shows =================
const gSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const GMETH = {
  Discovery: [['champion', 'Champion identified'], ['problem', 'Business problem stated in the customer\'s words'], ['execc', 'Executive contact named']],
  Validate: [['econ', 'Economic buyer identified'], ['baseline', 'Pain quantified against an agreed baseline'], ['next', 'Next step dated']],
  Proposal: [['exec', 'Executive sponsor engaged'], ['case', 'Quantified business case'], ['next', 'Mutual action plan with dated next steps'], ['comp', 'Competitive position known']],
  Negotiation: [['proc', 'Procurement path and paper process owner confirmed'], ['exec', 'Executive sponsor on the calendar'], ['sec', 'Security review under way'], ['price', 'Pricing inside the approval line']],
  Contracting: [['sign', 'Signature path confirmed'], ['deliv', 'Delivery project scoped'], ['exec', 'Executive sponsor aware of the close plan'], ['success', 'Success measures agreed']]
};
const GASK = { exec: 'Get a VP+ sponsor meeting on the calendar in the next 5 business days', execc: 'Name an executive contact on the customer side', next: 'Agree and record a dated next step with the buyer', case: 'Quantify the business case with the buyer\'s finance lead', proc: 'Confirm the procurement path and paper process owner in writing', sec: 'Get a date for the customer\'s security review', price: 'Bring pricing back inside the approval line', deliv: 'Scope the delivery project before the close' };
function gCheck(a, key) {
  const z = M.acc[a.id] || { contacts: [] }, fl = (k) => a.gong.flags.some((f) => f.k === k), blk = (a.monday.blocker || '').toLowerCase(), ops = M.open.filter((o) => o.account_id === a.id);
  if (key === 'champion') return z.contacts.some((c) => c.stance === 'Supportive') ? ['ok', 'A supportive contact is on record'] : ['miss', 'No supportive contact on record'];
  if (key === 'execc') return z.contacts.some((c) => +c.is_executive) ? ['ok', 'An executive contact is on record'] : ['miss', 'No executive contact on record'];
  if (key === 'exec') return fl('noexec') ? ['miss', 'No executive on the last three calls'] : ['ok', 'An executive was on a recent call'];
  if (key === 'next') return fl('nonext') ? ['miss', 'No next step was agreed on the last call'] : fl('gap') ? ['miss', 'No call in ' + a.gong.lastCallDays + ' days'] : ['ok', 'Next step agreed, last call ' + a.gong.lastCallDays + ' days ago'];
  if (key === 'case') return a.thread === 'business' ? ['miss', 'No quantified business case is linked to the opportunity'] : ['nv', 'No business case document in the feeds'];
  if (key === 'comp') return a.rival ? ['miss', a.rival + ' is named and no battlecard is on record'] : ['ok', 'No rival named on recent calls'];
  if (key === 'proc') return a.thread === 'stalled' ? ['miss', 'The renewal is sitting in procurement with no executive meeting'] : /security review/.test(blk) ? ['miss', 'Waiting on the customer\'s security review'] : ['nv', 'Procurement status is not visible'];
  if (key === 'sec') return /security review/.test(blk) ? ['miss', 'Waiting on the customer\'s security review'] : ['nv', 'No security review recorded'];
  if (key === 'price') return ops.some((o) => +o.discount_pct > M.cfg.discountLimit * 100) ? ['miss', 'A deal is above the ' + nf(M.cfg.discountLimit * 100, 0) + '% discount line'] : ['ok', 'Discounts are inside the approval line'];
  if (key === 'deliv') return a.monday.state === 'No project' ? ['miss', 'No delivery project on monday.com'] : ['ok', a.monday.state + (a.monday.phase ? ' · ' + a.monday.phase : '')];
  return ['nv', 'Not visible in the data this prototype holds'];
}
const gGaps = (a) => (GMETH[a.stage] || GMETH.Proposal).map((r) => [r[0], r[1], gCheck(a, r[0])]);
function gMethodology() {
  const a = gByName(GX.methAcct) || GA[0], rows = gGaps(a), miss = rows.filter((r) => r[2][0] === 'miss').length, nv = rows.filter((r) => r[2][0] === 'nv').length, I = { ok: '✓', miss: '✕', nv: '?' }, W = { ok: 'Seen', miss: 'Should exist, but missing', nv: 'Not visible' };
  return '<div class="card"><div class="hd"><div><span class="kicker">Insights come from a methodology applied to the context</span><h3>What should exist at this stage, and what the context shows</h3></div><select class="fld" style="width:auto;min-width:200px" data-act="gx-methacct" aria-label="Account">' + GA.slice().sort((x, y) => y.inFlight - x.inFlight).map((x) => '<option' + (x.name === a.name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
    '<p class="gx-lead"><b>' + esc(a.name) + '</b> is at <b>' + esc(a.stage) + '</b> with ' + gfm(a.inFlight, 1) + ' in open deals. ' + (miss ? miss + ' expected item' + (miss > 1 ? 's are' : ' is') + ' missing' : 'Nothing expected is missing') + (nv ? ' and ' + nv + ' cannot be seen' : '') + '.</p>' +
    '<div class="gx-meth">' + rows.map((r) => '<div class="gx-mr ' + r[2][0] + '"><span class="gx-mi" aria-label="' + W[r[2][0]] + '">' + I[r[2][0]] + '</span><span><b>' + esc(r[1]) + '</b><small>' + esc(r[2][1]) + '</small></span><span class="gx-mw">' + W[r[2][0]] + '</span></div>').join('') + '</div>' +
    '<div class="gx-act"><button class="btn red" data-act="gx-msg" data-a="' + a.id + '">Message the account team</button><button class="btn" data-act="graph" data-id="' + a.id + '">Open the account context graph</button></div>' +
    '<p class="note" style="margin-top:12px">A model cannot infer that something should have happened and did not. It needs a sales methodology to say what should exist at each stage, then it checks the context for it. This checklist is an example; Zoom\'s own stages and criteria go here. Evidence also has to be weighed: when new evidence contradicts what is known, the graph decides which fact to trust and keeps reasoning.</p></div>';
}

// ================= message the account team (a Slack post, drafted from the threads and the gaps) =================
function gMsgText(a) {
  const t = GX.threads.find((x) => x.account === a.name), o = M.open.filter((x) => x.account_id === a.id).sort((x, y) => y.amount - x.amount)[0], gaps = gGaps(a).filter((r) => r[2][0] === 'miss'), f = jFacts(a);
  const deal = o ? o.product_line + ' ' + String(o.type || 'deal').toLowerCase() + ' (' + a.name + '), ' + gfm(o.amount, 1) + ', close ' + o.close_date + ', ' + o.stage : a.name + ', ' + gfm(a.inFlight, 1) + ' in open deals, ' + a.stage;
  const asks = []; if (t && t.id === 'T-single') asks.push(GASK.exec); gaps.forEach((g) => { const k = g[0]; if (GASK[k] && !asks.includes(GASK[k])) asks.push(GASK[k]); }); if (a.rival) asks.push('Build a competitive battlecard to showcase our differentiation against ' + a.rival);
  if (!asks.length) asks.push(GASK.next);
  const ev = (t ? '• *' + GTYPE[t.type][0] + '* — ' + t.text : '• No open risk thread. The stage checklist found the gaps below.') + (f.sig[0] ? '\n• *Outside signal* — ' + jClean(f.sig[0].text) : '');
  const where = 'Where we are: Zoom has ' + (f.own.map((p) => p[0]).join(' and ') || 'no products') + ' here. The untapped product is ' + f.next + ' (about ' + gfm(f.ws, 1) + ').' + (f.lost.length ? ' We have lost here before: ' + f.lost.slice(0, 3).map((x) => x.product_line + ' to ' + x.competitor + ' (' + gfm(x.amount, 1) + ')').join('; ') + '.' : '');
  const meet = jMeetings(a).map((m) => '• ' + m.what + ' (' + m.who + ', ' + m.when.toLowerCase() + ')').join('\n');
  return 'Hi team — I\'ve been reading through the context graph on *' + deal + '*. This is one I care a lot about this quarter.\n\n' + where + '\n\nWhat the evidence is telling us (' + (t ? 1 : 0) + ' open risk thread' + (t ? '' : 's') + '):\n' + ev + '\n\nHow I\'d like us to de-risk the close:\n' + asks.slice(0, 4).map((x) => '• ' + x).join('\n') + '\n\nMeetings to set up:\n' + meet + '\n\n' + a.rep.split(' ')[0] + ', can you post an update in this channel before the next forecast review with owners and dates against each of those? Tell me where you need me, happy to join calls or bring in an executive.';
}
function gxOv() {
  const el = document.getElementById('gx-ov'); if (!el) return;
  if (!GX.msg) { el.innerHTML = ''; return; }
  const a = GA.find((x) => x.id === GX.msg.a), ch = '#acct-' + gSlug(a.name);
  el.innerHTML = '<div class="scrim" data-act="gx-msgclose"></div><div class="gx-modal" role="dialog" aria-modal="true" aria-label="Message the account team"><div class="gx-mh"><b><span class="gx-slackmark" aria-hidden="true"></span>Message the account team</b><button class="x" data-act="gx-msgclose" aria-label="Close">×</button></div>' +
    (GX.msg.sent ? '<p class="gx-mp">Posted to <b>' + esc(ch) + '</b> in Slack (simulated). In production the seller sees it in the channel and in Salesforce.</p><div class="gx-mpost">' + esc(GX.msg.text).replace(/\n/g, '<br>') + '</div><div class="gx-mf"><button class="btn red" data-act="gx-msgclose">Done</button></div>' :
      '<p class="gx-mp">Posting to <b>' + esc(ch) + '</b>, a synopsis of the contributing threads with your recommendations. Edit anything before sending.</p><textarea id="gx-msgtext" class="gx-prompt" style="min-height:300px" spellcheck="true" aria-label="Message">' + esc(GX.msg.text) + '</textarea><div class="gx-mf"><button class="btn" data-act="gx-msgclose">Cancel</button><button class="btn red" data-act="gx-msgsend">Send</button></div>') + '</div>';
  const t = document.getElementById('gx-msgtext'); if (t) t.focus();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act^="gx-msg"], [data-act="gx-methacct"]'); if (!t) return; const a = t.dataset.act;
  if (a === 'gx-msg') { const acc = GA.find((x) => x.id === t.dataset.a); if (!acc) return; GX.msg = { a: acc.id, text: gMsgText(acc), sent: false }; gxOv(); }
  else if (a === 'gx-msgclose') { GX.msg = null; gxOv(); }
  else if (a === 'gx-msgsend') { const x = document.getElementById('gx-msgtext'); if (x) GX.msg.text = x.value; GX.msg.sent = true; GX.sent[GX.msg.a] = GX.msg.text; audit('Posted to #acct-' + gSlug(GA.find((q) => q.id === GX.msg.a).name) + ' (simulated)'); gxOv(); if (S.tab === 'guided' || S.tab === 'journey') renderView(); }
});
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.act === 'gx-methacct') { GX.methAcct = e.target.value; renderView(); } });
document.addEventListener('input', (e) => { if (e.target.id === 'gx-msgtext' && GX.msg) GX.msg.text = e.target.value; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && GX.msg) { GX.msg = null; gxOv(); } });

// ================= studio: agent composer canvas and live weighting =================
function gCanvas() {
  const c = GX.cfg; if (!c) return '<div class="gx-cv-empty">Compile a directive to see the workflow.</div>';
  const K = { tool: 'Tool', join: 'Join', json: 'JSON Agent', loop: 'For Loop' }, node = (k, n, s) => '<div class="gx-node ' + k + '"><span class="gx-nk">' + K[k] + '</span><b>' + esc(n) + '</b>' + (s ? '<small>' + esc(s) + '</small>' : '') + '</div>';
  const col = (t, items) => '<div class="gx-cvc"><h5>' + t + '</h5>' + items.join('') + '</div>', arrow = '<div class="gx-cva" aria-hidden="true">→</div>';
  return '<div class="gx-cv">' + col('Sources', c.sources.map((s) => node('tool', s.id, s.system + ' · refresh ' + s.refresh))) + arrow + col('Each account', [node('loop', 'for_each_account', c.audience.accounts_in_scope + ' accounts in scope')]) + arrow + col('Signals', Object.keys(c.signals).map((k) => node('tool', k, c.signals[k].when))) + arrow + col('Rules', [node('join', 'rules_join', c.rules.length + ' rule' + (c.rules.length > 1 ? 's' : '') + ', all conditions must hold')].concat(c.rules.map((r) => node('tool', r.id, 'weight ' + r.effect.priority_weight)))) + arrow + col('Score', [node('json', 'score_accounts', 'base + weights, cap 1.0'), node('tool', 'tier', 'P1 85+, P2 65+, P3 below')]) + '</div>' +
    '<div class="gx-pal"><span>Node types in the composer</span>' + ['JSON Agent', 'Chat Agent', 'Tool', 'Join', 'For Loop', 'Do-While Loop'].map((x) => '<i>' + x + '</i>').join('') + '</div>';
}
function gRankNow() {
  const base = gEval(GX.cfg), now = gEval(GX.cfg, GX.wts), tier0 = Object.fromEntries(base.map((r) => [r.a.id, gTier(r.final)]));
  return { now, retiered: now.filter((r) => gTier(r.final) !== tier0[r.a.id]).length, tier0 };
}
function gRankHTML() {
  const R = gRankNow(), TC = { P1: 'g', P2: 'o', P3: '' };
  return (typeof jScoreLine === 'function' ? jScoreLine() : '') + '<div class="gx-rkh"><b>Account scoring dashboard</b><span>' + R.retiered + ' re-tiered against the default weights</span></div>' + R.now.slice(0, 8).map((r, i) => '<div class="gx-rk"><span class="n">' + (i + 1) + '</span><span><b>' + esc(r.a.name) + '</b><br><span style="color:var(--ink-3);font-size:12.5px">' + (r.fired.length ? esc(r.fired.map((x) => x.id.replace(/_/g, ' ')).join(' + ')) : 'no rule fired') + '</span></span><span class="sc num">' + r.final + ' <i class="gx-chip ' + TC[gTier(r.final)] + '">' + gTier(r.final) + '</i></span></div>').join('');
}
function gWeighting() {
  const c = GX.cfg, def = (r) => parseFloat(r.effect.priority_weight), cur = (r) => (GX.wts[r.id] != null ? GX.wts[r.id] : def(r));
  return '<div class="gx-wt"><div class="gx-rkh"><b>Priority boosts</b><button class="linkbtn" data-act="gx-wtreset">Reset</button></div><p class="gx-wnote">Each account starts with a size score (30 to 70, from the value of open deals). When a rule applies, its boost is added: <b>score = size score × (1 + boosts)</b>. A boost never lowers a score. Move a slider and the accounts re-rank at once.</p>' + c.rules.map((r) => '<label class="gx-wrow"><span><b>' + esc(r.plain || r.id.replace(/_/g, ' ')) + '</b><small>Adds this much to the score when it applies</small></span><input type="range" min="0" max="100" step="5" value="' + Math.round(cur(r) * 100) + '" data-act="gx-wt" data-r="' + r.id + '" aria-label="' + esc(r.plain || r.id) + '"><b class="num" id="gx-wv-' + r.id + '">+' + Math.round(cur(r) * 100) + '%</b></label>').join('') + '</div><div id="gx-rank" class="gx-rank">' + gRankHTML() + '</div>';
}
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.act === 'gx-wt' && GX.cfg) { GX.wts[t.dataset.r] = +t.value / 100; const v = document.getElementById('gx-wv-' + t.dataset.r), r = document.getElementById('gx-rank'); if (v) v.textContent = '+' + t.value + '%'; if (r) r.innerHTML = gRankHTML(); } });
document.addEventListener('click', (e) => { const t = e.target.closest('[data-act="gx-wtreset"]'); if (!t) return; GX.wts = {}; gStudioParts(); });

// ================= guided selling: smart templates (assets generated from the account's context) =================
const GASSETS = [['First call decks', 'Prospect'], ['Executive points of view', 'Discover'], ['Account plans', 'Qualify'], ['Value-based proposals', 'Propose'], ['Customer case studies', 'Validate'], ['Executive briefings', 'Close']];
const GSTAGE_ASSET = { Discovery: 'Discover', Validate: 'Qualify', Proposal: 'Propose', Negotiation: 'Validate', Contracting: 'Close' };
function gAssets() {
  const a = gByName(GX.methAcct) || GA[0], cur = GSTAGE_ASSET[a.stage];
  return '<div class="card"><div class="hd"><div><span class="kicker">Smart templates · across every stage of the sales cycle</span><h3>Product-marketing-approved assets, generated from the account\'s context</h3></div><select class="fld" style="width:auto;min-width:200px" data-act="gx-methacct" aria-label="Account">' + GA.slice().sort((x, y) => y.inFlight - x.inFlight).map((x) => '<option' + (x.name === a.name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div>' +
    '<p class="gx-lead"><b>' + esc(a.name) + '</b> is at <b>' + esc(a.stage) + '</b>, so the next asset is <b>' + esc(GASSETS.find((x) => x[1] === cur)[0].toLowerCase()) + '</b>. The CRO decides, and the seller gets the asset. Databook found that sellers tend to ignore autonomous pushes unless they come from a manager or colleague.</p>' +
    '<div class="gx-assets"><span class="gx-ends">Early cycle</span>' + GASSETS.map((x) => '<div class="gx-as' + (x[1] === cur ? ' now' : '') + '"><b>' + x[0] + '</b><small>' + x[1] + '</small>' + (x[0] === 'Executive briefings' ? '<button class="btn sm red" data-act="asset" data-kind="brief" data-id="' + a.id + '">Generate</button>' : x[0] === 'Account plans' ? '<button class="btn sm" data-act="asset" data-kind="prep" data-id="' + a.id + '">Meeting prep</button>' : '<span class="gx-soon">Template, not built here</span>') + '</div>').join('') + '<span class="gx-ends">Late cycle</span></div>' +
    '<div class="gx-fmts"><span>Lands as</span><i>Microsoft Word</i><i>PowerPoint</i><i>Google Slides</i><i>Google Docs</i></div><p class="note" style="margin-top:12px">Two generators are real in this prototype, drawn from the account view: the executive briefing and meeting prep. The other templates show the range Databook describes.</p></div>';
}

// ================= ingress: bringing data in =================
function gImport() {
  const R = [['Accounts', 'New accounts and their parents', 'sf_accounts'], ['Master consumption', 'Usage by account and product', 'grafana_usage'], ['Monthly by category', 'Paste a month of figures', 'grafana_usage'], ['Campaigns', 'Spend and leads by channel', 'marketing_funnel'], ['Quarterly focus calendar', 'Targets by quarter, region and product', 'targets']];
  return '<div class="card"><div class="hd"><div><span class="kicker">Admin · data import</span><h3>Bring accounts, consumption and campaigns in</h3></div><span class="hd-r"><button class="btn red sm" data-act="loadwb">Load a workbook</button></span></div><div class="tbl-wrap"><table><thead><tr><th>Import</th><th>What it carries</th><th>Sheet in this prototype</th><th></th></tr></thead><tbody>' + R.map((r) => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td class="mono">' + r[2] + '</td><td class="r"><button class="btn sm" data-act="upload" data-ds="' + r[2] + '">Upload CSV or sheet</button></td></tr>').join('') + '</tbody></table></div><p class="note" style="margin-top:10px">Databook\'s admin has the same five imports. Here each one maps to a sheet in the workbook, so a change redraws every tab. Imports are parsed in the browser and never sent anywhere.</p></div>';
}

// ================= revenue: what the CRO can do with the measured uplift =================

// ================= why databook: the context, not the platform =================
function gContextNotPlatform() {
  return '<div class="card"><div class="hd"><div><span class="kicker">The point beneath the interface</span><h3>Anyone can build the front end in a weekend. The question is whether the context underneath is true.</h3></div></div><div class="gx-ctxn"><div><b>Composable</b><span>The person who owns the number can build the interface, or co-design it, in minutes. The front end is a choice, not something inherited.</span></div><div><b>Smart enough to trust</b><span>The whole team can rely on its accuracy and its judgment. If the context is wrong, a polished interface only helps you be confidently wrong faster.</span></div><div><b>Enterprise-grade</b><span>It has to survive a security review, with permissions and scale that a weekend build never gets right.</span></div></div><p class="note" style="margin-top:12px">Headless should not mean brainless: an API with no reasoning behind it leaves the brain to come from somewhere else. That is the argument for buying the context and building the interface yourself.</p></div>';
}
