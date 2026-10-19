// Tests the coach: answers change the route, the Composer changes behaviour, the customer deck stays clean, and the .pptx is a real file.
const ZC = require('./coach'), fs = require('fs'), path = require('path'), os = require('os');
const Pptx = require('../tools/node_modules/pptxgenjs'), JSZip = require('../tools/node_modules/jszip');
const ctx = { name: 'Unilever', region: 'EMEA', industry: 'Consumer goods', arrTxt: '$13.1M', products: ['Workplace', 'Phone'], nextProd: 'Contact Center', topicCalls: 3, execContacts: 2, openDeals: 0, estTxt: '$2.6M', weightTxt: '20%', est: 2.6, health: 74, renewalDays: 288, rival: 'Genesys', discount: 22, customerTopics: ['Contact center', 'Phone migration'] };
const run = (answers) => ({ buyer: 'Economic buyer', objective: 'Validate value', stage: 'Pre-opportunity: discovery', answers });
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const v10 = ZC.BASE, comp = ZC.compose('Adapt this coach for a Contact Center expansion. Ask the seller to confirm the buyer\'s service-cost baseline before creating a quantified business case.', v10), v11 = comp.cfg;
ok(comp.ok && comp.changes.length >= 4 && v11.version === 'v1.1' && v11.flags.requireBaseline, 'Composer proposes v1.1 with ' + comp.changes.map((c) => c.section).join(', '));
ok(!ZC.compose('make it sing', v10).ok, 'Composer declines an instruction it does not understand');
const r = {
  noSponsor: ZC.recommend(v11, run({ sponsor: 'no' }), ctx), none: ZC.recommend(v11, run({ sponsor: 'yes', baseline: 'none' }), ctx), est: ZC.recommend(v11, run({ sponsor: 'yes', baseline: 'estimate' }), ctx),
  confirmed: ZC.recommend(v11, run({ sponsor: 'yes', baseline: 'confirmed', contacts: 40000, cost: 6.5, deflect: 12 }), ctx), v10: ZC.recommend(v10, run({ sponsor: 'yes' }), ctx),
};
ok(r.noSponsor.route === 'sponsor' && r.none.route === 'discovery' && r.est.route === 'discovery' && r.confirmed.route === 'business_case' && r.v10.route === 'value_hypothesis', 'answers change the route: ' + Object.keys(r).map((k) => k + '=' + r[k].route).join(', '));
ok(r.none.blocked.some((x) => /Quantified business case/.test(x)) && !r.none.calc, 'discovery route blocks the quantified case and invents no ROI');
ok(r.confirmed.calc && Math.round(r.confirmed.calc.annual) === 3120000 && Math.round(r.confirmed.calc.saving) === 374400, 'business case arithmetic: ' + Math.round(r.confirmed.calc.annual) + ' / ' + Math.round(r.confirmed.calc.saving));
ok(r.est.assumptions.some((x) => /seller estimate/.test(x)), 'a seller estimate is carried as an assumption, not a fact');
(async () => {
  for (const k of Object.keys(r)) {
    const cfg = k === 'v10' ? v10 : v11, a = ZC.assets(cfg, run({}), ctx, r[k]), lk = ZC.leaks(a.deck.slides);
    ok(lk.length === 0, 'customer deck (' + k + ') has no internal terms' + (lk.length ? ': ' + lk.join(',') : '') + (a.deck.allowed ? ' [' + a.deck.slides.length + ' slides]' : ' [held back]'));
    ok(/INTERNAL/.test(a.brief) && /Sensitive internal notes/.test(a.brief), 'internal brief (' + k + ') is marked internal and holds the sensitive notes');
  }
  const a = ZC.assets(v11, run({}), ctx, r.confirmed), pp = ZC.toPptx(Pptx, a.deck.slides, { title: 'Test' }), buf = await pp.write({ outputType: 'nodebuffer' }), zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)), xml = (await Promise.all(slides.map((f) => zip.files[f].async('string')))).join(' ').toLowerCase();
  ok(buf.length > 20000 && buf[0] === 0x50 && buf[1] === 0x4b && slides.length === a.deck.slides.length, '.pptx is a real zip with ' + slides.length + ' slides (' + buf.length + ' bytes)');
  ok(ZC.BANNED.filter((w) => xml.includes(w)).length === 0, 'the .pptx slide XML contains no internal terms');
  ok(/saving could be about \$374,400/.test(a.deck.slides.map((s) => s.bullets.join(' ')).join(' ')), 'the deck states the saving as a labelled assumption');
  console.log(fail ? fail + ' FAILED' : 'all coach checks pass'); process.exit(fail ? 1 : 0);
})();
