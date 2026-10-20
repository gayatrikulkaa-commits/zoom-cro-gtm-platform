// ---------- the CRO Hub, version 2: answer first, and every number says how Databook sees it ----------
// One set of facts (hubFacts) feeds the Hub, the Accounts screen and the Prove screen, so a number on the Hub is the number on the screen it opens.
// First-party signals come from Zoom's own systems (Salesforce, Gong, Grafana, monday.com). Third-party signals are licensed or public outside data, illustrative here.
const ANCHOR = 'Northwind Traders';
const GAID = Object.fromEntries(GA.map((a) => [a.id, a]));
const nmd = (o) => !!o.competitor && o.competitor !== 'None';
const wrate = (arr) => (arr.length ? arr.filter((o) => o.won).length / arr.length : 0);
const dueIso = (n) => ZM.iso(ZM.ms(M.asOf) + n * 864e5);
const daysTo = (iso) => Math.round((ZM.ms(iso) - ZM.ms(M.asOf)) / 864e5);
const nameList = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);
const plural = (n, w, p) => n + ' ' + (n === 1 ? w : p || w + 's');
const HB = { top: 5, ev: null, evAcct: null };

// ----- evidence labels: Verified, Inferred, Needs validation -----
const EVN = { v: ['Verified', 'A record in one of Zoom\'s own systems (Salesforce, Gong, Grafana, monday.com) or a public filing.'], i: ['Inferred', 'Databook combined several signals into this read. The rule is shown beside it.'], n: ['Needs validation', 'Not yet confirmed by the buyer or a source. Treat it as a hypothesis.'] };
const evc = (k) => '<span class="evl ' + k + '" title="' + esc(EVN[k][1]) + '">' + EVN[k][0] + '</span>';
const SRCN = { sf: ['Salesforce', 1], gong: ['Gong', 1], graf: ['Grafana', 1], mon: ['monday.com', 1], out: ['Outside data', 0] };
const srcs = (...ks) => '<span class="srcs">' + ks.map((k) => '<span class="srcc ' + (SRCN[k][1] ? 'fp' : 'tp') + '" title="' + (SRCN[k][1] ? 'Zoom first-party system' : 'Licensed or public outside data, illustrative in this prototype') + '">' + SRCN[k][0] + '</span>').join('') + '</span>';

// ----- facts -----
function hubFacts() {
  const reg = (o) => inReg(o.account.region), win = (o) => o.fq === M.curQ || o.fq === M.nextQ;
  const closed = M.closed.filter(reg), open = M.open.filter(reg), openW = open.filter(win);
  const key = S.region === 'All' ? 'All' : S.region, B = M.bridge[key] || M.bridge.All;
  const row = S.region === 'All' ? M.matrix.all : (M.matrix.region.find((r) => r.label === S.region) || M.matrix.all);
  const accs = M.accounts.filter((a) => inReg(a.region)), risky = accs.filter((a) => a.arrAtRisk > 0.005).sort((x, y) => y.arrAtRisk - x.arrAtRisk);
  const C = S.region === 'All' ? M.comp : M.compFor(reg);
  return { reg, win, closed, open, openW, B, row, accs, risky, C, act: (id) => M.actions.find((a) => a.id === id), repW: sum(openW, (o) => o.repCall), aiW: sum(openW, (o) => o.aiCall), down: sum(openW, (o) => Math.max(0, o.repCall - o.aiCall)), up: sum(openW, (o) => Math.max(0, o.aiCall - o.repCall)), nDown: openW.filter((o) => o.repCall - o.aiCall > 0.005).length, nUp: openW.filter((o) => o.aiCall - o.repCall > 0.005).length };
}
const outsideTrigger = (id) => (T.external_signals || []).some((s) => s.account_id === id && (s.type === 'Executive move' || /consolidat|migration|rival|cost-efficiency|refresh|moderni/i.test(s.text)));

// win and loss: the patterns that predict a loss, what each costs, and how many open deals show it today
function winLoss(F) {
  const mk = (label, weak, openWeak) => { const a = F.closed.filter(weak), b = F.closed.filter((o) => !weak(o)), ow = F.openW.filter(openWeak || weak); return { label, wa: wrate(a), na: a.length, wb: wrate(b), nb: b.length, n: ow.length, amt: sum(ow, (o) => o.amount) }; };
  const lost = {}; F.C.lost.forEach((o) => (lost[o.competitor] = (lost[o.competitor] || 0) + o.amount));
  const cc = F.closed.filter((o) => o.product_line === 'Contact Center');
  return { rows: [mk('No senior customer leader on the deal', (o) => !+o.exec_sponsor), mk('Fewer than three customer contacts engaged', (o) => +o.contacts_engaged < 3), mk('A rival is named', nmd), mk('Discount above 30%', (o) => +o.discount_pct > 30)], rivals: Object.entries(lost).sort((x, y) => y[1] - x[1]), totalLost: F.C.totalLost, ccWin: wrate(cc), ccN: cc.length, ccLost: sum(cc.filter((o) => !o.won), (o) => o.amount) };
}

// is the AI-first story landing with buyers? three leading indicators that sit upstream of bookings
function positioning(F) {
  const calls = sum(F.accs, (a) => a.calls90 || 0), ex = calls ? sum(F.accs, (a) => a.execShare * (a.calls90 || 0)) / calls : 0;
  const ga = GA.filter((a) => inReg(a.region)), asks = M.asks.filter((x) => inReg(x.a.region));
  return { ex, attach: ga.filter((a) => a.owns.contactCenter || a.owns.ai).length, n: ga.length, asksN: asks.length, asksAmt: sum(asks, (x) => x.est) };
}

