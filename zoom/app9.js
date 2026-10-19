// ---------- the account journey: one practice account, walked through the CRO loop from the pitch deck ----------
// Use case, See, Find, Decide, Guide, Tune, Prove. The account is picked from the 40-account book; every figure is read from the same data as the rest of the platform.
const J = { acct: 'Acme Corp', step: 0 };
const JSTEPS = [['Use case', 'The account'], ['See', 'Where revenue is heading'], ['Find', 'Where it can change'], ['Decide', 'Approve a play'], ['Guide', 'Equip the seller'], ['Tune', 'Studio and Workspace'], ['Prove', 'Did it work']];
const jAcct = () => gByName(J.acct) || GA[0];
const jDue = (n) => dateFmt(ZM.iso(ZM.ms(M.asOf) + n * 864e5));
const jShort = (k) => k;

function jFacts(a) {
  const z = M.acc[a.id] || { contacts: [], whitespace: 0 }, own = GPROD.filter((p) => a.owns[p[2]]);
  const lost = M.closed.filter((o) => !o.won && o.account_id === a.id && o.competitor && o.competitor !== 'None').sort((x, y) => (x.close_date < y.close_date ? 1 : -1));
  const byRival = {}; lost.forEach((o) => (byRival[o.competitor] = (byRival[o.competitor] || 0) + o.amount));
  const top = Object.entries(byRival).sort((x, y) => y[1] - x[1])[0];
  const next = z.nextProd || (GPROD.find((p) => !a.owns[p[2]]) || [])[0] || a.product;
  const sig = (T.external_signals || []).filter((e) => e.account_id === a.id).sort((x, y) => (x.published_date < y.published_date ? 1 : -1));
  const open = M.open.filter((o) => o.account_id === a.id).sort((x, y) => y.amount - x.amount);
  const decided = M.closed.filter((o) => o.account_id === a.id);
  const rank = GA.slice().sort((x, y) => y.inFlight - x.inFlight).findIndex((x) => x.id === a.id) + 1;
  return { z, own, lost, lostAmt: gsum(lost, (o) => o.amount), topRival: top ? top[0] : a.rival || null, next, ws: z.whitespace || 0, sig, open, contacts: z.contacts || [], winRate: decided.length ? decided.filter((o) => o.won).length / decided.length : 0, nDecided: decided.length, rank, high: rank <= 10 || !!a.thread };
}
const jClean = (t) => String(t || '').replace(/ \(illustrative\)/g, '');
const jNoExec = (a) => a.gong.flags.some((f) => f.k === 'noexec');

// meetings to set up: who, with whom, and by when, from the gaps the context shows
const JLEAD = { 'Contact Center': [/customer|experience|support|service/i, 'the head of customer experience'], AI: [/information|digital|technology|data/i, 'the CIO or head of digital'], Phone: [/infrastructure|telecom|operations|IT\b/i, 'the head of IT infrastructure'], Workplace: [/workplace|people|HR|IT\b/i, 'the head of digital workplace'] };
function jMeetings(a) {
  const f = jFacts(a), t = GX.threads.find((x) => x.account === a.name), m = [], rival = f.topRival || a.rival;
  const ex = f.contacts.find((c) => +c.is_executive), lead = JLEAD[f.next] || JLEAD.Workplace, who = f.contacts.find((c) => lead[0].test(c.title));
  if (jNoExec(a) || (t && t.type === 'single')) m.push({ what: 'Executive briefing' + (ex ? ' with ' + ex.name + ', ' + ex.title : ''), who: 'Seller, with a Zoom executive', when: 'Within 5 business days', why: 'No executive has been on the last 3 calls' });
  m.push({ what: jShort(f.next) + ' discovery' + (who ? ' with ' + who.name + ', ' + who.title : ' with ' + lead[1]), who: 'Seller and a solutions engineer', when: 'Within 2 weeks', why: 'Test the need for the untapped product, in the buyer\'s words' });
  if (rival) m.push({ what: 'Side-by-side against ' + rival, who: 'Seller and product marketing', when: 'Before the proposal', why: f.lost.length ? 'Zoom lost here before to ' + (f.topRival || rival) : rival + ' is named on this account' });
  if (a.thread === 'business' || gGaps(a).some((r) => r[0] === 'case' && r[2][0] !== 'ok')) m.push({ what: 'Business case workshop with finance', who: 'Seller and a value engineer', when: 'Before the proposal', why: 'No quantified business case is linked to the opportunity' });
  return m.slice(0, 4);
}

