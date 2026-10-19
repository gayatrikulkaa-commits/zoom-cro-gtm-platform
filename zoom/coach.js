// Executive Expansion Coach: a deterministic prototype. Scripted questions, branches and templates; no live model.
// The coach is driven by a versioned configuration, so a change made in the Coach Studio changes what the coach asks and recommends.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.ZC = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const clone = (x) => JSON.parse(JSON.stringify(x));
const money = (x) => '$' + Math.round(x).toLocaleString('en-US');

const BASE = {
  name: 'Executive Expansion Coach', version: 'v1.0', status: 'Active',
  objective: 'Prepare a seller for an executive conversation about expanding into a product the customer has not bought',
  context: ['Account facts from the CRM', 'Topics raised on recent calls', 'Product usage', 'Open deals and contacts'],
  research: ['Summarize usage and account health', 'List topics raised on recent calls', 'Find executive-level contacts and their last touch', 'List open deals for the product'],
  questions: [
    { id: 'sponsor', text: 'Is there an executive sponsor at the customer for this expansion?', type: 'yn', required: true },
    { id: 'priority', text: 'Has the buyer named this as a priority this year?', type: 'yn', required: false },
    { id: 'nextstep', text: 'Is a dated next step already agreed?', type: 'yn', required: false },
  ],
  branches: ['No sponsor: secure a sponsor before proposing anything', 'Sponsor confirmed: build a value hypothesis in words', 'Figures appear only if the buyer supplies them'],
  guardrails: ['Label every statement as confirmed, assumed or missing', 'Customer-facing material never includes internal notes'],
  output: ['Internal seller brief', 'Customer-facing executive deck (draft)'],
  approval: 'The seller reviews and approves both assets before use. Nothing is sent automatically.',
  flags: { requireBaseline: false },
};

// ---- the simulated Composer: three example instructions are understood; anything else is declined honestly ----
const PATTERNS = [
  { id: 'cc_baseline', test: (t) => /contact\s*cent/.test(t) && /(baseline|service[- ]?cost)/.test(t), label: 'Contact Center expansion with a service-cost baseline',
    apply: (c) => { c.objective = 'Prepare a Contact Center expansion conversation with an executive buyer'; c.research.push('Pull Contact Center topics and licensed-agent usage'); c.questions.push({ id: 'baseline', text: 'Has the buyer confirmed their current service-cost baseline: contacts per month and cost per contact?', type: 'baseline', required: true }); c.branches.push('Baseline missing: run discovery and do not create a quantified case', 'Baseline confirmed: draft a business case with the assumptions stated'); c.guardrails.push('No quantified business case until the buyer confirms the service-cost baseline'); c.flags.requireBaseline = true; } },
  { id: 'security', test: (t) => /security/.test(t), label: 'Add a security review check',
    apply: (c) => { c.questions.push({ id: 'security', text: 'Has the buyer\'s security review started?', type: 'yn', required: false }); c.guardrails.push('Flag a security review as a dependency before any proposal'); } },
  { id: 'short', test: (t) => /(fewer|shorter|three questions|shorten)/.test(t), label: 'Shorten the question list',
    apply: (c) => { c.questions = c.questions.filter((q) => q.id !== 'priority' && q.id !== 'nextstep'); } },
];
function compose(text, cfg) {
  const t = String(text || '').toLowerCase(), hit = PATTERNS.filter((p) => p.test(t));
  if (!hit.length) return { ok: false, understood: PATTERNS.map((p) => p.label) };
  const next = clone(cfg), vNum = +cfg.version.slice(1) + 0.1; next.version = 'v' + vNum.toFixed(1); next.status = 'Draft';
  hit.forEach((p) => p.apply(next));
  const changes = [], sec = (name, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ section: name, before: a, after: b }); };
  sec('Objective', cfg.objective, next.objective); sec('Research steps', cfg.research, next.research); sec('Seller questions', cfg.questions.map((q) => q.text), next.questions.map((q) => q.text)); sec('Decision branches', cfg.branches, next.branches); sec('Guardrails', cfg.guardrails, next.guardrails);
  return { ok: true, matched: hit.map((p) => p.label), cfg: next, changes };
}