// spend, hires and sellers against revenue
function moneyFacts() {
  const fd = funnelData(), spend = sum(fd.ch, (x) => x.spend), book = sum(fd.ch, (x) => x.book), per = (x) => x.book / Math.max(0.0001, x.spend);
  const chans = fd.ch.map((x) => Object.assign({ roi: per(x) }, x)).sort((a, b) => b.roi - a.roi);
  const aes = M.aeRows.filter((r) => inReg(r.region)), hired = aes.filter((r) => r.hire_date >= '2025-02-01' && r.hire_date < '2026-02-01'), tenured = aes.filter((r) => !hired.includes(r));
  const ramp = hired.filter((r) => r.ramp_months_to_first_win !== '' && r.ramp_months_to_first_win != null).map((r) => +r.ramp_months_to_first_win);
  const top = aes.slice().sort((a, b) => b.ytd - a.ytd), t3 = top.slice(0, 3), rest = top.slice(3);
  const ids = new Set(t3.map((r) => r.user_id)), aeIds = new Set(aes.map((r) => r.user_id)), dec = M.closed.filter((o) => M.comp.last4.includes(o.fq) && aeIds.has(o.owner_id)), dT = dec.filter((o) => ids.has(o.owner_id)), dR = dec.filter((o) => !ids.has(o.owner_id)), sh = (arr) => (arr.length ? arr.filter((o) => +o.contacts_engaged >= 3).length / arr.length : 0);
  return { topC3: sh(dT), restC3: sh(dR), topWin: wrate(dT), restWin: wrate(dR), topN: dT.length, restN: dR.length, fd, spend, book, roi: book / Math.max(0.0001, spend), chans, hired, tenured, hiredWon: sum(hired, (r) => r.ytd), hiredPer: hired.length ? sum(hired, (r) => r.ytd) / hired.length : 0, tenPer: tenured.length ? sum(tenured, (r) => r.ytd) / tenured.length : 0, ramp: ramp.length ? mean(ramp) : 0, top: top.slice(0, 5), t3, totalWon: sum(aes, (r) => r.ytd) };
}

// ----- the focus list: dollars at stake divided by the square root of days to the decision, one row per account -----
const TYPE_LBL = { rival: 'Rival contest', renewal: 'Renewal risk', expand: 'Expansion', win: 'Win to repeat' };
const TYPE_PILL = { rival: 'bad', renewal: 'warn', expand: 'data', win: 'ok' };
function focusAll(F) {
  const dd = (d) => Math.max(7, d), C = [];
  F.accs.forEach((z) => {
    const a = GAID[z.account_id]; if (!a) return;
    const ow = F.open.filter((o) => o.account_id === z.account_id), rv = ow.filter(nmd), noSp = ow.filter((o) => !+o.exec_sponsor);
    if (rv.length) {
      const first = rv.map((o) => o.close_date).sort()[0], d = daysTo(first), lost4 = z.lost4 || 0, rivals = [...new Set(rv.map((o) => o.competitor))];
      C.push({ type: 'rival', z, a, dollars: sum(rv, (o) => o.amount), d, date: first, why: nameList(rivals) + ' on ' + plural(rv.length, 'deal') + (lost4 > 0.05 ? ' · ' + fm(lost4, 1) + ' lost here before' : '') + (noSp.length ? ' · no senior leader' : ''), sys: ['sf', 'gong'] });
    }
    if (z.arrAtRisk > 0.005) C.push({ type: 'renewal', z, a, dollars: z.arrAtRisk, d: z.renewalDays, date: dueIso(z.renewalDays), why: shortWhy(z), sys: ['graf', 'gong', 'sf'] });
  });
  M.asks.filter((x) => inReg(x.a.region)).forEach((x) => { const a = GAID[x.a.account_id]; if (a) C.push({ type: 'expand', z: x.a, a, dollars: x.est, d: 45, date: dueIso(45), why: x.a.nextProd + ' asked for on ' + plural(x.a.nextProdIntent, 'call') + ' · no deal open', sys: ['gong', 'sf'] }); });
  const won = {}; F.closed.filter((o) => o.won && o.close_date >= M.fyStart).forEach((o) => { (won[o.account_id] = won[o.account_id] || { amt: 0, n: 0, sp: 0 }); won[o.account_id].amt += o.amount; won[o.account_id].n++; won[o.account_id].sp += +o.exec_sponsor; });
  Object.keys(won).forEach((id) => { const z = M.acc[id], a = GAID[id]; if (!z || !a || z.arrAtRisk > 0.005) return; C.push({ type: 'win', z, a, dollars: won[id].amt, d: 60, date: null, why: 'Won ' + plural(won[id].n, 'deal') + (won[id].sp ? ' · ' + won[id].sp + ' with a senior leader' : ''), sys: ['sf'] }); });
  C.forEach((c) => (c.score = c.dollars / Math.sqrt(dd(c.d))));
  const best = {}; C.forEach((c) => { const k = c.a.id; if (!best[k] || (best[k].type !== 'win' && c.score > best[k].score) || best[k].type === 'win') best[k] = c.type === 'win' && best[k] ? best[k] : c; });
  return Object.values(best).sort((x, y) => y.score - x.score);
}
function focusTop(F, n) {
  // the accounts where the CRO's two big decisions start are always listed, then the next-largest exposures, with at most two or three of any one kind
  const all = focusAll(F), pins = ['reframe', 'rescue'].map((id) => { const a = F.act(id); return a && a.leadId ? a.leadId : null; }).filter(Boolean), out = all.filter((c) => pins.includes(c.a.id)), cap = n <= 5 ? 2 : 3, per = {};
  out.forEach((c) => (per[c.type] = (per[c.type] || 0) + 1));
  all.forEach((c) => { if (out.length < n && !out.includes(c) && (per[c.type] || 0) < cap) { out.push(c); per[c.type] = (per[c.type] || 0) + 1; } });
  if (!out.some((c) => c.type === 'win')) { const w = all.find((c) => c.type === 'win'); if (w) { let k = out.length - 1; while (k > 0 && pins.includes(out[k].a.id)) k--; out[k] = w; } }
  return out.sort((x, y) => y.score - x.score);
}
const decisionNo = (id) => { const k = ['reframe', 'rescue', 'sponsor'].findIndex((d) => { const a = M.actions.find((x) => x.id === d); return a && a.leadId === id; }); return k < 0 ? 0 : k + 1; };
function playOf(a) { return GPLAYS.find((p) => p.account === a.name); }
function decisionFor(c) {
  if (c.type === 'renewal') return 'rescue'; if (c.type === 'expand') return 'asks';
  if (c.type === 'rival') { const re = M.actions.find((a) => a.id === 'reframe'); return re && re.dealIds && M.open.some((o) => o.account_id === c.a.id && re.dealIds.includes(o.opp_id)) ? 'reframe' : null; }
  return null;
}
function moveText(c) {
  const p = playOf(c.a); if (p) return p.title;
  if (c.type === 'rival') { const id = decisionFor(c), rv = [...new Set(M.open.filter((o) => o.account_id === c.a.id && nmd(o)).map((o) => o.competitor))]; return id ? 'Reframe the pitch around the buyer\'s own priority' : 'Side-by-side against ' + nameList(rv.slice(0, 2)) + ' and a customer reference'; }
  return { renewal: 'Executive check-in and adoption sprint before the quote', expand: 'Open the ' + (c.z.nextProd || 'next product') + ' opportunity', win: 'Turn the win into a play for similar accounts' }[c.type];
}
function rowStatus(c) {
  const p = playOf(c.a);
  if (p) { const s = gps(p.id); if (!s.auth) return aStatus(p.decision) === 'Evidence' ? ['Evidence requested', 'o'] : aStatus(p.decision) === 'Rejected' ? ['Deferred', ''] : ['Waiting for you', 'o']; if (s.buyer) return ['Buyer step agreed', 'g']; if (s.steps.every(Boolean)) return ['Seller finished', 'g']; return ['Approved · ' + s.steps.filter(Boolean).length + ' of 4 done', 'g']; }
  const id = decisionFor(c); if (!id) return [c.type === 'win' ? 'Keep going' : 'Seller-led', ''];
  const st = aStatus(id); return st === 'Approved' ? ['Approved', 'g'] : st === 'Rejected' ? ['Deferred', ''] : st === 'Evidence' ? ['Evidence requested', 'o'] : id === 'asks' ? ['Next up', ''] : ['Decision pending', 'o'];
}
const ownerOf = (c) => c.a.rep;
const whenOf = (c) => (c.date ? dateFmt(c.date) + (c.d <= 30 ? ' · ' + c.d + ' days' : '') : 'This quarter');