// ----- parts -----
function jBar(a, f) {
  const opts = GA.slice().sort((x, y) => (x.region === y.region ? y.inFlight - x.inFlight : x.region.localeCompare(y.region))).map((x) => '<option' + (x.name === a.name ? ' selected' : '') + '>' + esc(x.name) + ' · ' + x.region + '</option>').join('');
  return '<div class="j-bar"><label class="j-pick"><span>Account</span><select class="sel" data-act="j-acct" aria-label="Pick an account">' + opts + '</select></label><span class="gx-chip ' + (a.name === 'Acme Corp' ? 'g' : '') + '">' + (a.name === 'Acme Corp' ? 'Practice account' : 'Any of the 40 accounts') + '</span>' + (a.name !== 'Acme Corp' ? '<button class="linkbtn" data-act="j-acct-reset">Back to Acme Corp</button>' : '') + '<span class="j-fic">Fictional account, mock data</span></div>';
}
function jStepper() {
  return '<nav class="j-steps" aria-label="Journey steps">' + JSTEPS.map((s, i) => '<button class="j-st' + (J.step === i ? ' on' : '') + (i < J.step ? ' done' : '') + '" data-act="j-step" data-s="' + i + '" aria-current="' + (J.step === i) + '"><span class="j-n">' + (i < J.step ? '✓' : i + 1) + '</span><span class="j-t"><b>' + s[0] + '</b><small>' + s[1] + '</small></span></button>').join('') + '</nav>';
}
function jNav() {
  const p = J.step > 0 ? '<button class="btn" data-act="j-step" data-s="' + (J.step - 1) + '">Back: ' + JSTEPS[J.step - 1][0] + '</button>' : '<span></span>';
  const n = J.step < JSTEPS.length - 1 ? '<button class="btn red" data-act="j-step" data-s="' + (J.step + 1) + '">Next: ' + JSTEPS[J.step + 1][0] + '</button>' : '<button class="btn red" data-act="tab" data-t="command">Back to the CRO Hub</button>';
  return '<div class="j-nav">' + p + n + '</div>';
}
const jHead = (kicker, h) => '<div class="j-head"><span class="kicker">' + kicker + '</span><h2>' + h + '</h2></div>';

// 1. the use case
function jUse(a, f) {
  const list = (arr) => arr.length ? arr.join(' and ') : 'nothing yet';
  const lostTxt = f.lost.length ? f.lost.slice(0, 3).map((o) => jShort(o.product_line) + ' to ' + o.competitor + ' (' + gfm(o.amount, 1) + ', ' + o.fq + ')').join('; ') : 'No recorded losses to a named rival';
  const outcome = (k, big, sub, meas) => '<div class="j-out"><span class="gx-chip">' + k + '</span><b class="num">' + big + '</b><span>' + sub + '</span><small>Measured by ' + meas + '</small></div>';
  return jHead('The use case', 'Zoom is an AI-first work platform. Can the seller carry that into ' + esc(a.name) + '?') +
    '<div class="card j-hero"><div class="hd"><div><span class="kicker">' + esc(a.region) + ' · ' + esc(a.industry) + ' · seller ' + esc(a.rep) + '</span><h3>' + esc(a.name) + '</h3></div>' + (f.high ? '<span class="gx-chip o">High priority · ' + gfm(a.inFlight, 1) + ' in flight</span>' : '<span class="gx-chip">' + gfm(a.inFlight, 1) + ' in flight</span>') + '</div>' +
    '<ul class="j-story"><li><b>With Zoom today</b><span>' + list(f.own.map((p) => jShort(p[0]))) + '</span></li><li><b>Where Zoom lost</b><span>' + esc(lostTxt) + '</span></li><li><b>Untapped now</b><span>' + esc(jShort(f.next)) + ', about ' + gfm(f.ws, 1) + '</span></li><li><b>What has changed</b><span>' + esc(f.sig[0] ? jClean(f.sig[0].text) : 'No outside signal recorded') + '</span></li></ul></div>' +
    '<div class="j-three">' + outcome('Revenue growth', gfm(f.ws, 1), 'untapped in an account Zoom already owns', 'expansion and win rate') +
    outcome('Product perception', f.own.length + ' of ' + GPROD.length, 'Zoom products owned. ' + (jNoExec(a) ? 'No executive on the last 3 calls.' : 'An executive is on recent calls.'), 'product attach and executive engagement') +
    outcome('Market share', gfm(f.lostAmt, 1), 'lost to named rivals here' + (a.rival ? '. ' + esc(a.rival) + ' is named on an open deal.' : '.'), 'win rate against named rivals') + '</div>';
}

