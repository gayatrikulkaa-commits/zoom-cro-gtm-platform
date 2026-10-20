// ---------- Accounts, Guided selling and Prove, version 2, and the grouped navigation ----------

// ===== the three plays that belong to the three Hub decisions; Acme Corp and Contoso Ltd stay as extra plays =====
(function () {
  const P = GPLAYS.find((p) => p.id === 'P-business'); if (P) P.decision = 'reframe';
  const mk = (id, decision, aid, kind) => {
    const a = GAID[aid], z = M.acc[aid]; if (!a || !z || GPLAYS.some((p) => p.id === id || p.account === a.name)) return;
    const ev = (T.external_signals || []).filter((e) => e.account_id === aid).sort((x, y) => (x.published_date < y.published_date ? 1 : -1))[0], th = GX.threads.find((t) => t.account === a.name);
    const owns = GPROD.filter((p) => a.owns[p[2]]).map((p) => gProdShort(p[0])).join(', ') || 'no Zoom products yet';
    const base = { id, decision, thread: th ? th.id : null, account: a.name, change: ev ? jClean(ev.type + ': ' + ev.text) : 'No outside signal is recorded for this account.', us: 'Zoom already runs ' + owns + ', so the case starts from what the customer uses today.' };
    if (kind === 'rescue') GPLAYS.push(Object.assign(base, { title: 'Save the ' + a.name + ' renewal before the quote goes out', why: ucf(reasonOf(z)) + '. ' + fm(z.arrAtRisk, 1) + ' of yearly revenue renews in ' + z.renewalDays + ' days.', now: 'The renewal is ' + z.renewalDays + ' days out and ' + fm(z.arrAtRisk, 1) + ' is at risk.',
      steps: [['Review the usage drop with the admin', 'Find what changed before anyone sells.'], ['Book an executive check-in', 'Bring the usage findings and a recovery plan.'], ['Run a 30-day adoption sprint', 'Customer success and the seller agree three adoption targets.'], ['Record the renewal path in Salesforce', 'A dated buyer next step closes the loop.']] }));
    else GPLAYS.push(Object.assign(base, { title: 'Get a senior customer leader behind the ' + a.name + ' deal', why: 'No senior leader at ' + a.name + ' backs the open deal, and deals like this win about half as often.', now: 'The deal is open and nobody senior at the customer has been met.',
      steps: [['Map the buying committee', 'Name the economic buyer and who signs.'], ['Ask the champion for an introduction', 'Ask for a 30-minute meeting with a senior leader.'], ['Book an executive briefing', 'Bring a Zoom executive and the customer\'s own priority.'], ['Record the sponsor in Salesforce', 'A named sponsor and a dated next step close the loop.']] }));
  };
  const rs = M.actions.find((a) => a.id === 'rescue'), sp = M.actions.find((a) => a.id === 'sponsor');
  if (rs && rs.leadId) mk('P-rescue', 'rescue', rs.leadId, 'rescue');
  if (sp && sp.leadId) mk('P-sponsor', 'sponsor', sp.leadId, 'sponsor');
  GPLAYS.forEach((p) => { if (p.thread) GTHREAD_PLAY[p.thread] = p.id; });
  const order = ['reframe', 'rescue', 'sponsor']; GPLAYS.sort((x, y) => (x.decision ? order.indexOf(x.decision) : 9) - (y.decision ? order.indexOf(y.decision) : 9));
  syncPlays();
})();