// ----- Hub parts -----
function tileHTML(k, label, big, sub, st, signal, chips) {
  return '<button class="hb-t ' + stDot(st) + '" data-act="hb-ev" data-k="' + k + '"><span class="hb-tk">' + (st ? dot(stDot(st)) : '') + label + '</span><b class="hb-tv num">' + big + '</b><span class="hb-ts">' + sub + '</span><span class="hb-sig"><em>How Databook sees it</em>' + signal + chips + '</span></button>';
}
function decisionCard(a, n, lead, why, ask) {
  const st = aStatus(a.id), cro = S.role === 'cro', unit = { bookings: 'new sales', retention: 'renewals kept' }[a.kind] || '';
  const state = st === 'Approved' ? '<span class="appr ok">Approved</span>' : st === 'Rejected' ? '<span class="appr bad">Deferred</span>' : st === 'Evidence' ? '<span class="appr">Evidence requested</span>' : '';
  const btns = !cro ? '<span class="appr">Waiting for the CRO</span>' : (st === 'Approved' ? '<button class="btn sm red" data-act="hb-lead" data-id="' + a.id + '">Guide the seller</button><button class="btn sm ghost" data-act="hb-undo" data-id="' + a.id + '">Undo</button>' : st === 'Rejected' || st === 'Evidence' ? '<button class="btn sm ghost" data-act="hb-undo" data-id="' + a.id + '">Reopen</button>' : '<button class="btn red sm" data-act="mv-set" data-id="' + a.id + '" data-v="Approved">Approve</button><button class="btn sm" data-act="mv-set" data-id="' + a.id + '" data-v="Rejected">Defer</button><button class="btn sm ghost" data-act="hb-evid" data-id="' + a.id + '">Evidence</button>');
  return '<article class="hb-d' + (st !== 'Pending' ? ' set' : '') + '"><div class="hb-dh"><span class="hb-dn">' + n + '</span><b>' + esc(hb(a)) + '</b></div><div class="hb-di"><b class="num">' + (a.modeled == null ? '' : '+' + fm(a.modeled, 1)) + '</b><span>' + unit + ' · estimate</span></div><p class="hb-ask"><b>You approve</b>' + ask + '</p><p class="hb-dw">' + why + '</p><div class="hb-dm"><span>' + (lead ? '<button class="linkbtn" data-act="hb-acct" data-id="' + lead.id + '">Start with ' + esc(lead.name) + '</button>' : '') + '</span><span>' + esc(shortOwner(a.owner)) + ' · due ' + dateFmt(a.due) + '</span><span class="cf ' + a.conf + '">' + a.conf + ' confidence</span></div><div class="hb-da">' + state + btns + '</div></article>';
}
const HBT = { reframe: 'Reframe the Contact Center pitch', rescue: 'Save the slipping renewals', sponsor: 'Get a senior leader on the other deals' };
const hb = (a) => (HBT[a.id] || hMove(a).title(a)) + ' · ' + (a.title.match(/\d+/) || [''])[0] + (a.id === 'rescue' ? ' renewals' : ' deals');
function decisionsHTML(F) {
  const re = F.act('reframe'), sp = F.act('sponsor'), rs = F.act('rescue'), ak = F.act('asks'), W = winLoss(F), leadOf = (a) => (a && a.leadId ? GAID[a.leadId] : null), r0 = W.rows[0], cards = [];
  if (re) cards.push(decisionCard(re, 1, leadOf(re), 'Contact Center wins ' + pc(W.ccWin, 0) + '. ' + F.openW.filter((o) => o.product_line === 'Contact Center' && nmd(o)).length + ' deals name a rival.', 'Sellers open ' + (re.title.match(/\d+/) || [''])[0] + ' Contact Center pitches with the customer\'s own goal and a business case, not a feature swap. Product marketing supplies proof.'));
  if (rs) cards.push(decisionCard(rs, 2, leadOf(rs), F.risky.filter((a) => a.trend < -0.03 && a.execShare < 0.2).length + ' of ' + F.risky.length + ' show falling use and no executive. First renewal in ' + Math.min.apply(null, F.risky.map((a) => a.renewalDays)) + ' days.', 'An executive check-in and a 30-day adoption plan on each of ' + (rs.title.match(/\d+/) || [''])[0] + ' renewals, started before any quote goes out. Customer success leads, the seller joins.'));
  if (sp) cards.push(decisionCard(sp, 3, leadOf(sp), 'With a senior leader deals win ' + pc(r0.wb, 0) + '. Without, ' + pc(r0.wa, 0) + '.', 'Each seller asks their champion this week for an introduction to a senior leader at the customer, on ' + (sp.title.match(/\d+/) || [''])[0] + ' deals.'));
  const pending = ['reframe', 'rescue', 'sponsor'].filter((id) => aStatus(id) === 'Pending' || aStatus(id) === 'Evidence').length;
  return '<section id="decisions"><div class="sec-h"><div><h3>Three decisions</h3></div><span class="muted">' + (pending ? pending + ' waiting for you' : 'All decided') + '</span></div><div class="hb-ds">' + cards.join('') + '</div>' + (ak ? '<div class="card flush hb-q">' + moveRow(ak, 3) + '</div>' : '') + '</section>';
}
function focusHTML(F) {
  const rows = focusTop(F, HB.top), seg = '<div class="seg light-seg" role="group" aria-label="How many accounts">' + [5, 10].map((n) => '<button data-act="hb-top" data-n="' + n + '" aria-pressed="' + (HB.top === n) + '">Top ' + n + '</button>').join('') + '</div>';
  const tr = rows.map((c, i) => { const s = rowStatus(c); return '<tr class="click" data-act="hb-acct" data-id="' + c.a.id + '"><td class="hb-n">' + (i + 1) + '</td><td><b>' + esc(c.a.name) + '</b><div class="sub">' + esc(c.a.region) + ' · ' + esc(c.a.industry) + '</div>' + (decisionNo(c.a.id) ? '<div class="hb-dtag">Decision ' + decisionNo(c.a.id) + ' starts here</div>' : '') + '</td><td class="hb-why"><span class="pill ' + TYPE_PILL[c.type] + '">' + TYPE_LBL[c.type] + '</span> <b class="num">' + fm(c.dollars, 1) + '</b> <div>' + esc(c.why) + '</div></td><td class="hb-mv">' + esc(moveText(c)) + '<div class="sub">' + esc(ownerOf(c)) + ' · ' + whenOf(c) + '</div></td><td><span class="gx-chip ' + s[1] + '">' + s[0] + '</span></td></tr>'; }).join('');
  return '<section id="focus"><div class="sec-h"><div><h3>Where to spend your time</h3></div>' + seg + '</div><div class="card flush"><div class="tbl-wrap"><table class="hb-tbl"><thead><tr><th></th><th>Account</th><th>Why</th><th>Next move</th><th>Status</th></tr></thead><tbody>' + tr + '</tbody></table></div></div><p class="foot-note">Ranked by money at stake and how soon it is decided. Decisions 1 and 2 start with the first two accounts marked.</p></section>';
}
function funnelCard(F) {
  const ST = ['Discovery', 'Validate', 'Proposal', 'Negotiation', 'Contracting'], W = winLoss(F), rows = ST.map((st) => { const d = F.open.filter((o) => o.stage === st); return { st, n: d.length, amt: sum(d, (o) => o.amount), nsp: d.filter((o) => !+o.exec_sponsor).length, rv: d.filter(nmd).length, fc: d.filter((o) => +o.contacts_engaged < 3).length }; }), mx = Math.max.apply(null, rows.map((r) => r.amt)) || 1;
  const won = F.closed.filter((o) => o.won), flag = (n, tot) => '<td class="r num' + (tot && n / tot >= 0.5 ? ' hb-hot' : '') + '">' + n + '</td>';
  return '<div class="card flush"><div class="hd" style="padding:16px 18px 0"><div><span class="kicker">The sales funnel today</span><h3>Where open deals sit, and where they are weak</h3></div><span class="hd-r">' + srcs('sf', 'gong') + '</span></div><div class="tbl-wrap"><table class="hb-tbl hb-fun"><thead><tr><th>Stage</th><th>Open deals</th><th class="r">Deals</th><th class="r">No senior leader<small>wins ' + pc(W.rows[0].wa, 0) + ' vs ' + pc(W.rows[0].wb, 0) + '</small></th><th class="r">Rival named<small>wins ' + pc(W.rows[2].wa, 0) + ' vs ' + pc(W.rows[2].wb, 0) + '</small></th><th class="r">Under 3 contacts<small>wins ' + pc(W.rows[1].wa, 0) + ' vs ' + pc(W.rows[1].wb, 0) + '</small></th></tr></thead><tbody>' + rows.map((r) => '<tr><td><b>' + r.st + '</b></td><td><div class="bar-cell"><div class="mini" style="height:12px;flex:1"><i style="width:' + (r.amt / mx) * 100 + '%;background:var(--ink)"></i></div><span class="num" style="min-width:56px;text-align:right">' + fm(r.amt, 1) + '</span></div></td><td class="r num">' + r.n + '</td>' + flag(r.nsp, r.n) + flag(r.rv, r.n) + flag(r.fc, r.n) + '</tr>').join('') + '<tr class="tot"><td><b>Closed</b></td><td colspan="2"><b class="num">' + pc(wrate(F.closed), 0) + '</b> won <span class="sub">(' + won.length + ' of ' + F.closed.length + ' over six quarters)</span></td><td colspan="3" class="r"><span class="sub">Contact Center wins ' + pc(W.ccWin, 0) + '</span></td></tr></tbody></table></div></div>';
}
function brandHTML(F) {
  const W = winLoss(F), P = positioning(F), mx = W.rivals.length ? W.rivals[0][1] : 1;
  const lost = '<div class="card"><div class="hd"><h3>Lost to</h3><span class="meta">' + fm(W.totalLost, 0) + ' in 4 quarters</span></div>' + W.rivals.slice(0, 5).map((x) => '<div class="hbar"><span class="hn">' + esc(x[0]) + '</span><div class="mini" style="height:10px"><i style="width:' + (x[1] / mx) * 100 + '%;background:var(--bad)"></i></div><span class="hv num">' + fm(x[1], 1) + '</span></div>').join('') + '</div>';
  return '<section id="brand"><div class="sec-h"><div><h3>Is the Zoom story landing with buyers?</h3></div></div>' + (PREFS.positioning ? posCard(P) : '') + (PREFS.winloss ? '<div class="hb-fl">' + funnelCard(F) + lost + '</div>' : '') + '</section>';
}
function posCard(P) {
  return '<div class="card hb-pos"><div class="hb-ps"><div><b class="num">' + pc(P.ex, 0) + '</b><span>of customer calls have an executive on them</span></div><div><b class="num">' + P.attach + ' of ' + P.n + '</b><span>accounts use Zoom Contact Center or AI</span></div><div><b class="num">' + P.asksN + ' customers</b><span>asked for a Zoom product nobody is selling them yet, worth about ' + fm(P.asksAmt, 1) + '</span></div></div><div class="hb-mf">' + srcs('gong', 'sf') + '</div></div>';
}
function roiHTML() {
  const m = moneyFacts(), mx = m.chans[0] ? m.chans[0].roi : 1, best = m.chans[0];
  const spend = '<div class="card hb-m"><div class="hd"><div><span class="kicker">Spend by channel</span><h3>$' + nf(m.roi, 1) + ' made for every $1 spent</h3></div></div>' + m.chans.map((x) => '<div class="hbar"><span class="hn">' + esc(x.c) + '<small>' + fm(x.spend, 1) + ' spent, ' + fm(x.book, 1) + ' made</small></span><div class="mini" style="height:10px"><i style="width:' + (x.roi / mx) * 100 + '%;background:var(--data)"></i></div><span class="hv num">$' + nf(x.roi, 1) + '</span></div>').join('') + '<p class="sub">' + fm(m.spend, 1) + ' spent, ' + fm(m.book, 1) + ' made over five quarters. Next dollar: ' + esc(best.c) + '.</p><div class="hb-mf">' + evc('v') + srcs('sf') + '</div></div>';
  const hires = '<div class="card hb-m"><div class="hd"><div><span class="kicker">Sellers hired last year</span><h3>' + plural(m.hired.length, 'seller') + ' made ' + fm(m.hiredWon, 1) + ' so far</h3></div></div><div class="hb-k"><div><b class="num">' + nf(m.ramp, 1) + ' months</b><span>to their first win</span></div><div><b class="num">' + fm(m.hiredPer, 1) + '</b><span>made per new hire</span></div><div><b class="num">' + fm(m.tenPer, 1) + '</b><span>made per tenured seller</span></div></div><div class="hb-mf">' + evc('v') + srcs('sf') + '<button class="linkbtn" data-act="hb-go" data-t="sellers">All sellers</button></div></div>';
  return '<section id="roi"><div class="sec-h"><div><h3>Dollars made against dollars spent</h3></div></div><div class="hb-ms2">' + spend + hires + '</div></section>';
}
function sellersHTML() {
  const m = moneyFacts(), mxs = m.top[0] ? m.top[0].ytd : 1, c = loopCounts(), ae = M.aeRows, pilot = ae.filter((r) => +r.pilot_flag).length;
  const top = '<div class="card hb-m"><div class="hd"><div><span class="kicker">Top sellers</span><h3>' + fm(sum(m.t3, (r) => r.ytd), 1) + ' of ' + fm(m.totalWon, 1) + ' made by three sellers</h3></div></div>' + m.top.map((r) => '<div class="hbar"><span class="hn">' + esc(r.name) + (+r.pilot_flag ? ' ◆' : '') + '</span><div class="mini" style="height:10px"><i style="width:' + (r.ytd / mxs) * 100 + '%;background:var(--red)"></i></div><span class="hv num">' + fm(r.ytd, 1) + '</span></div>').join('') + '<p class="sub">What sets them apart: 3+ customer contacts on ' + pc(m.topC3, 0) + ' of deals, others ' + pc(m.restC3, 0) + '. ◆ = using Databook.</p><div class="hb-mf">' + evc('i') + srcs('sf', 'gong') + '<button class="linkbtn" data-act="hb-go" data-t="costudio">Copy it as a coach</button></div></div>';
  const adopt = '<div class="card hb-m"><div class="hd"><div><span class="kicker">Adoption comes first, revenue follows</span><h3>' + pilot + ' of ' + ae.length + ' sellers using Databook</h3></div></div><div class="hb-k"><div><b class="num">' + c[0][1] + '</b><span>plays approved</span></div><div><b class="num">' + c[2][1] + '</b><span>finished by sellers</span></div><div><b class="num">' + c[6][1] + '</b><span>buyers agreed a next step</span></div></div><p class="sub">Revenue is not claimed until it shows, about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days later.</p><div class="hb-mf"><button class="linkbtn" data-act="tab" data-t="uplift">Uplift and adoption</button></div></div>';
  return '<section id="sellers"><div class="sec-h"><div><h3>Who makes the money, and who is using the system</h3></div></div><div class="hb-ms2">' + top + (PREFS.proof ? adopt : '') + '</div></section>';
}
const anchorAcc = () => gByName(ANCHOR) || GA[0], anchorId = () => anchorAcc().id;
function regionsHTML(F) {
  const R = M.matrix.region, rows = R.map((r) => { const b = M.bridge[r.label], o = hOverall(r), w = (o.k ? r[o.k] : r.fcst); return '<button class="hb-r ' + stDot(o.st) + '" ' + hdrill(r, o.k) + '><span class="hb-rn">' + dot(stDot(o.st)) + '<b>' + esc(r.label) + '</b></span><span class="num">' + fm(b.landing, 1) + '</span><span class="sub">target ' + fm(b.plan, 1) + '</span><span class="hb-rt">' + esc(reasonPhrase(o.k, w)) + '</span><span class="rs">' + RWORD[o.st] + '</span></button>'; }).join('');
  return '<section id="regions"><div class="sec-h"><h3>By region</h3><span class="muted"><span class="lgd">' + gdot('ok') + 'On track</span><span class="lgd">' + gdot('warn') + 'Watch</span><span class="lgd">' + gdot('bad') + 'Act now</span></span></div><div class="card flush">' + rows + '</div></section>';
}
function stepStrip10() {
  const st = (n, name, to) => '<button class="stp c' + n + '" data-act="scrollto" data-to="box' + n + '"><span class="stn">' + n + '</span><span class="stt"><b>' + name + '</b></span></button>';
  return '<div class="hb-navrow"><nav class="steps" aria-label="Sections of the CRO Hub">' + st(1, 'Top line and decisions') + (PREFS.b2 ? st(2, 'Key accounts') : '') + (PREFS.b3 ? st(3, 'Return on spend') : '') + (PREFS.b4 ? st(4, 'Product and brand') : '') + (PREFS.b5 ? st(5, 'Sellers and adoption') : '') + '</nav><button class="btn sm hb-cust" data-act="hb-custom">Customize this view</button></div>';
}
function viewCommand() {
  const F = hubFacts(), B = F.B, row = F.row, gap = B.plan - B.landing, re = F.act('reframe'), sp = F.act('sponsor'), rs = F.act('rescue');
  const book = (re ? re.modeled : 0) + (sp ? sp.modeled : 0), prot = rs ? rs.modeled : 0, all = S.region === 'All', past = B.landing + book - B.plan, P0 = positioning(F);
  const atRisk = sum(F.risky, (a) => a.arrAtRisk), falling = F.risky.filter((a) => a.trend < -0.03 && a.execShare < 0.2).length;
  const sentence = 'Forecast ' + fm(B.landing, 1) + '. <span class="h2s">Target ' + fm(B.plan, 1) + (all ? '. Two decisions take it to ' + fm(B.landing + book, 1) + '.' : '.') + '</span>';
  const t1 = tileHTML('plan', 'Forecast vs actual', fm(B.landing, 1), 'closed so far ' + fm(B.closed, 1) + ' · target ' + fm(B.plan, 1), worstOf(row.perf.status, row.fcst.status), 'Open deals ' + fm(F.aiW, 1) + ' · new deals ' + fm(B.creation, 1), srcs('sf', 'gong'));
  const t2 = tileHTML('risk', 'Renewals at risk', fm(atRisk, 1), plural(F.risky.length, 'renewal'), row.ret.status, falling + ' of ' + F.risky.length + ' · use falling, no executive', srcs('graf', 'gong', 'out'));
  const t3 = tileHTML('rival', 'Win rate vs a rival', pc(F.C.winRateNamed, 0), pc(F.C.winRateClear, 0) + ' with none named', row.comp.status, plural(F.C.openNamed.length, 'open deal') + ' name a rival', srcs('sf', 'gong', 'out'));
  const t4 = tileHTML('upside', 'Beyond target', (past >= 0 ? '+' : '-') + fm(Math.abs(past), 1), fm(B.landing + book, 1) + ' with 2 decisions', past >= 0 ? 'ok' : 'warn', plural(P0.asksN, 'customer') + ' asked for a product, no deal yet', srcs('sf', 'gong', 'out'));
  const box = (n, title, html) => '<div class="hb-box c' + n + '" id="box' + n + '"><div class="hb-bh"><span class="hb-bn">' + n + '</span>' + title + '</div>' + html + '</div>';
  return filterBar() + stepStrip10() +
    box(1, 'Top line and the decisions behind it', '<section class="answer" id="ans"><span class="kicker">AI sales transformation · ' + M.curQ + ' · ' + M.cur.daysLeft + ' days left' + (all ? '' : ' · ' + esc(S.region)) + '</span><h2>' + sentence + '</h2><div class="hb-tiles">' + t1 + t2 + t3 + t4 + '</div><p class="hb-hint">Tap a number to see why.</p></section>' + decisionsHTML(F) + bridgeHTML(F) + (PREFS.regions ? regionsHTML(F) : '')) +
    (PREFS.b2 ? box(2, 'Key accounts to pay attention to', focusHTML(F)) : '') +
    (PREFS.b3 ? box(3, 'Return on spend', roiHTML()) : '') +
    (PREFS.b4 && (PREFS.positioning || PREFS.winloss) ? box(4, 'Zoom product and brand positioning', brandHTML(F)) : '') +
    (PREFS.b5 ? box(5, 'Sellers and adoption', sellersHTML()) : '') +
    '<p class="foot-note">Prototype. Synthetic data. Not connected to Zoom or to Databook systems. Zoom\'s reported revenue and guidance are the only real figures.</p>' + provStrip(['m_fcst', 'bridge', 'm_comp']);
}