// 2. see: the region, then the accounts to pick from
function jSee(a, f) {
  const row = M.matrix.region.find((r) => r.label === a.region), o = hOverall(row), accs = GA.filter((x) => x.region === a.region).sort((x, y) => y.inFlight - x.inFlight).slice(0, 8);
  const rowHTML = (x) => { const q = jFacts(x); return '<button class="j-row' + (x.id === a.id ? ' on' : '') + '" data-act="j-pick-row" data-a="' + x.id + '"><span class="jr-n"><b>' + esc(x.name) + '</b><small>Seller ' + esc(x.rep) + '</small></span><span class="num">' + gfm(x.inFlight, 1) + '</span><span class="jr-f">' + (x.thread ? '<i class="gx-chip r">Risk thread</i>' : '') + (q.lostAmt ? '<i class="gx-chip o">' + gfm(q.lostAmt, 1) + ' lost to a rival</i>' : '') + (x.rival ? '<i class="gx-chip">' + esc(x.rival) + '</i>' : '') + '</span></button>'; };
  return jHead('See · where is revenue heading?', esc(a.region) + ' is ' + ({ ok: 'on track', warn: 'on watch', bad: 'off track', insufficient: 'thin on data' }[o.st] || 'on watch') + '. ' + esc(a.name) + ' is one of its biggest accounts.') +
    '<div class="j-two"><div class="j-reg">' + regionCard(row) + '</div><div class="card"><div class="hd"><div><span class="kicker">Pick an account to drill into</span><h3>Biggest accounts in ' + esc(a.region) + '</h3></div></div><div class="j-rows">' + accs.map(rowHTML).join('') + '</div></div></div>';
}