// ---- the recommendation: answers change the route ----
function recommend(cfg, run, ctx) {
  const a = run.answers || {}, flags = cfg.flags, conf = [], assume = [], miss = [], blocked = [];
  conf.push(ctx.name + ' holds ' + ctx.products.join(', ') + ' (' + ctx.arrTxt + ' yearly revenue)');
  if (ctx.topicCalls) conf.push(ctx.nextProd + ' came up on ' + ctx.topicCalls + ' recent call' + (ctx.topicCalls > 1 ? 's' : '') + ' (customer-raised)');
  if (ctx.execContacts) conf.push(ctx.execContacts + ' executive-level contact' + (ctx.execContacts > 1 ? 's' : '') + ' on file');
  conf.push('No open ' + ctx.nextProd + ' opportunity exists' + (ctx.openDeals ? '' : ' (nothing in the forecast yet)'));
  if (a.sponsor === 'yes') conf.push('An executive sponsor is identified (seller-confirmed)'); else miss.push('Executive sponsor for this expansion');
  if (a.priority === 'yes') conf.push('The buyer named this a priority (seller-confirmed)'); else if (cfg.questions.some((q) => q.id === 'priority')) miss.push('Buyer-stated priority for this year');
  if (a.nextstep !== 'yes' && cfg.questions.some((q) => q.id === 'nextstep')) miss.push('A dated next step');
  assume.push('That ' + ctx.nextProd + ' addresses the topics raised on calls (inferred, not confirmed)');
  assume.push('The size of the opportunity (' + ctx.estTxt + ' yearly revenue) uses a prototype rule of ' + ctx.weightTxt + ' of current yearly revenue');
  let route, title, why = [], steps = [], calc = null;
  const hasBaselineQ = flags.requireBaseline;
  if (hasBaselineQ) {
    if (a.baseline === 'confirmed' && +a.contacts > 0 && +a.cost > 0) { conf.push('Service-cost baseline confirmed by the buyer: ' + Math.round(+a.contacts).toLocaleString('en-US') + ' contacts a month at ' + money(+a.cost) + ' each'); }
    else if (a.baseline === 'estimate') { assume.push('A seller estimate of service cost (not buyer-confirmed, so not usable in a quantified case)'); miss.push('Buyer-confirmed service-cost baseline'); }
    else miss.push('Buyer-confirmed service-cost baseline');
  }
  if (a.sponsor === 'no') {
    route = 'sponsor'; title = 'Secure an executive sponsor first'; why = ['Without a sponsor, a proposal has no one to carry it', 'The customer-facing deck is held back until a sponsor is named']; blocked.push('Customer-facing deck: held until a sponsor is identified'); if (hasBaselineQ) blocked.push('Quantified business case: needs a sponsor and a buyer-confirmed baseline');
    steps = ['Ask the current champion for an introduction to the economic buyer', 'Offer a short executive briefing built from what the customer has told us', 'Revisit this coach once a sponsor is named'];
  } else if (hasBaselineQ && !(a.baseline === 'confirmed' && +a.contacts > 0 && +a.cost > 0)) {
    route = 'discovery'; title = 'Run discovery on the service-cost baseline'; why = ['No buyer-confirmed baseline exists, so no figure can be defended', a.baseline === 'estimate' ? 'A seller estimate stays an assumption and is not shown as a number' : 'ROI is not invented'];
    blocked.push('Quantified business case: blocked until the buyer confirms contacts per month and cost per contact');
    steps = ['Hold a discovery conversation focused on volumes, channels and cost per contact', 'Capture the baseline in the buyer\'s own words, with who provided it', 'Return to this coach with the figures to unlock a business-case draft'];
  } else if (hasBaselineQ) {
    route = 'business_case'; title = 'Draft a business case from the confirmed baseline'; const deflect = a.deflect != null && a.deflect !== '' ? +a.deflect : 10, annual = +a.contacts * 12 * +a.cost, saving = annual * (deflect / 100);
    calc = { contacts: +a.contacts, cost: +a.cost, deflect, annual, saving, payback: saving > 0 ? (ctx.est * 1e6) / (saving / 12) : null };
    why = ['The buyer confirmed the baseline, so a first quantified case is allowed', 'The deflection rate is an assumption and is labelled as one'];
    assume.push(deflect + '% of contacts handled without an agent (assumption, to validate with the buyer)');
    steps = ['Share the draft with the sponsor and test the deflection assumption together', 'Agree who in finance validates the baseline', 'Book a dated working session to scope a pilot'];
  } else {
    route = 'value_hypothesis'; title = 'Build a value hypothesis in words'; why = ['A sponsor is identified, so the conversation can move forward', 'This coach version collects no baseline, so it offers no quantified case'];
    blocked.push('Quantified business case: not offered by this coach version');
    steps = ['Test the hypothesis with the sponsor', 'Ask what the buyer measures today and who owns it', 'Agree a dated next step'];
  }
  return { route, title, why, steps, blocked, confirmed: conf, assumptions: assume, missing: miss, calc };
}

