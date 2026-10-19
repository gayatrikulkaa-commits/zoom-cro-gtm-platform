// Proves the Excel file works end to end: read it the way the site does, rebuild the model, then apply each test case by editing the exact
// cells START_HERE names and check the effects match. usage: node roundtrip.js
const fs = require('fs'), path = require('path'), os = require('os');
const XLSX = require('../tools/node_modules/xlsx'), ExcelJS = require('../tools/node_modules/exceljs');
const ZM = require('./model'), ZM2 = require('./model2');
const { snap, effects, D } = require('./cases');
const FILE = path.join(__dirname, '..', 'deliverables', 'Zoom_CRO_Foundation.xlsx'), C = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const NUM_T = ['usd_m', 'number', 'pct', 'score', 'flag'];
const types = {}; D.tables.dictionary.forEach((d) => ((types[d.sheet] = types[d.sheet] || {})[d.field] = d.type));
const coerce = (r, ty) => { const o = {}; Object.keys(r).forEach((k) => { let v = r[k]; const t = ty[k]; if (NUM_T.includes(t) && v !== '' && v != null && !isNaN(+v)) v = +v; else if (v instanceof Date) v = v.toISOString().slice(0, 10); o[k] = v; }); return o; };
function loadT(file) {
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' }), T = {}, errs = [];
  D.order.forEach((name) => {
    const ws = wb.Sheets[name]; if (!ws) { errs.push('missing sheet ' + name); return; }
    const need = D.cols[name] || [], aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), hi = ZM2.findHeader(aoa, need.slice(0, 3));
    const rows = hi < 0 ? [] : XLSX.utils.sheet_to_json(ws, { defval: '', range: hi }), have = rows.length ? Object.keys(rows[0]) : [], miss = need.filter((c) => !have.includes(c));
    if (miss.length) errs.push(name + ' missing ' + miss.join(','));
    T[name] = rows.map((r) => coerce(r, types[name] || {})).filter((r) => Object.keys(r).some((k) => r[k] !== ''));
  });
  return { T, errs };
}
const build = (T) => { const pre = ZM2.prepare(T), M = ZM.buildModel(pre.T, pre.cfg); ZM2.enrich(M, pre.T); return { M, pre }; };
(async () => {
  const base = loadT(FILE); console.log('load errors:', base.errs.length ? base.errs : 'none');
  const a = build(base.T), b = build(D.tables), sa = snap(a.M), sb = snap(b.M);
  const same = JSON.stringify(sa) === JSON.stringify(sb); console.log('workbook rebuilds the same model as data.json:', same, '| what-if notes on a clean file:', a.pre.notes.length);
  if (!same) { const ea = effects(sb, sa); console.log('differences:', ea); }
  let bad = 0;
  for (const c of C.cases) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(FILE);
    c.edits.forEach((e) => {
      const ws = wb.getWorksheet(e.sheet), rows = D.tables[e.sheet], i = rows.findIndex((r) => Object.keys(e.match).every((k) => String(r[k]) === String(e.match[k]))), cols = D.cols[e.sheet], cell = ws.getCell(5 + i, cols.indexOf(e.col) + 1);
      cell.value = e.to;
    });
    const tmp = path.join(os.tmpdir(), 'zoom_case_' + c.id + '.xlsx'); await wb.xlsx.writeFile(tmp);
    const t = loadT(tmp), got = effects(sa, snap(build(t.T).M)), ok = JSON.stringify(got) === JSON.stringify(c.effects);
    console.log('case', String(c.id).padStart(2), ok ? 'OK ' : 'MISMATCH', '(' + got.length + ' effects)'); if (!ok) { bad++; console.log('  expected', c.effects, '\n  got     ', got); }
    fs.unlinkSync(tmp);
  }
  console.log(bad ? bad + ' case(s) failed' : 'all 12 cases reproduce from the Excel cells');
})();