// 3. find: inside and outside the company, and what was tried before
function jFind(a, f) {
  const t = GX.threads.find((x) => x.account === a.name), z = f.z, gcs = a.gong.flags.length ? esc(a.gong.flags.map((x) => x.label).join('; ')) : 'No active flags';
  const inside = [['Salesforce', 'Opportunity <span class="mono">' + esc(a.sfdcOppId) + '</span> at ' + esc(a.stage) + ', ' + gfm(a.inFlight, 1) + ' in flight, ' + gfm(a.commit, 1) + ' committed'], ['Gong', gcs + '. Last call ' + a.gong.lastCallDays + ' days ago.'], ['monday.com', a.monday.state === 'No project' ? 'No delivery project' : esc(a.monday.state + (a.monday.phase ? ' · ' + a.monday.phase : '') + (a.monday.blocker ? ' · ' + a.monday.blocker : ''))], ['Grafana', 'Active seats ' + (a.usage.deltaPct > 0 ? '+' : '') + a.usage.deltaPct + '% on the month, ' + a.usage.activePct + '% of licensed seats active']];
  const sg = { Salesforce: 'b', Gong: 'o', 'monday.com': 'g', Grafana: 'r' };
  const ppl = f.contacts.slice(0, 4).map((c) => '<li><b>' + esc(c.name) + '</b>, ' + esc(c.title) + ' <span class="gx-chip ' + (c.stance === 'Supportive' ? 'g' : c.stance === 'Skeptical' ? 'r' : '') + '">' + esc(c.stance) + '</span></li>').join('');
  return jHead('Find · where can it change?', 'Internal context and outside context, side by side, show why this account matters now.') +
    '<div class="j-two"><div class="card"><div class="hd"><div><span class="kicker">From Zoom\'s own systems</span><h3>Inside</h3></div></div>' + inside.map((r) => '<div class="j-line"><span class="gx-chip ' + sg[r[0]] + '">' + r[0] + '</span><span>' + r[1] + '</span></div>').join('') + (ppl ? '<div class="j-ppl"><b>Buying committee</b><ul>' + ppl + '</ul></div>' : '') + '</div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">From outside Zoom (illustrative)</span><h3>Their main objectives</h3></div></div>' + (f.sig.length ? f.sig.slice(0, 3).map((e) => '<div class="j-sig"><div><span class="gx-chip ' + (e.type === 'Executive move' ? 'r' : e.type === 'Earnings' ? 'o' : 'b') + '">' + esc(e.type) + '</span> <span class="j-dt">' + dateFmt(e.published_date) + '</span></div><b>' + esc(jClean(e.text)) + '</b><small>' + esc(GSIGNAL[e.type] || '') + '</small></div>').join('') : '<p class="note">No outside signals recorded.</p>') + '</div></div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">What was tried before, and who won</span><h3>History in this account</h3></div><span class="hd-r"><button class="linkbtn" data-act="gosub" data-t="compete" data-s="map">Rival exposure by country</button></span></div>' +
    (f.lost.length ? '<div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Lost to</th><th class="r">Yearly revenue</th><th>When</th></tr></thead><tbody>' + f.lost.slice(0, 5).map((o) => '<tr><td><b>' + esc(jShort(o.product_line)) + '</b></td><td>' + esc(o.competitor) + '</td><td class="r num">' + gfm(o.amount, 1) + '</td><td>' + o.fq + '</td></tr>').join('') + '</tbody></table></div><p class="note" style="margin-top:10px">' + f.nDecided + ' deals decided here; Zoom won ' + gpc(f.winRate) + ' of them. A recorded loss reason is not proof of cause.</p>' : '<p class="note">No deal here was lost to a named rival.</p>') + '</div>' +
    (t ? '<div class="card" id="j-thread"><div class="hd"><div><span class="kicker">Customer context graph · the evidence joined</span><h3>Risk thread: ' + GTYPE[t.type][0] + '</h3></div></div>' + gThreadBody(t) + '</div>' : '') + gCase(a);
}

// 4. decide: the play, with owner, date, impact; approve or defer
function jPlay(a, f) {
  const sp = GPLAYS.find((p) => p.account === a.name);
  if (sp) return sp;
  const rival = f.topRival || a.rival, gaps = gGaps(a).filter((r) => r[2][0] === 'miss');
  return { id: 'P-' + a.id, thread: null, account: a.name, title: 'Land ' + jShort(f.next) + ' at ' + a.name + (rival ? ' and counter ' + rival : ''),
    why: gaps.length ? gaps[0][1] + ' is missing, and ' + jShort(f.next) + ' is the untapped product.' : jShort(f.next) + ' is the untapped product and the deal has the basics in place.', change: f.sig[0] ? jClean(f.sig[0].text) : 'No outside signal recorded.', now: a.renewalDays <= 180 ? 'The renewal is ' + a.renewalDays + ' days out.' : 'The open deal is at ' + a.stage + '.', us: 'Zoom already owns ' + (f.own.map((p) => jShort(p[0])).join(' and ') || 'nothing here') + '.', steps: [] };
}
function jDecide(a, f) {
  const p = jPlay(a, f), st = gps(p.id), conv = M.lv.expansion_conversion_rate, est = f.ws * conv, conf = f.z.nextProdIntent >= 1 ? 'Medium' : 'Low', rival = f.topRival || a.rival;
  const status = st.auth ? '<span class="appr ok">Approved</span>' : st.deferred ? '<span class="appr bad">Deferred</span>' : '';
  return jHead('Decide · what do we approve?', 'One play for ' + esc(a.name) + '. The CRO approves it before any seller sees it.') +
    '<div class="card j-play"><div class="hd"><div><span class="kicker">The play</span><h3>' + esc(p.title) + '</h3></div>' + status + '</div>' +
    '<dl class="gx-case"><dt>Why change</dt><dd>' + esc(p.change) + '</dd><dt>Why now</dt><dd>' + esc(p.now) + '</dd><dt>Why us</dt><dd>' + esc(p.us) + '</dd></dl>' +
    '<div class="j-facts"><div><small>Product to land</small><b>' + esc(jShort(f.next)) + '</b>' + (rival ? '<span>Lost here before to ' + esc(rival) + '</span>' : '') + '</div><div><small>Owner</small><b>' + esc(a.rep) + '</b><span>First step due ' + jDue(14) + '</span></div><div><small>Expected impact</small><b>+' + gfm(est, 1) + ' bookings</b><span>Modeled: ' + gfm(f.ws, 1) + ' untapped × ' + gpc(conv) + ' conversion (assumed)</span></div><div><small>Confidence</small><b>' + conf + '</b><span>' + (conf === 'Low' ? 'No buyer intent on record yet' : 'The customer has raised it on calls') + '. The conversion rate is an assumption.</span></div></div>' +
    '<div class="j-actions">' + (st.auth ? '<span class="j-ok">The seller can now see this play in Slack and Salesforce.</span><button class="btn" data-act="j-play" data-v="undo">Undo</button>' : '<button class="btn red" data-act="j-play" data-v="approve">Approve</button><button class="btn" data-act="j-play" data-v="defer">Defer</button>') + '</div></div>';
}