// ---- the two assets, kept apart ----
function assets(cfg, run, ctx, rec) {
  const a = run.answers || {}, L = [];
  L.push('# Internal seller brief: ' + ctx.name, 'INTERNAL. Do not share with the customer.', 'Prepared with coach ' + cfg.version + ' (deterministic prototype). Illustrative data.', '', '## Account context', '- ' + ctx.region + ', ' + ctx.industry + ', ' + ctx.arrTxt + ' yearly revenue, holds ' + ctx.products.join(', '), '- Meeting: ' + run.buyer + ' · objective: ' + run.objective + ' · stage: ' + run.stage, '', '## What is confirmed, assumed and missing');
  rec.confirmed.forEach((x) => L.push('- Confirmed: ' + x)); rec.assumptions.forEach((x) => L.push('- Assumed: ' + x)); rec.missing.forEach((x) => L.push('- Missing: ' + x));
  L.push('', '## Recommended route', '- ' + rec.title); rec.why.forEach((x) => L.push('  - ' + x)); rec.blocked.forEach((x) => L.push('- Blocked: ' + x));
  L.push('', '## Sensitive internal notes', '- Account health ' + ctx.health + ' of 100; renewal in ' + ctx.renewalDays + ' days', ctx.rival ? '- ' + ctx.rival + ' is named in the CRM at this account' : '- No rival named in the CRM', '- Recent discount level on deals here: ' + ctx.discount + '%', '- Forecast treatment: no open ' + ctx.nextProd + ' deal, so none of this is in the forecast');
  L.push('', '## Discovery questions');
  (rec.route === 'business_case' ? ['Who owns the baseline figures, and how were they measured?', 'Which share of contacts could be handled without an agent, and why?', 'What would a pilot need to show to move forward?'] : ['How many customer contacts does the service team handle each month, by channel?', 'What does one contact cost today, including agent time?', 'Who else in the organisation is affected by a change?', 'What would make this a priority for the coming year?']).forEach((x) => L.push('- ' + x));
  L.push('', '## Next actions'); rec.steps.forEach((x, i) => L.push((i + 1) + '. ' + x + ' (owner: account executive)'));
  if (rec.calc) L.push('', '## Business case workings (internal)', '- Annual service cost: ' + money(rec.calc.annual) + ' (' + Math.round(rec.calc.contacts).toLocaleString('en-US') + ' contacts x 12 x ' + money(rec.calc.cost) + ')', '- Assumed deflection ' + rec.calc.deflect + '%: potential saving ' + money(rec.calc.saving) + ' a year', '- Prototype size estimate of the opportunity: ' + ctx.estTxt + ' yearly revenue' + (rec.calc.payback ? '; indicative payback ' + Math.round(rec.calc.payback) + ' months' : ''));
  L.push('', '## Sources', '- Salesforce account and opportunity records, call topics, usage telemetry (all synthetic in this prototype)');
  const brief = L.join('\n');

  let deck;
  if (rec.route === 'sponsor') deck = { allowed: false, reason: 'Held back: no executive sponsor yet. A customer-facing deck should wait until a sponsor is named.', slides: [] };
  else {
    const S_ = [], topics = ctx.customerTopics.length ? ctx.customerTopics.join(', ') : ctx.nextProd;
    S_.push({ title: 'Improving service outcomes at ' + ctx.name, bullets: ['A working session with ' + (run.buyer === 'Economic buyer' ? 'executive leadership' : run.buyer.toLowerCase()), ctx.nextProd + ' and how it could support your priorities'] });
    S_.push({ title: 'What we have heard from you', bullets: ['You have raised: ' + topics.toLowerCase(), 'You use ' + ctx.products.join(', ') + ' today', 'We would like to check that we have this right'] });
    S_.push({ title: 'Where Zoom could help', bullets: [ctx.nextProd + ' alongside what you already use', 'One place for the teams involved, to be scoped with you', 'Features to be confirmed against your needs']});
    if (rec.route === 'business_case' && rec.calc) S_.push({ title: 'A first value hypothesis', bullets: ['Based on figures you shared: ' + Math.round(rec.calc.contacts).toLocaleString('en-US') + ' contacts a month at ' + money(rec.calc.cost) + ' each, about ' + money(rec.calc.annual) + ' a year', 'If ' + rec.calc.deflect + '% of contacts were handled without an agent, the saving could be about ' + money(rec.calc.saving) + ' a year', 'The ' + rec.calc.deflect + '% is an assumption for us to test together'] });
    S_.push({ title: 'Assumptions and open questions', bullets: rec.route === 'business_case' ? ['Your baseline figures are as you provided them', 'The share of contacts handled without an agent is not yet validated', 'Timing and scope depend on your priorities'] : ['We have not yet seen your current service volumes or costs', 'We have made no estimate of savings', 'We would like to learn how you measure service today'] });
    S_.push({ title: 'Proposed next steps', bullets: rec.route === 'business_case' ? ['Validate the baseline with your finance partner', 'Test the assumptions in a working session', 'Agree what a pilot would need to show'] : ['A working session to understand volumes, channels and cost per contact', 'Agree who from your team should join', 'Confirm a date'] });
    deck = { allowed: true, reason: '', slides: S_ };
  }
  return { brief, deck };
}
// the deck must never carry internal material
const BANNED = ['health score', 'health ', 'renewal', 'at risk', 'churn', 'discount', 'forecast', 'quota', 'sentiment', 'crm', 'internal', 'rival', 'competitor', 'teams phone', 'webex', 'genesys', 'five9', 'ringcentral', 'google meet', 'win chance', 'pipeline', 'sponsor'];
const leaks = (slides) => { const t = slides.map((s) => (s.title + ' ' + s.bullets.join(' ')).toLowerCase()).join(' | '); return BANNED.filter((w) => t.includes(w)); };