// ===== Guided selling: three plays, the proof, and everything else folded =====
function viewGuided10() {
  const main = GPLAYS.filter((p) => p.decision), extra = GPLAYS.filter((p) => !p.decision), waiting = main.filter((p) => !gps(p.id).auth).length, c = gProve(), mx = Math.max.apply(null, c.map((x) => x[1]));
  return answerCard({ kicker: 'Step 4 · Guide', headline: waiting ? waiting + ' of ' + main.length + ' decisions are waiting for you. Approve one and the seller is guided step by step.' : 'All ' + main.length + ' decisions are approved. Watch the sellers work through them.', sowhat: 'The CRO decides, the seller is guided in Slack and Salesforce, and the result flows back so the CRO can see whether execution improved. The CRO approves first because sellers tend to ignore an AI nudge that does not come from a manager or a colleague. Approving here or on the CRO Hub is the same decision.' }) +
    '<div class="card"><div class="hd"><div><span class="kicker">From issue to action</span><h3>Plays for your three decisions</h3></div><span class="hd-r"><button class="linkbtn" data-act="tab" data-t="coach">Seller coach (the seller runs it)</button></span></div><div class="gx-plays">' + main.map(gPlay).join('') + '</div>' +
    '<div class="gx-prove"><h3>Is it lifting revenue? <small>Pilot sample plus what you do in this demo</small></h3>' + c.map((x) => '<div class="gx-prow"><span>' + x[0] + '</span><div class="gx-lb"><i style="width:' + Math.max(4, (x[1] / mx) * 100) + '%"></i></div><b class="num">' + x[1] + '</b></div>').join('') + '<div class="gx-prow pend"><span>Revenue outcome</span><div class="gx-lb"><i></i></div><b>-</b></div><p class="gx-pnote">Revenue lags the plays by weeks, so none is claimed yet. <button class="linkbtn" data-act="tab" data-t="prove">How it is proven</button></p></div></div>' +
    (extra.length ? more('Two more plays from the risk threads (' + extra.map((p) => esc(p.account)).join(', ') + ')', '<div class="gx-plays">' + extra.map((p, i) => gPlay(p, main.length + i)).join('') + '</div>') : '') +
    '<div class="card"><div class="hd"><div><span class="kicker">For the customer</span><h3>Client materials</h3></div><span class="hd-r"><button class="btn red sm" data-act="tab" data-t="assets">Generate an executive briefing</button></span></div><p class="sub">Create an executive briefing or meeting prep for any account, from the same context.</p></div>' + more('Methodology check: what should exist at this stage, and what the context shows', gMethodology());
}