// 5. guide: Slack, meetings, coach
function jGuide(a, f) {
  const p = jPlay(a, f), st = gps(p.id), sent = GX.sent[a.id], ch = '#acct-' + gSlug(a.name), meet = jMeetings(a), msg = gMsgText(a), preview = msg.split('\n').filter(Boolean).slice(0, 4).join('\n');
  const coachDone = (desk.coach.sessions || []).filter((x) => x.account === a.id);
  return jHead('Guide · how is the seller equipped?', esc(a.rep.split(' ')[0]) + ' gets a message in Slack, a meeting plan and a coach.') +
    (st.auth ? '' : '<div class="j-warn">You have not approved the play yet. In production the seller sees nothing until you do. <button class="linkbtn" data-act="j-step" data-s="3">Go to Decide</button></div>') +
    '<div class="j-three j-guide"><div class="card"><div class="hd"><div><span class="kicker">1 · Tell the account team</span><h3>Message ' + esc(ch) + '</h3></div></div><div class="j-slack"><div class="gx-hd"><span class="gx-av">Z</span>Draft for ' + esc(ch) + '</div><p>' + esc(sent ? sent.split('\n')[0] : preview).replace(/\n/g, '<br>') + '</p></div>' + (sent ? '<p class="j-ok">Posted to ' + esc(ch) + ' (simulated).</p><button class="btn sm" data-act="gx-msg" data-a="' + a.id + '">Edit and send again</button>' : '<button class="btn red" data-act="gx-msg" data-a="' + a.id + '">Write and send</button>') + '</div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">2 · Meetings to set up</span><h3>' + meet.length + ' meetings</h3></div></div><ol class="j-meet">' + meet.map((m) => '<li><b>' + esc(m.what) + '</b><small>' + esc(m.who) + ' · ' + esc(m.when) + '</small><span>' + esc(m.why) + '</span></li>').join('') + '</ol></div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">3 · Walk the seller through it</span><h3>Seller coach</h3></div></div><p class="j-p">A six-step coach for ' + esc(a.rep.split(' ')[0]) + ': confirm the facts, name a sponsor, then build the brief and the customer deck for ' + esc(jShort(f.next)) + '.</p>' + (coachDone.length ? '<p class="j-ok">' + coachDone.length + ' coaching session' + (coachDone.length > 1 ? 's' : '') + ' started for this account.</p>' : '') + '<button class="btn red" data-act="opencoach" data-id="' + a.id + '">Open the coach for ' + esc(a.name) + '</button></div></div>';
}

