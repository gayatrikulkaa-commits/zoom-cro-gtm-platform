// ---------- account facts shared by the Accounts screen and the Slack message: what was lost, what is untapped, who to meet ----------
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