// ===== Accounts =====
const AF = { filter: 'all', all: false };
const TYPE_ALL = { all: 'All', renewal: 'Renewal risk', rival: 'Rival contest', expand: 'Expansion', win: 'Wins', ok: 'Healthy' };
function acctRows(F) {
  const byId = Object.fromEntries(focusAll(F).map((c) => [c.a.id, c]));
  return GA.filter((a) => inReg(a.region)).map((a) => byId[a.id] || { type: 'ok', a, z: M.acc[a.id], dollars: 0, score: 0, d: 999, date: null, why: 'Healthy. Nothing needs the CRO this quarter.', sys: [] }).sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name));
}
function acctList(F) {
  const rows = acctRows(F), asked = new Set(M.asks.map((x) => x.a.account_id)), rivalIds = new Set(F.open.filter(nmd).map((o) => o.account_id));
  const pred = { all: () => true, renewal: (c) => c.z && c.z.arrAtRisk > 0.005, rival: (c) => rivalIds.has(c.a.id), expand: (c) => asked.has(c.a.id), win: (c) => c.type === 'win', ok: (c) => c.type === 'ok' }, cnt = (k) => rows.filter(pred[k]).length, list = rows.filter(pred[AF.filter] || pred.all), shown = AF.all ? list : list.slice(0, 12);
  const chips = Object.keys(TYPE_ALL).map((k) => '<button data-act="af-f" data-f="' + k + '" aria-pressed="' + (AF.filter === k) + '">' + TYPE_ALL[k] + ' ' + cnt(k) + '</button>').join('');
  const nRisk = rows.filter((c) => c.type === 'renewal').length;
  return answerCard({ kicker: 'Step 2 · Find', headline: 'Select an account to see why it matters, what Databook has seen, and what to do.', sowhat: 'Each account joins four Zoom systems (Salesforce, Gong, Grafana, monday.com) with licensed outside data, resolved to one company. The list is ordered by dollars at stake and how soon the decision falls, the same order as the Top accounts on the CRO Hub.' }) +
    '<div class="card flush"><div class="hd" style="padding:16px 18px 0"><div><span class="kicker">' + rows.length + ' accounts</span><h3>Accounts</h3></div><div class="seg light-seg" role="group" aria-label="Filter accounts">' + chips + '</div></div><div class="tbl-wrap"><table class="hb-tbl"><thead><tr><th>Account</th><th>Why</th><th class="r">At stake</th><th>What Databook saw</th><th>Seller</th><th>Status</th></tr></thead><tbody>' +
    shown.map((c) => { const s = rowStatus(c); return '<tr class="click" data-act="hb-acct" data-id="' + c.a.id + '"><td><b>' + esc(c.a.name) + '</b><div class="sub">' + esc(c.a.region) + ' · ' + esc(c.a.industry) + '</div></td><td><span class="pill ' + (TYPE_PILL[c.type] || 'neutral') + '">' + (TYPE_LBL[c.type] || 'Healthy') + '</span></td><td class="r num">' + (c.dollars ? '<b>' + fm(c.dollars, 1) + '</b>' : '') + '</td><td class="hb-why">' + esc(c.why) + '</td><td>' + esc(c.a.rep) + '</td><td>' + (c.type === 'ok' ? '' : '<span class="gx-chip ' + s[1] + '">' + s[0] + '</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    (list.length > 12 ? '<div class="gx-more"><span>Showing ' + shown.length + ' of ' + list.length + '</span><button class="btn sm" data-act="af-all">' + (AF.all ? 'Show the first 12' : 'Show all ' + list.length) + '</button></div>' : '') + '</div>';
}

// account context overlay for the anchor account: what outside data and the seller's notes add. Illustrative, and labelled so.
const ACCT_CTX = {
  'Northwind Traders': {
    priorities: [{ t: 'Cut operating cost by reducing the office footprint from Q3.', ev: 'n', src: 'Earnings call remarks (illustrative)', when: 'Oct 2026' }],
    finance: [{ t: 'Cost per customer contact is the lever Zoom Contact Center can move. The customer has not shared a cost baseline, so no savings figure is quoted yet.', ev: 'n', src: 'Databook reasoning, pending the customer\'s baseline', when: 'Open question' }]
  }
};
function acctDims(a, f) {
  const z = f.z, sig = f.sig.map((s) => ({ t: jClean(s.text), type: s.type, src: jClean(s.source), when: dateFmt(s.published_date), pub: s.license_type === 'Public' })), ov = ACCT_CTX[a.name] || {};
  const out = (arr) => arr.map((r) => ({ t: r.t, ev: r.ev, sys: r.sys || ['out'], src: r.src, when: r.when }));
  const outsideRow = (s, ev) => ({ t: s.t, ev: ev || (s.pub ? 'v' : 'i'), sys: ['out'], src: s.src, when: s.when });
  const pri = (ov.priorities || []).concat(sig.filter((s) => (s.type === 'News' || s.type === 'Earnings') && !/cost|margin|efficien|productiv/i.test(s.t)).slice(0, 2).map((s) => outsideRow(s))), fin = (ov.finance || []).concat(sig.filter((s) => s.type === 'Earnings' && /cost|margin|efficien|productiv/i.test(s.t)).map((s) => outsideRow(s)));
  if (!pri.length) pri.push({ t: 'No stated priority is on record for this account.', ev: 'n', sys: [], src: 'Nothing found in outside data', when: '' });
  if (!fin.length) fin.push({ t: 'No financial driver is on record. Ask for the cost baseline before quoting savings.', ev: 'n', sys: [], src: 'Nothing found in outside data', when: '' });
  const ex = f.contacts.filter((c) => +c.is_executive).slice(0, 2).map((c) => ({ t: c.name + ', ' + c.title + (c.persona ? ' (' + String(c.persona).toLowerCase() + ')' : '') + ': ' + String(c.stance || 'no stance recorded').toLowerCase() + '. Last contact ' + dateFmt(c.last_activity_date) + '.', ev: 'v', sys: ['sf'], src: 'Salesforce contacts', when: dateFmt(c.last_activity_date) }));
  const intent = ex.concat(sig.filter((s) => s.type === 'Executive move').slice(0, 1).map((s) => outsideRow(s)));
  if (jNoExec(a)) intent.push({ t: 'No executive has been on the last three calls.', ev: 'v', sys: ['gong'], src: 'Gong call records', when: a.gong.lastCallDays + ' days ago' });
  if (!intent.length) intent.push({ t: 'No executive contact is on record.', ev: 'n', sys: [], src: '', when: '' });
  const rv = f.open.filter(nmd), comp = [];
  if (rv.length) comp.push({ t: nameList([...new Set(rv.map((o) => o.competitor))]) + ' named on ' + plural(rv.length, 'open deal') + ' (' + fm(sum(rv, (o) => o.amount), 1) + ').', ev: 'v', sys: ['sf', 'gong'], src: 'Salesforce competitor field and Gong calls', when: 'Current' });
  const l4 = f.lost.filter((o) => M.comp.last4.includes(o.fq)), l4by = {}; l4.forEach((o) => (l4by[o.competitor] = (l4by[o.competitor] || 0) + o.amount)); const l4top = Object.entries(l4by).sort((x, y) => y[1] - x[1])[0];
  if (l4.length) comp.push({ t: 'Lost ' + fm(sum(l4, (o) => o.amount), 1) + ' in ' + plural(l4.length, 'deal') + ' to named rivals in the last four quarters, most often to ' + l4top[0] + '.', ev: 'v', sys: ['sf'], src: 'Salesforce closed-lost deals', when: 'Last four quarters' });
  const seenT = new Set(); sig.filter((s) => s.type === 'Technology').forEach((s) => { if (!seenT.has(s.t) && seenT.size < 2) { seenT.add(s.t); comp.push(outsideRow(s, 'i')); } });
  if (!comp.length) comp.push({ t: 'No rival is named and no rival technology shows in outside data.', ev: 'i', sys: ['sf', 'out'], src: 'Salesforce and technographics', when: '' });
  const tm = [], op = f.open.slice().sort((x, y) => (x.close_date < y.close_date ? -1 : 1))[0];
  if (op) tm.push({ t: 'First open deal closes ' + dateFmt(op.close_date) + ' in ' + daysTo(op.close_date) + ' days (' + op.product_line + ', ' + op.stage + ', ' + fm(op.amount, 1) + ').', ev: 'v', sys: ['sf'], src: 'Salesforce', when: dateFmt(op.close_date) });
  tm.push({ t: 'Renewal in ' + a.renewalDays + ' days' + (a.legacyExpiryDays != null ? '; a legacy contract expires in ' + a.legacyExpiryDays + ' days' : '') + '.', ev: 'v', sys: ['sf'], src: 'Salesforce contracts', when: dateFmt(dueIso(a.renewalDays)) });
  const pj = a.monday.state !== 'No project' ? a.monday : null; if (pj && (pj.state === 'At risk' || pj.state === 'Blocked')) tm.push({ t: pj.product + ' project is ' + pj.state.toLowerCase() + (pj.blocker ? ': ' + pj.blocker.toLowerCase() : '') + '.', ev: 'v', sys: ['mon'], src: 'monday.com', when: 'Current' });
  return [['Strategic priorities', 'What the customer says matters to it', pri], ['Financial drivers', 'What moves its numbers', fin], ['Management intent', 'Who backs a change, and has that been confirmed', intent], ['Competitive dynamics', 'Who else is in the account', comp], ['Timing', 'Why now', tm]].map((d) => [d[0], d[1], out(d[2])]);
}
// this account's share of a decision, in modeled dollars
function acctShare(id, a, z) {
  const LV = M.lv, re = M.actions.find((x) => x.id === 'reframe'), ow = M.open.filter((o) => o.account_id === a.id);
  if (id === 'reframe') return sum(ow.filter((o) => re && re.dealIds.includes(o.opp_id)), (o) => o.recov) * LV.sponsor_push_success_rate;
  if (id === 'sponsor') return sum(ow.filter((o) => !+o.exec_sponsor && !(re && re.dealIds.includes(o.opp_id))), (o) => o.recov) * LV.sponsor_push_success_rate;
  if (id === 'rescue') return (z.arrAtRisk || 0) * LV.renewal_rescue_save_rate;
  return 0;
}
function acctDecisionHTML(a, z, cand, p) {
  const id = p ? p.decision : decisionFor(cand), act = id && M.actions.find((x) => x.id === id), st = id ? aStatus(id) : null, ps = p ? gps(p.id) : null, unit = act && act.kind === 'retention' ? 'renewal revenue protected' : 'bookings';
  let q, why, btns, meta = '';
  if (p) {
    const sh = id ? acctShare(id, a, z) : 0;
    q = 'Approve this play: ' + p.title; why = p.why + (sh > 0.005 ? ' Modeled at about +' + fm(sh, 1) + ' ' + unit + ' on this account.' : '');
    meta = '<span><b>Owner</b> ' + esc(a.rep) + '</span><span><b>Due</b> ' + dateFmt(dueIso(14)) + '</span><span><b>Target</b> a dated buyer next step</span>' + (act ? '<span class="cf ' + act.conf + '">Confidence ' + act.conf + '</span>' : '');
    btns = ps.auth ? '<span class="appr ok">Approved · ' + ps.steps.filter(Boolean).length + ' of 4 steps done</span><button class="btn red" data-act="gx-gotoplay" data-id="' + p.id + '">Guide the seller</button><button class="btn ghost" data-act="gx-undo" data-id="' + p.id + '">Undo approval</button>' : '<button class="btn red" data-act="gx-auth" data-id="' + p.id + '">Approve play</button>' + (p.decision ? '<button class="btn" data-act="mv-set" data-id="' + p.decision + '" data-v="Rejected">Defer</button><button class="btn ghost" data-act="hb-evid" data-id="' + p.decision + '">Ask for evidence</button>' : '');
    if (st === 'Rejected') btns = '<span class="appr bad">Deferred</span><button class="btn" data-act="gx-auth" data-id="' + p.id + '">Approve instead</button><button class="btn ghost" data-act="hb-undo" data-id="' + p.decision + '">Reopen</button>';
    if (st === 'Evidence' && !ps.auth) btns = '<span class="appr">Evidence requested</span><button class="btn red" data-act="gx-auth" data-id="' + p.id + '">Approve play</button>';
  } else if (act) {
    const sh = acctShare(id, a, z), n = (HB_DEC_NO[id] || 0);
    q = 'Approve decision ' + n + ' for this account too: ' + hMove(act).title(act); why = 'This account is one of the accounts the decision covers' + (sh > 0.005 ? ', with about +' + fm(sh, 1) + ' ' + unit + ' modeled here' : '') + '. Approving starts it for every account in the set.';
    meta = '<span><b>Owner</b> ' + esc(a.rep) + '</span><span><b>Due</b> ' + dateFmt(act.due) + '</span><span class="cf ' + act.conf + '">Confidence ' + act.conf + '</span>';
    btns = st === 'Approved' ? '<span class="appr ok">Approved</span><button class="btn ghost" data-act="hb-undo" data-id="' + id + '">Undo</button>' : st === 'Rejected' ? '<span class="appr bad">Deferred</span><button class="btn" data-act="mv-set" data-id="' + id + '" data-v="Approved">Approve instead</button>' : '<button class="btn red" data-act="mv-set" data-id="' + id + '" data-v="Approved">Approve</button><button class="btn" data-act="mv-set" data-id="' + id + '" data-v="Rejected">Defer</button><button class="btn ghost" data-act="hb-evid" data-id="' + id + '">Ask for evidence</button>';
  } else if (cand.type === 'win') {
    q = 'Decide whether to turn this win into a coach for similar accounts'; why = cand.why + ' The Coach studio can capture what worked and hand it to sellers on comparable accounts.'; btns = '<button class="btn red" data-act="tab" data-t="costudio">Open the Coach studio</button>';
  } else if (cand.type === 'rival') {
    q = 'No CRO decision needed: the seller leads'; why = 'A rival is named, but this account is not in the Contact Center set. The seller prepares a side-by-side and a customer reference; the CRO sees it again if the close date slips.'; btns = '<button class="btn" data-act="opencoach" data-id="' + a.id + '">Open the seller coach</button>';
  } else { q = 'Nothing to decide'; why = 'No signal needs the CRO this quarter.'; btns = '<button class="btn" data-act="opencoach" data-id="' + a.id + '">Open the seller coach</button>'; }
  return '<section class="card hb-decide"><div class="hb-dcl"><span class="kicker">The decision for you</span><h3>' + esc(q) + '</h3><p class="sub">' + esc(why) + '</p>' + (meta ? '<div class="hb-dm">' + meta + '</div>' : '') + '</div><div class="hb-playa">' + btns + '</div></section>';
}
const HB_DEC_NO = { reframe: 1, rescue: 2, sponsor: 3 };

// context graph: Zoom's systems and outside data flow into one account, then into the five angles
function ctxGraph(a, dims) {
  const SYS = [['sf', 'Salesforce'], ['gong', 'Gong'], ['graf', 'Grafana'], ['mon', 'monday.com'], ['out', 'Outside data']], sc = {}, dc = dims.map((d) => d[2].filter((r) => r.sys && r.sys.length).length);
  dims.forEach((d) => d[2].forEach((r) => (r.sys || []).forEach((s) => (sc[s] = (sc[s] || 0) + 1))));
  const W = 760, H = 330, cx = 380, cy = 165, sy = (i) => 36 + i * 64, dy = (i) => 36 + i * 64, w = (n) => 1 + Math.min(6, n * 0.9), total = sum(Object.values(sc), (x) => x);
  let s = '<svg class="hb-gsvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Context graph for ' + esc(a.name) + ': ' + total + ' facts from ' + Object.keys(sc).length + ' sources, grouped into five angles">';
  SYS.forEach((x, i) => { const n = sc[x[0]] || 0; s += '<line x1="168" y1="' + sy(i) + '" x2="' + (cx - 46) + '" y2="' + cy + '" class="hb-ge ' + (x[0] === 'out' ? 'tp' : 'fp') + (n ? '' : ' off') + '" stroke-width="' + w(n) + '"/>'; });
  dims.forEach((d, i) => { s += '<line x1="' + (cx + 46) + '" y1="' + cy + '" x2="578" y2="' + dy(i) + '" class="hb-ge cx' + (dc[i] ? '' : ' off') + '" stroke-width="' + w(dc[i]) + '"/>'; });
  SYS.forEach((x, i) => { const n = sc[x[0]] || 0; s += '<g class="hb-gn ' + (x[0] === 'out' ? 'tp' : 'fp') + (n ? '' : ' off') + '"><rect x="20" y="' + (sy(i) - 18) + '" width="148" height="36" rx="9"/><text x="34" y="' + (sy(i) + 4) + '">' + x[1] + '</text><text x="154" y="' + (sy(i) + 4) + '" text-anchor="end" class="n">' + n + '</text></g>'; });
  s += '<g class="hb-gc"><circle cx="' + cx + '" cy="' + cy + '" r="46"/><text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle">' + esc(a.name.length > 14 ? a.name.split(' ')[0] : a.name) + '</text><text x="' + cx + '" y="' + (cy + 13) + '" text-anchor="middle" class="s">context graph</text></g>';
  dims.forEach((d, i) => { s += '<g class="hb-gn dim" data-act="scrollto" data-to="dim-' + i + '" tabindex="0"><rect x="578" y="' + (dy(i) - 18) + '" width="168" height="36" rx="9"/><text x="590" y="' + (dy(i) + 4) + '">' + d[0] + '</text><text x="734" y="' + (dy(i) + 4) + '" text-anchor="end" class="n">' + d[2].length + '</text></g>'; });
  return s + '</svg>';
}
function acctPage() {
  const id = S.account, a = GAID[id], z = M.acc[id], F = hubFacts(); if (!a || !z) return acctList(F);
  const f = jFacts(a), cand = focusAll(F).find((c) => c.a.id === id) || { type: 'ok', dollars: 0 }, p = playOf(a), th = GX.threads.find((t) => t.account === a.name), dims = acctDims(a, f);
  const rv = f.open.filter(nmd), decided = M.closed.filter((o) => o.account_id === id).sort((x, y) => (x.close_date < y.close_date ? 1 : -1));
  let read;
  if (cand.type === 'rival') read = a.name + ' is a ' + fm(z.arr_current, 1) + ' account where rivals took ' + fm(z.lost4 || 0, 1) + ' in four quarters. ' + plural(rv.length, 'open deal') + ' still ' + (rv.length === 1 ? 'names' : 'name') + ' a rival and the first one closes ' + dateFmt(cand.date) + ', in ' + cand.d + ' days.';
  else if (cand.type === 'renewal') read = a.name + ' renews in ' + a.renewalDays + ' days with ' + fm(z.arrAtRisk, 1) + ' of yearly revenue at risk. ' + ucf(reasonOf(z)) + '.';
  else if (cand.type === 'expand') read = a.name + ' raised ' + z.nextProd + ' on ' + plural(z.nextProdIntent, 'call') + ' and no deal is open. It is worth about ' + fm(cand.dollars, 1) + ' if it converts.';
  else if (cand.type === 'win') read = a.name + ' is a win to repeat. ' + cand.why;
  else read = a.name + ' is healthy. Nothing needs the CRO this quarter.';
  const nFacts = sum(dims, (d) => d[2].filter((r) => r.sys && r.sys.length).length), nSys = new Set(dims.flatMap((d) => d[2].flatMap((r) => r.sys || []))).size;
  const dimHTML = dims.map((d, i) => '<div class="hb-dim" id="dim-' + i + '"><div class="hb-dh2"><b>' + d[0] + '</b><small>' + d[1] + '</small></div><ul>' + d[2].map((r) => '<li><span>' + esc(r.t) + '</span><span class="hb-meta">' + evc(r.ev) + (r.sys && r.sys.length ? srcs.apply(null, r.sys) : '') + (r.src ? '<small>' + esc(r.src) + (r.when ? ' · ' + esc(r.when) : '') + '</small>' : '') + '</span></li>').join('') + '</ul></div>').join('');
  const hist = decided.slice(0, 6).map((o) => '<tr><td>' + dateFmt(o.close_date) + '</td><td>' + o.product_line + '</td><td><span class="pill ' + (o.won ? 'ok' : 'bad') + '">' + (o.won ? 'Won' : 'Lost') + '</span></td><td class="r num">' + fm(o.amount, 1) + '</td><td>' + (nmd(o) ? esc(o.competitor) : '') + '</td><td>' + (+o.exec_sponsor ? 'Senior leader' : 'No senior leader') + '</td></tr>').join('');
  const head = '<div class="hb-back"><button class="linkbtn" data-act="af-back">← All accounts</button><label class="j-pick"><span>Account</span><select class="sel" data-act="af-pick" aria-label="Pick an account">' + GA.slice().sort((x, y) => x.name.localeCompare(y.name)).map((x) => '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label></div>';
  return head + '<section class="answer"><span class="kicker">' + esc(a.region) + ' · ' + esc(z.country || '') + ' · ' + esc(a.industry) + ' · seller ' + esc(a.rep) + '</span><h2>' + esc(read) + '</h2><div class="astats"><div><div class="v">' + fm(z.arr_current, 1) + '</div><div class="l">yearly revenue</div></div><div><div class="v">' + z.health + '</div><div class="l">health score</div></div><div><div class="v">' + fm(sum(f.open, (o) => o.amount), 1) + '</div><div class="l">open pipeline</div></div><div><div class="v">' + pc(f.winRate, 0) + '</div><div class="l">win rate here, ' + f.nDecided + ' decided</div></div></div></section>' +
    acctDecisionHTML(a, z, cand, p) +
    '<section class="card"><div class="hd"><div><span class="kicker">Customer context graph</span><h3>' + nFacts + ' facts from ' + nSys + ' sources, joined on one company</h3></div><span class="hd-r"><span class="legend"><span>' + evc('v') + '</span><span>' + evc('i') + '</span><span>' + evc('n') + '</span></span></span></div><div class="hb-graph">' + ctxGraph(a, dims) + '</div><p class="sub hb-gphone">Open on a wider screen to see the graph.</p><div class="hb-dims">' + dimHTML + '</div><p class="foot-note" style="margin-top:12px">' + srcs('sf', 'gong', 'graf', 'mon') + ' are Zoom\'s own systems. ' + srcs('out') + ' is licensed or public data, illustrative here: no source title or link is shown because none is real. In a deployment every claim carries its source, date and access rights.</p></section>' +
    more('How we won and lost here', '<div class="tbl-wrap"><table><thead><tr><th>Closed</th><th>Product</th><th>Outcome</th><th class="r">Amount</th><th>Rival</th><th>Senior leader</th></tr></thead><tbody>' + (hist || '<tr><td colspan="6">No decided deals.</td></tr>') + '</tbody></table></div>') +
    (th ? more('Why this account is flagged: the risk thread and its evidence', '<p><b>[RISK THREAD: ' + esc(GTYPE[th.type][0]) + ']</b> ' + esc(th.text) + '</p><div class="gx-tl">' + th.events.map((e) => '<div class="gx-tev"><span class="gx-chip">' + esc(e[0]) + '</span><span class="num">' + esc(e[1]) + '</span><span>' + esc(e[2]) + '</span></div>').join('') + '</div>' + evc('i')) : '') +
    '<div class="gx-detact"><button class="btn" data-act="gx-msg" data-a="' + a.id + '">Message the account team</button><button class="btn" data-act="opencoach" data-id="' + id + '">Open the seller coach</button><button class="btn" data-act="hb-go" data-t="guided">See it in Guided selling</button></div>';
}
function viewAccounts10() { return S.sub.accounts === 'view' && S.account ? acctPage() : acctList(hubFacts()); }
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act^="af-"]'); if (!t) return; const a = t.dataset.act, d = t.dataset;
  if (t.tagName === 'SELECT') return;
  if (a === 'af-f') { AF.filter = d.f; AF.all = false; renderView(); }
  else if (a === 'af-all') { AF.all = !AF.all; renderView(); }
  else if (a === 'af-back') { S.sub.accounts = 'priority'; renderView(); window.scrollTo(0, 0); }
});
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.act === 'af-pick') { S.account = t.value; renderView(); window.scrollTo(0, 0); } });