// 6. tune: the Sales Ops Studio and the Workspace
const JRULE = ' Also raise priority for accounts that lost a deal to a rival in the last year and still have an untapped Zoom product.';
function jScore(a, prompt) { const cfg = gBuildCfg(gParse(prompt)), R = gEval(cfg), i = R.findIndex((r) => r.a.id === a.id); return { i, r: R[i] }; }
function jScoreLine() {
  const a = jAcct(), R = gRankNow(), i = R.now.findIndex((r) => r.a.id === a.id), r = R.now[i];
  return '<div class="j-me"><b>' + esc(a.name) + '</b><span>rank ' + (i + 1) + ' of ' + GA.length + '</span><span class="num">' + r.final + ' <i class="gx-chip ' + ({ P1: 'g', P2: 'o', P3: '' }[gTier(r.final)]) + '">' + gTier(r.final) + '</i></span></div>';
}
function jTune(a, f) {
  const hasRule = GX.prompt.indexOf(JRULE) >= 0;
  if (!GX.compiled) { gCompile(); GX.runLog = ['Compiled with 0 errors']; }
  const b = jScore(a, GSAMPLE), n = jScore(a, GSAMPLE + JRULE), cur = hasRule ? n : b, deals = f.open.slice(0, 3);
  const tier = (x) => gTier(x.r.final);
  return jHead('Tune · how does Sales Ops change it?', 'The Studio decides which accounts rank first. The Workspace shows what each change does to the numbers.') +
    '<div class="j-two"><div class="card"><div class="hd"><div><span class="kicker">Sales Ops Studio</span><h3>Where ' + esc(a.name) + ' ranks</h3></div><span class="hd-r"><button class="linkbtn" data-act="j-studio">Open in the Studio</button></span></div>' +
    '<p class="j-p"><b>How the score works.</b> Each account starts with a size score from 30 to 70, based on the value in flight. Every rule that applies adds a boost on top. <b>Score = size score × (1 + boosts).</b> 85 or more is P1, 65 or more is P2, below that P3. Boosts only ever raise priority.</p><p class="j-p">Today the rules look at usage decline and legacy contracts. <b>' + esc(a.name) + '</b> has a size score of ' + b.r.base + ' and no rule applies, so it scores <b class="num">' + b.r.final + '</b> (' + tier(b) + '), rank ' + (b.i + 1) + ' of ' + GA.length + '. Sales Ops can add a rule in plain English:</p>' +
    '<blockquote class="j-q">' + esc(JRULE.trim()) + '</blockquote>' +
    (hasRule ? '<p class="j-ok">Rule added. ' + esc(a.name) + ' qualifies, so its ' + n.r.base + ' becomes ' + n.r.base + ' × 1.5 = ' + n.r.final + ' (' + tier(n) + '), rank ' + (n.i + 1) + '.</p><button class="btn" data-act="j-rule" data-v="off">Remove the rule</button>' : '<button class="btn red" data-act="j-rule" data-v="on">Add the rule and recompile</button>') +
    '<div style="margin-top:14px">' + gWeighting() + '</div>' + '</div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">Workspace · forecast against the sales team\'s call</span><h3>Open deals at ' + esc(a.name) + '</h3></div><span class="hd-r"><button class="linkbtn" data-act="gosub" data-t="lab" data-s="levers">Open the Workspace</button></span></div>' +
    (deals.length ? '<div class="tbl-wrap"><table><thead><tr><th>Deal</th><th class="r">Amount</th><th class="r">Sales team call</th><th class="r">Risk-adjusted</th></tr></thead><tbody>' + deals.map((o) => '<tr><td><b>' + esc(jShort(o.product_line)) + '</b><div class="sub">' + o.stage + ' · ' + (+o.exec_sponsor ? 'senior leader involved' : 'no senior leader') + ' · ' + o.contacts_engaged + ' contacts' + (o.competitor && o.competitor !== 'None' ? ' · ' + esc(o.competitor) : '') + '</div></td><td class="r num">' + fm(o.amount, 2) + '</td><td class="r num">' + fm(o.repCall, 2) + '</td><td class="r num">' + fm(o.aiCall, 2) + '</td></tr>').join('') + '</tbody></table></div><p class="note" style="margin-top:10px">The risk-adjusted call weighs stage, contacts, sponsor, quiet days and rivals. The thresholds are editable in the Workspace, and the CRO approves any change.</p>' : '<p class="note">No open deal at this account.</p>') + '</div></div>';
}