// ----- evidence panel: how Databook sees each Hub number -----
function evBlock(h, body, labels) { return '<div class="mv-blk"><h4>' + h + (labels ? ' ' + labels : '') + '</h4>' + body + '</div>'; }
function hbEvidence(k) {
  if (k === 'custom') return '<div class="panel-hd"><div><span class="kicker">Changes show on the Hub straight away</span><h3>Customize your CRO Hub</h3></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="panel-bd">' + prefControls() + '</div>';
  const F = hubFacts(), B = F.B, W = winLoss(F);
  let title = '', kick = '', body = '', go = '';
  if (k === 'plan') {
    const noSp = F.openW.filter((o) => !+o.exec_sponsor), rv = F.openW.filter(nmd), stale = F.openW.filter((o) => o.stale);
    title = 'Forecast vs actual'; kick = 'The whole year';
    body = evBlock('What the forecast is made of', '<table class="hb-ev"><tbody><tr><td>Closed so far this year</td><td class="r num">' + fm(B.closed, 1) + '</td><td>' + evc('v') + srcs('sf') + '</td></tr><tr><td>Open deals, Databook\'s view</td><td class="r num">' + fm(B.weighted, 1) + '</td><td>' + evc('i') + srcs('sf', 'gong') + '</td></tr><tr><td>New deals expected to be won</td><td class="r num">' + fm(B.creation, 1) + '</td><td>' + evc('n') + '</td></tr><tr class="tot"><td><b>Forecast for the year</b></td><td class="r num"><b>' + fm(B.landing, 1) + '</b></td><td></td></tr></tbody></table>') +
      evBlock('Where Databook differs from the sales team', '<p>The sales team expects ' + fm(F.repW, 1) + ' from the ' + F.openW.length + ' open deals this and next quarter. Databook expects ' + fm(F.aiW, 1) + ': it marks down ' + fm(F.down, 1) + ' on ' + plural(F.nDown, 'deal') + ' where the signals are weak, and marks up ' + fm(F.up, 1) + ' on ' + plural(F.nUp, 'deal') + ' where engagement is strong. Across the open deals:</p><ul class="hb-ul"><li><b>' + noSp.length + '</b> have no senior customer leader (Salesforce)</li><li><b>' + rv.length + '</b> name a rival (Salesforce, Gong)</li><li><b>' + stale.length + '</b> have gone quiet (Salesforce activity dates)</li></ul>', evc('i')) +
      evBlock('Assumption to validate', '<p>New deals are assumed at ' + pc(M.lv.q4_in_quarter_creation_share, 0) + ' of next quarter\'s target. You can change it in the Workspace.</p>', evc('n'));
    go = '<button class="btn" data-act="hb-go" data-t="forecast">Open the forecast</button>';
  } else if (k === 'risk') {
    title = 'Renewal revenue at risk'; kick = F.risky.length + ' renewals inside 270 days, health below the line';
    body = evBlock('The accounts, and the signals that flagged them', '<div class="tbl-wrap"><table class="hb-ev"><tbody>' + F.risky.slice(0, 6).map((a) => '<tr class="click" data-act="hb-acct" data-id="' + a.account_id + '"><td><b>' + esc(a.account_name) + '</b><div class="sub">' + a.renewalDays + ' days to renewal</div></td><td class="r num">' + fm(a.arrAtRisk, 1) + '</td><td>' + esc(ucf(reasonOf(a))) + (outsideTrigger(a.account_id) ? '<div class="sub">Outside data: leadership or vendor change</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>', evc('v') + srcs('graf', 'gong', 'sf', 'out')) +
      evBlock('The rule', '<p>An account is at risk when it renews inside 270 days and its health score is below ' + M.cfg.healthCut + '. Health combines seat activation (Grafana), executive presence and sentiment on calls (Gong), onboarding progress (monday.com) and commercial signals (Salesforce). Outside data adds leadership and vendor changes, which can pull a renewal forward before usage shows it.</p>', evc('i')) +
      evBlock('What the CRO can do', '<p>Approve decision 2 to run executive check-ins and adoption sprints before the quote goes out. The save rate is an assumption (' + pc(M.lv.renewal_rescue_save_rate, 0) + ').</p>');
    go = '<button class="btn" data-act="hb-go" data-t="accounts">See every account</button>';
  } else if (k === 'rival') {
    const C = F.C, rv = C.openNamed.slice().sort((x, y) => y.amount - x.amount).slice(0, 5);
    title = 'Win rate against a named rival'; kick = 'Decided deals over six quarters';
    body = evBlock('What the records say', '<p>When a rival is named we win ' + pc(C.winRateNamed, 0) + ' of decided deals; when none is named we win ' + pc(C.winRateClear, 0) + '. ' + plural(C.openNamed.length, 'open deal') + ' (' + fm(sum(C.openNamed, (o) => o.amount), 1) + ') name a rival today. A mention is not a loss, so exposure is shown without a dollar claim.</p>', evc('v') + srcs('sf', 'gong')) +
      evBlock('Largest open deals naming a rival', '<table class="hb-ev"><tbody>' + rv.map((o) => '<tr class="click" data-act="hb-acct" data-id="' + o.account_id + '"><td><b>' + esc(o.account.account_name) + '</b><div class="sub">' + o.product_line + ' · ' + o.stage + '</div></td><td class="r num">' + fm(o.amount, 1) + '</td><td>' + esc(o.competitor) + '<div class="sub">closes ' + dateFmt(o.close_date) + '</div></td></tr>').join('') + '</tbody></table>') +
      evBlock('Outside signal', '<p>Licensed technographics and job postings show where a rival platform is already in use (for example a contact center vendor or a Cisco Webex migration). They can reach Databook before a rep records the rival in Salesforce.</p>', evc('i') + srcs('out'));
    go = '<button class="btn" data-act="hb-go" data-t="compete">Open rival exposure</button>';
  } else {
    const rows = [['reframe', 'Reframe the Contact Center pitch'], ['sponsor', 'Senior customer leader on the other open deals'], ['asks', 'Open the expansion deals customers asked for'], ['rescue', 'Save the slipping renewals']].map(([id, t]) => [t, F.act(id)]).filter((x) => x[1]);
    title = 'What the decisions are worth'; kick = 'A ledger, not a forecast: modeled, not measured';
    body = evBlock('Ledger', '<table class="hb-ev"><thead><tr><th>Decision</th><th class="r">Modeled</th><th>Kind</th><th>Basis</th><th>Confidence</th></tr></thead><tbody>' + rows.map((r) => '<tr><td>' + esc(r[0]) + '</td><td class="r num"><b>+' + fm(r[1].modeled, 1) + '</b></td><td>' + (r[1].kind === 'bookings' ? 'New sales' : 'Renewals kept') + '</td><td>' + esc(r[1].basis) + '</td><td>' + r[1].conf + '</td></tr>').join('') + '</tbody></table>', evc('n')) +
      evBlock('Reading it', '<p>New sales and renewals kept are different measures, so they are never added together. Every line is deals the signals call fixable times an assumed success rate. None of it counts as revenue until it appears in closed deals, about ' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days later. Pricing at Databook is outcome-based, so what Zoom pays follows what is measured against the CFO\'s target.</p>');
    go = '<button class="btn" data-act="tab" data-t="prove">See how it is proven</button>';
  }
  return '<div class="panel-hd"><div><span class="kicker">How Databook sees it · ' + kick + '</span><h3>' + title + '</h3></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="panel-bd">' + body + '<div class="mv-act">' + go + '</div></div>';
}

// ----- events -----
function syncPlays() { GPLAYS.forEach((p) => { if (!p.decision) return; const st = aStatus(p.decision), s = gps(p.id); if (st === 'Approved' && !s.auth) s.auth = true; else if (st !== 'Approved' && s.auth && !s.steps.some(Boolean)) s.auth = false; }); gSavePlays(); }
function resetPlay(p) { const s = gps(p.id), a = gByName(p.account); s.auth = false; s.steps = [false, false, false, false]; s.buyer = false; if (a) { delete desk.coach.auth[a.id]; desk.coach.sessions = desk.coach.sessions.filter((x) => x.account !== a.id); } }
function undoDecision(id) {
  delete desk.actionStatus[id]; GPLAYS.filter((p) => p.decision === id).forEach(resetPlay); saveDesk(); gSavePlays();
  audit('Reopened decision: ' + ((M.actions.find((x) => x.id === id) || {}).title || id)); toast('Undone. The decision is open again.');
}
function openAccount(id) { S.account = id; S.sub.accounts = 'view'; S.move = null; HB.ev = null; setTab('accounts'); }
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act^="hb-"]'); if (!t) return; const a = t.dataset.act, d = t.dataset;
  if (a === 'hb-ev') { HB.ev = d.k; S.move = null; renderOverlay(); }
  else if (a === 'hb-acct') openAccount(d.id);
  else if (a === 'hb-top') { HB.top = +d.n; renderView(); }
  else if (a === 'hb-undo') { undoDecision(d.id); renderView(); renderOverlay(); }
  else if (a === 'hb-custom') { HB.ev = 'custom'; S.move = null; renderOverlay(); }
  else if (a === 'hb-evid') { desk.actionStatus[d.id] = 'Evidence'; saveDesk(); audit('Asked for more evidence on: ' + ((M.actions.find((x) => x.id === d.id) || {}).title || d.id)); toast('Evidence requested from the account team (simulated). The decision stays open.'); syncPlays(); renderView(); }
  else if (a === 'hb-lead') { const act = M.actions.find((x) => x.id === d.id), lead = act && act.leadId ? GAID[act.leadId] : null, p = lead ? playOf(lead) : null; if (p) gGotoPlay(p.id); else setTab('guided'); }
  else if (a === 'hb-go') { HB.ev = null; if (d.s) S.sub[d.t] = d.s; setTab(d.t); }
});
document.addEventListener('click', (e) => { const t = e.target.closest('[data-act="mv-set"],[data-act="aset"]'); if (t) setTimeout(() => { syncPlays(); renderView(); }, 0); });
// what a play is about, in dollars, for the line under its title
function playStake(p, a) {
  const z = M.acc[a.id]; if (p.decision === 'rescue' && z && z.arrAtRisk > 0) return fm(z.arrAtRisk, 1) + ' renewal at risk';
  const ow = M.open.filter((o) => o.account_id === a.id); return fm(sum(ow, (o) => o.amount), 1) + ' open pipeline';
}