// ===== Prove: did execution improve, and what is the evidence on revenue =====
function viewProve() {
  const rows = GPLAYS.map((p) => { const a = gByName(p.account), st = gps(p.id), ss = desk.coach.sessions.filter((x) => x.account === a.id), n = st.steps.filter(Boolean).length, yes = (v) => (v ? '<span class="gx-chip g">Yes</span>' : '<span class="gx-chip">Not yet</span>'); return { p, a, html: '<tr class="click" data-act="hb-acct" data-id="' + a.id + '"><td><b>' + esc(p.title) + '</b><div class="sub">' + esc(a.name) + (p.decision ? ' · decision ' + (['reframe', 'rescue', 'sponsor'].indexOf(p.decision) + 1) : ' · extra play') + '</div></td><td>' + esc(a.rep) + '</td><td>' + yes(st.auth) + '</td><td class="num">' + n + ' of 4</td><td>' + yes(ss.length) + '</td><td>' + yes(ss.some((x) => x.done)) + '</td><td>' + yes(st.buyer || ss.some((x) => x.buyerNext)) + '</td></tr>' }; });
  const ak = M.actions.find((x) => x.id === 'asks'), askRow = ak && aStatus('asks') !== 'Pending' ? '<tr><td><b>' + esc(hMove(ak).title(ak)) + '</b><div class="sub">Decision 4</div></td><td>Account executives</td><td><span class="gx-chip ' + (aStatus('asks') === 'Approved' ? 'g' : '') + '">' + (aStatus('asks') === 'Approved' ? 'Yes' : 'Deferred') + '</span></td><td class="num">–</td><td>–</td><td>–</td><td>–</td></tr>' : '';
  const nAppr = GPLAYS.filter((p) => gps(p.id).auth).length;
  return answerCard({ kicker: 'Step 5 · Prove', headline: 'Execution, step by step: ' + nAppr + ' of ' + GPLAYS.length + ' plays approved.', sowhat: 'Revenue is not claimed until it shows up in closed deals, about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days later. Until then the proof is whether the approved plays are being worked.' }) + loopCard() +
    '<div class="card flush"><div class="hd" style="padding:16px 18px 0"><div><span class="kicker">What was approved, and who has worked on it</span><h3>Approved actions and sellers</h3></div></div><div class="tbl-wrap"><table class="hb-tbl"><thead><tr><th>Action</th><th>Seller</th><th>Approved</th><th>Plan steps done</th><th>Coach started</th><th>Coach finished</th><th>Buyer next step</th></tr></thead><tbody>' + rows.map((r) => r.html).join('') + askRow + '</tbody></table></div></div>' +
    '<div class="card"><div class="hd"><div><h3>Practising or presenting again?</h3></div></div><p class="sub">Clear every approval, play step and coach run on this screen, and start from the beginning.</p><div class="hb-da"><button class="btn" data-act="resetdemo">Start over</button></div></div>';
}