// 7. prove: this account's loop, then the Hub's counts
function jProve(a, f) {
  const p = jPlay(a, f), st = gps(p.id), ss = (desk.coach.sessions || []).filter((x) => x.account === a.id), sent = !!GX.sent[a.id], c = loopCounts();
  const rows = [['Play approved', st.auth, 'You approved it'], ['Account team messaged', sent, 'The Slack post went to ' + '#acct-' + gSlug(a.name)], ['Coach started', ss.length > 0, 'The seller opened the guided coach'], ['Coach completed', ss.some((x) => x.done), 'The seller finished the six steps'], ['Advice accepted', ss.some((x) => x.accepted) || st.steps.some(Boolean), 'The seller took the recommended action'], ['Buyer next step', st.buyer || ss.some((x) => x.buyerNext), 'The buyer agreed a dated next step']];
  return jHead('Prove · did execution improve?', 'Adoption shows first. Revenue is claimed only when it lags in.') +
    '<div class="j-two"><div class="card"><div class="hd"><div><span class="kicker">This account</span><h3>' + esc(a.name) + '</h3></div></div><ol class="j-loop">' + rows.map((r) => '<li class="' + (r[1] ? 'done' : '') + '"><span class="j-ck">' + (r[1] ? '✓' : '') + '</span><span><b>' + r[0] + '</b><small>' + r[2] + '</small></span></li>').join('') + '<li class="pend"><span class="j-ck"></span><span><b>Revenue</b><small>Lags about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days, so none is claimed yet</small></span></li></ol></div>' +
    '<div class="card"><div class="hd"><div><span class="kicker">Across the CRO Hub</span><h3>The same loop, all sellers</h3></div></div><div class="pv pv2">' + [['Approved', c[0][1]], ['Started', c[1][1]], ['Completed', c[2][1]], ['Accepted', c[5][1]], ['Buyer step', c[6][1]]].map((x) => '<div class="pvs"><b class="num">' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div><p class="note" style="margin-top:10px">Pilot sample plus what you did in this demo. Every action you took here is counted.</p><div class="j-actions"><button class="btn red" data-act="tab" data-t="command">See it on the CRO Hub</button></div></div></div>';
}

function viewJourney() {
  const a = jAcct(), f = jFacts(a), body = [jUse, jSee, jFind, jDecide, jGuide, jTune, jProve][J.step](a, f);
  return jBar(a, f) + jStepper() + '<div class="j-body">' + body + '</div>' + jNav();
}

// ----- events -----
const jGo = (n) => { J.step = Math.max(0, Math.min(JSTEPS.length - 1, n)); renderView(); window.scrollTo(0, 0); };
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act^="j-"]'); if (!t) return; const a = t.dataset.act, d = t.dataset;
  if (a === 'j-step') jGo(+d.s);
  else if (a === 'j-pick-row') { const x = GA.find((q) => q.id === d.a); if (x) { J.acct = x.name; GX.methAcct = x.name; renderView(); } }
  else if (a === 'j-rule') { GX.prompt = d.v === 'on' ? GSAMPLE + JRULE : GSAMPLE; GX.wts = {}; gCompile(); GX.runLog = ['Compiled with 0 errors']; audit((d.v === 'on' ? 'Added' : 'Removed') + ' a Studio rule: rival loss with an untapped product'); renderView(); }
  else if (a === 'j-studio') setTab('studio');
  else if (a === 'j-acct-reset') { J.acct = 'Acme Corp'; renderView(); }
  else if (a === 'j-play') { const p = jPlay(jAcct(), jFacts(jAcct())), st = gps(p.id); if (d.v === 'approve') { st.auth = true; st.deferred = false; audit('Approved the play: ' + p.title); toast('Approved. The seller can now see it.'); } else if (d.v === 'defer') { st.deferred = true; st.auth = false; audit('Deferred the play: ' + p.title); toast('Deferred'); } else { st.auth = false; st.deferred = false; } gSavePlays(); renderView(); }
});
document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.act === 'j-acct') { J.acct = e.target.value.split(' · ')[0]; GX.methAcct = J.acct; renderView(); } });