function toPptx(Pptx, slides, meta) {
  const p = new Pptx(); p.layout = 'LAYOUT_16x9'; p.title = meta.title; p.author = 'Prototype'; p.company = 'Illustrative';
  slides.forEach((s, i) => {
    const sl = p.addSlide(); sl.background = { color: i === 0 ? '161726' : 'FFFFFF' };
    sl.addShape('rect', { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: 'D9391F' } });
    sl.addText(s.title, { x: 0.6, y: i === 0 ? 1.7 : 0.45, w: 8.8, h: i === 0 ? 1.4 : 0.9, fontFace: 'Calibri', fontSize: i === 0 ? 34 : 28, bold: true, color: i === 0 ? 'FFFFFF' : '161726', valign: 'top' });
    sl.addText(s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.7, y: i === 0 ? 3.2 : 1.5, w: 8.6, h: 3.3, fontFace: 'Calibri', fontSize: i === 0 ? 18 : 20, color: i === 0 ? 'E8E6F0' : '2A2A33', valign: 'top', paraSpaceAfter: 10 });
    sl.addText('Draft for seller review · illustrative content from a prototype · ' + (i + 1) + ' / ' + slides.length, { x: 0.6, y: 5.15, w: 8.8, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: i === 0 ? 'B9B6BF' : '6E6B75' });
  });
  return p;
}
return { BASE, PATTERNS, compose, recommend, assets, leaks, BANNED, toPptx, clone };
});