// ===== navigation: six groups, each with its own screens =====
const NAVG = [
  { id: 'command', label: 'CRO Hub', tag: 'See · Decide', desc: 'Top line and decisions · key accounts · return on spend · product and brand · sellers and adoption', members: [['command', 'CRO Hub', 'The whole picture on one page']], also: ['journey'] },
  { id: 'accounts', label: 'Accounts', tag: 'Find', desc: 'Every account, with its decision, context graph and five angles', members: [['accounts', 'Accounts', 'Every account, with its decision, context graph and five angles']], also: ['engine'] },
  { id: 'perf', label: 'Performance', tag: 'Find', desc: 'CRO KPIs · regions and products · forecast · sellers · spend and pricing · rivals', members: [['kpis', 'CRO KPIs', 'The KPIs a CRO is judged on, and what this data covers'], ['regprod', 'Regions and products', 'Who is on track by region, and what Zoom is selling'], ['forecast', 'Forecast', 'Forecast vs actual, the pipeline, and deals most at risk'], ['sellers', 'Sellers', 'Who is on pace, and pilot sellers against the rest'], ['pricing', 'Spend and pricing', 'Discounts, promotions and marketing channels'], ['compete', 'Rivals', 'Where rivals show up, and what to do about it']], also: [] },
  { id: 'guided', label: 'Guided selling', tag: 'Guide', desc: 'Plays · Coach studio (the CRO designs the coach) · Client materials · Seller coach (the seller runs it)', members: [['guided', 'Plays', 'The three plays, step by step in Slack and Salesforce'], ['costudio', 'Coach studio · for the CRO', 'You design and approve how a seller is guided on one account'], ['assets', 'Client materials', 'Generate an executive briefing or meeting prep for any account'], ['coach', 'Seller coach · for the seller', 'The seller runs the approved coach, six steps, on one account']], also: [] },
  { id: 'prove', label: 'Prove', tag: 'Prove', desc: 'Results · uplift and adoption', members: [['prove', 'Results', 'From approval to buyer step, and the ledger behind the upside'], ['uplift', 'Uplift and adoption', 'Open deals to uplift, and what has to change for it to be real']], also: ['revenue'] },
  { id: 'connect', label: 'Connections', tag: 'Settings', desc: 'Where insights go · where signals come from · request a use case · set your view', members: [['connect', 'Connections', 'Where insights go, where signals come from, your view']], also: [] },
  { id: 'hood', label: 'Under the hood', tag: 'Data and intelligence', desc: 'Data and trust · feeds and matching · how it reasons · Studio · Workspace · approvals and rules', members: [['sources', 'Data and trust', 'Every data source, its owner and how fresh it is'], ['ingress', 'Feeds and matching', 'How four feeds resolve to one company'], ['why', 'How it reasons', 'Why Zoom cannot cheaply build this itself'], ['studio', 'Studio', 'Turn a question into a standing rule for sellers'], ['lab', 'Workspace', 'Change assumptions and test scenarios'], ['decide', 'Approvals and rules', 'Delegation, overrides and the audit trail']], also: [] }
];
const groupOf = (tab) => NAVG.find((g) => g.id === tab || g.members.some((m) => m[0] === tab) || g.also.includes(tab));
function groupBar() {
  const g = groupOf(S.tab); if (!g || g.members.length < 2) return '';
  return '<div class="gbar" role="group" aria-label="' + esc(g.label) + '">' + g.members.map((m) => '<button class="gtab" data-tip="' + esc('<b>' + m[1] + '</b><br>' + (m[2] || '')) + '" data-act="tab" data-t="' + m[0] + '" aria-current="' + (S.tab === m[0] ? 'page' : 'false') + '">' + m[1] + '</button>').join('') + '</div>';
}