function proofStrip() {
  const c = loopCounts(), ae = M.aeRows, pilot = ae.filter((r) => +r.pilot_flag).length;
  return '<section id="prove"><div class="sec-h"><div><span class="kicker">Step 5 · Prove</span><h3>Adoption comes first, revenue follows</h3></div><button class="linkbtn" data-act="tab" data-t="uplift">Uplift and adoption</button></div><div class="card hb-proof"><div><b class="num">' + pilot + ' of ' + ae.length + '</b><span>sellers using Databook</span></div>' + [['Approved', c[0][1]], ['Completed', c[2][1]], ['Accepted', c[5][1]], ['Buyer step', c[6][1]]].map((x) => '<div><b class="num">' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '<div class="pend"><b>Not yet</b><span>Revenue, ~' + nf(mean(M.lag.cycleByProduct.map((x) => x.v)), 0) + ' days</span></div></div></section>';
}
// beyond plan: the forecast, what the decisions add, and what customers have asked for that no plan counts
function bridgeHTML(F) {
  if (S.region !== 'All') return '';
  const B = F.B, re = F.act('reframe'), sp = F.act('sponsor'), ak = F.act('asks'), a1 = re ? re.modeled : 0, a2 = sp ? sp.modeled : 0, a3 = ak ? ak.modeled : 0, withD = B.landing + a1 + a2, past = withD - B.plan, lo = Math.floor((Math.min(B.landing, B.plan) * 0.9) / 5) * 5, max = Math.max(withD + a3, B.plan) * 1.02, rng = max - lo;
  const seg = (start, len, c, n, extra) => '<i data-tip="<b>' + n + '</b><br>' + fm(len, 1) + '" style="left:' + ((start - lo) / rng) * 100 + '%;width:' + Math.max(0, (len / rng) * 100) + '%;background:' + c + (extra || '') + '"></i>';
  const P = positioning(F);
  return '<div class="card hb-br"><div class="hd"><div><span class="kicker">Beyond target</span><h3>' + (past >= 0 ? fm(past, 1) + ' past target' : fm(-past, 1) + ' short of target') + ' with the decisions</h3></div></div><div class="stack" style="height:24px">' + seg(lo, B.landing - lo, 'var(--ink)', 'Forecast', '') + seg(B.landing, a1, 'var(--ok)', 'Reframe the Contact Center pitch') + seg(B.landing + a1, a2, 'color-mix(in srgb, var(--ok) 65%, #fff)', 'Senior leader on the other deals') + seg(withD, a3, 'var(--data)', 'Expansion customers asked for (low confidence)', ';opacity:.7') + '<span class="tgt" style="left:' + ((B.plan - lo) / rng) * 100 + '%"></span></div><div class="legend" style="margin-top:8px"><span><i style="background:var(--ink)"></i>Forecast ' + fm(B.landing, 1) + '</span><span><i style="background:var(--ok)"></i>2 decisions +' + fm(a1 + a2, 1) + '</span><span><i style="background:var(--data);opacity:.7"></i>Customer requests, est. +' + fm(a3, 1) + '</span><span><i style="background:var(--ink);width:3px;height:12px;border-radius:0"></i>Target ' + fm(B.plan, 1) + '</span><span class="sub">Starts at ' + fm(lo, 0) + '</span></div></div>';
}

// short owner and short reasons, so the Hub reads at a glance
const shortOwner = (t) => String(t || '').split(/ with | led by |, led/)[0];
function shortWhy(z) {
  const p = [z.trend < -0.03 ? 'Use falling' : null, z.execShare < 0.2 ? 'No executive' : null, z.delivery < 50 ? 'Onboarding behind' : null, z.competitors && z.competitors.length ? z.competitors[0] + ' named' : null].filter(Boolean);
  return (p.length ? p.join(' · ') : 'Health ' + z.health) + ' · renews in ' + z.renewalDays + ' days';
}
