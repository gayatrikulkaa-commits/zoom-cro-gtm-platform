// Builds the styled workbook: answer first (START_HERE), then the four tabs where the key changes are made (yellow cells), then the data tabs.
// usage: node mkxlsx.js  (needs data.json and cases.json; run gen.js then cases.js first)
const fs = require('fs'), path = require('path');
const ExcelJS = require('../tools/node_modules/exceljs');
const ZM2 = require('./model2');
const { SHEETS, SOURCES, FRONT } = require('./schema');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8')), C = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const OUT = path.join(__dirname, '..', 'deliverables', 'Zoom_CRO_Foundation.xlsx');
const INK = 'FF161726', BURG = 'FF5F1E14', RED = 'FFD9391F', INPUT = 'FFFFF4C2', INPUT_B = 'FFE0B000', BLUE = 'FF1F3FBF', GREY = 'FF6B6B75', PALE = 'FFF5F4F3', LINE = 'FFE3E0DE';
const LIGHT = { ok: ['FFD7EFE3', 'Green'], warn: ['FFFBEFD0', 'Yellow'], bad: ['FFF7D9DF', 'Red'] };
const thin = { style: 'thin', color: { argb: LINE } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const col = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const wb = new ExcelJS.Workbook(); wb.creator = 'Databook deployment team (illustrative)'; wb.created = new Date('2026-10-17T12:00:00Z');
const fm = (x, d = 1) => '$' + Number(x).toFixed(d) + 'M', pc = (x, d = 0) => (x * 100).toFixed(d) + '%';
const HDR_ROW = 4; // front tabs: banner in rows 1 to 3, header in row 4

const bandRows = (ws, title, line, n) => {
  ws.mergeCells(1, 1, 1, n); const t = ws.getCell(1, 1); t.value = title; t.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } }; t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BURG } }; t.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(1).height = 28;
  ws.mergeCells(2, 1, 2, n); const l = ws.getCell(2, 1); l.value = line; l.font = { name: 'Calibri', size: 11, color: { argb: 'FF2A2A33' } }; l.alignment = { wrapText: true, vertical: 'top', indent: 1 }; l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT } }; ws.getRow(2).height = 48;
  ws.getRow(3).height = 6;
};
const headerRow = (ws, row, cols) => { cols.forEach((c, i) => { const cell = ws.getCell(row, i + 1); cell.value = c; cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }; cell.alignment = { vertical: 'middle', wrapText: true }; cell.border = box; }); ws.getRow(row).height = 30; };
const widthFor = (name, rows) => Math.max(11, Math.min(46, Math.max(name.length + 2, ...rows.slice(0, 60).map((r) => String(r[name] == null ? '' : r[name]).length + 2))));

// ---------- address book for the cases ----------
const FRONT_COLS = Object.fromEntries(FRONT.map((k) => [k, SHEETS[k].cols.map((c) => c[0])]));
function addrOf(e) {
  const rows = D.tables[e.sheet], i = rows.findIndex((r) => Object.keys(e.match).every((k) => String(r[k]) === String(e.match[k])));
  return col(FRONT_COLS[e.sheet].indexOf(e.col) + 1) + (HDR_ROW + 1 + i);
}
const PCTCOL = { nrr_forecast: 1, retention_shock_pct: 1 };
const showVal = (e, v) => (v === '' || v == null ? '(blank)' : PCTCOL[e.col] ? pc(+v, 1).replace('.0%', '%') : String(v));

// ================= START_HERE =================
{
  const ws = wb.addWorksheet('START_HERE', { properties: { tabColor: { argb: RED } }, views: [{ showGridLines: false }] });
  ws.columns = [{ width: 4 }, { width: 34 }, { width: 30 }, { width: 24 }, { width: 70 }, { width: 34 }];
  ws.mergeCells('A1:F1'); const t = ws.getCell('A1'); t.value = 'START HERE: what can you change right now to see a difference?'; t.font = { size: 17, bold: true, color: { argb: 'FFFFFFFF' } }; t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BURG } }; t.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(1).height = 34;
  ws.mergeCells('A2:F2'); ws.getCell('A2').value = 'Zoom CRO Command Center · foundation workbook · illustrative data as of October 17, 2026 · company names are real companies used as illustrative accounts; every figure is synthetic unless the data_flag says reported by Zoom.'; ws.getCell('A2').font = { size: 10, color: { argb: GREY } }; ws.getCell('A2').alignment = { wrapText: true, indent: 1, vertical: 'middle' }; ws.getRow(2).height = 28;
  let r = 4;
  const section = (txt) => { ws.mergeCells(r, 1, r, 6); const c = ws.getCell(r, 1); c.value = txt; c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }; c.alignment = { indent: 1, vertical: 'middle' }; ws.getRow(r).height = 22; r++; };
  const para = (txt, h, fill) => { ws.mergeCells(r, 1, r, 6); const c = ws.getCell(r, 1); c.value = txt; c.alignment = { wrapText: true, vertical: 'top', indent: 1 }; c.font = { size: 11 }; if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; ws.getRow(r).height = h; r++; };
  section('THE ANSWER');
  para('Change any YELLOW cell on the next four tabs (levers, lever_groups, whatif_deals, whatif_accounts). Save the file. On the site, open "Data and trust", choose "Load an updated workbook", then open "Command". The status matrix, the map, the plan-to-landing bridge and the actions by horizon redraw, and a "What-if active" bar lists what you changed. Nothing outside the yellow cells needs touching. To undo, clear the cell, or choose "Reset to the original" on the site.', 78, INPUT);
  r++;
  section('THE FASTEST THREE (each takes one cell)');
  [5, 2, 3].forEach((id) => { const c = C.cases.find((x) => x.id === id); const e = c.edits[0]; ws.mergeCells(r, 1, r, 6); const cell = ws.getCell(r, 1); cell.value = '#' + c.id + '  ' + c.title + '.  Tab ' + e.sheet + ', cell ' + addrOf(e) + ': ' + showVal(e, e.from) + ' to ' + showVal(e, e.to) + '.  You will see: ' + c.effects.slice(0, 2).join('; ') + '.'; cell.alignment = { wrapText: true, vertical: 'top', indent: 1 }; ws.getRow(r).height = 36; r++; });
  r++;
  section('ALL TWELVE TEST CASES (effects are computed by running the site\'s model on this exact data)');
  ['#', 'What you change', 'Where (tab and cell)', 'From to', 'What you will see', 'Where to look on the site'].forEach((h, i) => { const c = ws.getCell(r, i + 1); c.value = h; c.font = { bold: true, size: 10.5 }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEDEB' } }; c.border = box; c.alignment = { vertical: 'middle', wrapText: true }; }); ws.getRow(r).height = 22; r++;
  C.cases.forEach((c) => {
    const where = c.edits.map((e) => e.sheet + ' ' + addrOf(e)).join('\n'), ft = c.edits.map((e) => showVal(e, e.from) + ' to ' + showVal(e, e.to)).join('\n'), eff = c.effects.slice(0, 6).join('\n');
    const vals = [c.id, c.title + '\n' + c.why, where, ft, eff, c.look];
    vals.forEach((v, i) => { const cell = ws.getCell(r, i + 1); cell.value = v; cell.alignment = { wrapText: true, vertical: 'top' }; cell.border = box; cell.font = { size: 10.5, bold: i === 0 }; if (i === 2 || i === 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT } }; });
    const effLines = c.effects.slice(0, 6).reduce((t, x) => t + Math.ceil(x.length / 62), 0), leftLines = Math.ceil(c.title.length / 30) + Math.ceil(c.why.length / 34) + 1; ws.getRow(r).height = Math.max(64, 14.5 * Math.max(effLines, leftLines, c.edits.length * 2)); r++;
  });
  r++;
  section('TODAY\'S BASELINE (before any change): what the Command matrix shows on opening');
  ['', 'Region', 'Performance (against plan to date)', 'Forecast (against full-year plan)', 'Retention risk · Growth execution · Competitive exposure', 'Confidence on Forecast'].forEach((h, i) => { const c = ws.getCell(r, i + 1); c.value = h; c.font = { bold: true, size: 10.5 }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEDEB' } }; c.border = box; c.alignment = { wrapText: true, vertical: 'middle' }; }); ws.getRow(r).height = 32; r++;
  const SW = { ok: 'Green', warn: 'Amber', bad: 'Red', insufficient: 'Insufficient data', na: 'n/a' }, fillOf = { ok: 'FFD7EFE3', warn: 'FFFBEFD0', bad: 'FFF7D9DF' };
  C.baseline.rows.forEach((g) => {
    ws.getCell(r, 2).value = g.group; ws.getCell(r, 2).font = { bold: true };
    [['perf', 3], ['fcst', 4]].forEach(([k, ci]) => { const x = g.cells.find((c) => c.k === k), c = ws.getCell(r, ci); c.value = SW[x.st] + (x.v != null ? ' · ' + pc(x.v, 0) : ''); if (fillOf[x.st]) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillOf[x.st] } }; c.font = { bold: true }; c.alignment = { horizontal: 'center', vertical: 'top' }; });
    ws.getCell(r, 5).value = ['ret', 'grow', 'comp'].map((k) => { const x = g.cells.find((c) => c.k === k); return { ret: 'Retention', grow: 'Growth', comp: 'Competitive' }[k] + ': ' + SW[x.st] + (x.v != null ? ' ' + pc(x.v, k === 'ret' ? 1 : 0) : ''); }).join('   ·   '); ws.getCell(r, 5).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(r, 6).value = g.cells.find((c) => c.k === 'fcst').conf || ''; ws.getCell(r, 6).alignment = { horizontal: 'center', vertical: 'top' };
    for (let i = 2; i <= 6; i++) ws.getCell(r, i).border = box; ws.getRow(r).height = 30; r++;
  });
  para('Expected landing ' + fm(C.baseline.landing) + ' against a plan of ' + fm(C.baseline.plan) + ' (' + pc(C.baseline.landing / C.baseline.plan) + '), with ' + fm(C.baseline.incr) + ' of incremental upside that could be added if selected actions succeed (scenario landing ' + fm(C.baseline.scenario) + '). ' + fm(C.baseline.lost, 0) + ' was lost in the last four quarters where a rival was named. Revenue kept and grown across the 40 accounts is ' + pc(C.baseline.nrr, 1) + '. This is competitive exposure in the illustrative account book, not market share.', 62, PALE);
  r++;
  section('HOW EACH STATUS DECIDES (so you can predict what a change will do)');
  [
    'PERFORMANCE = closed-won this fiscal year divided by the plan that has elapsed (full quarters so far plus the share of the current quarter that normally closes by now). Green at or above perf_green_min, Amber at or above perf_amber_min, otherwise Red.',
    'FORECAST = expected landing divided by the full-year plan. Expected landing = closed so far + risk-weighted open deals closing this and next quarter + assumed new pipeline (q4_in_quarter_creation_share of next-quarter plan). Green at or above att_green_min, Amber at or above att_amber_min, otherwise Red. Confidence is shown separately and is Low when the landing leans on assumed pipeline, on deals with no executive sponsor, or on a forecast that settles late.',
    'RETENTION RISK = the worse of (net revenue retention against the nrr_forecast for the group: Amber if more than nrr_gap_yellow short, Red if more than nrr_gap_red short) and (revenue at risk as a share of yearly revenue: Amber above at_risk_share_yellow, Red above at_risk_share_red). It stays visible whatever Forecast says. retention_shock_pct removes that share of a group\'s revenue today and adds it to contraction.',
    'GROWTH EXECUTION = share of open pipeline value (this and next quarter) that has an executive sponsor, activity within stale_days and two or more contacts. Green at or above exec_healthy_green_min, Amber at or above exec_healthy_amber_min, otherwise Red. This is sales execution, not revenue.',
    'COMPETITIVE EXPOSURE = share of open pipeline value where the CRM names a competitor. Amber from comp_exposure_amber, Red from comp_exposure_red. A mention is not a loss; this is exposure in the account book, not market share.',
    'INSUFFICIENT DATA: Retention shows it when a group has fewer than min_accounts_for_status accounts; Growth execution and Competitive exposure show it with fewer than min_deals_for_status open deals; Performance shows it under two closed deals. Plan exists by region and product only, so industry and size rows show Performance and Forecast as not available.',
  ].forEach((p) => para(p, 62));
  r++;
  section('THE TABS IN THIS WORKBOOK, IN ORDER');
  [['START_HERE', 'This page: the answer first.', 'read'], ['levers', 'Global thresholds, status rules and forecast weights. Edit column C (value).', 'EDIT'], ['lever_groups', 'By region, industry and size: plan scale, expected retention, retention shock. Edit columns C to E.', 'EDIT'], ['whatif_deals', 'Largest open deals with override columns J to N. You can type any opp_id into a new row.', 'EDIT'], ['whatif_accounts', 'Accounts with override columns G to K. You can type any account_id into a new row.', 'EDIT'], ['DATA_GUIDE', 'What every data tab holds, where it comes from and how fresh it is.', 'read'], ['sf_ ... competitive_signals ... dictionary', 'The data behind everything: Salesforce, Gong, Grafana, monday.com, outside data, plan, competitive signals, lineage. Edit only if you mean to change the underlying data.', 'data']].forEach(([n, d, k]) => { ws.getCell(r, 2).value = n; ws.getCell(r, 2).font = { bold: true }; ws.mergeCells(r, 3, r, 5); ws.getCell(r, 3).value = d; ws.getCell(r, 3).alignment = { wrapText: true, vertical: 'top' }; const c = ws.getCell(r, 6); c.value = k === 'EDIT' ? 'Yellow cells: edit here' : k === 'data' ? 'Data: leave unless intended' : 'Read only'; if (k === 'EDIT') { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT } }; c.font = { bold: true }; } ws.getRow(r).height = 32; r++; });
  r++;
  section('FOR AN ANALYST OR AN AI READING THIS FILE');
  para('Every number on the site is computed from these tabs. The edits above are applied before any calculation (an overlay: a filled new_ cell replaces the value from the data tab for that record; a lever replaces the default). The effects listed in the test cases are the result of that calculation. The tab lineage lists, for every field, its source system, owner, who can see it, refresh cadence and where to fix it; dictionary gives the meaning and formula of each field and of every derived measure. Competitive signals are synthetic scenarios, not reporting. There is no market-share data; competitive exposure is computed from the opportunity data.', 92, PALE);
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 2 }];
}

// ================= front tabs =================
const frontSheet = (name, tab, title, line, opts) => {
  const cols = SHEETS[name].cols.map((c) => c[0]), rows = D.tables[name], ws = wb.addWorksheet(name, { properties: { tabColor: { argb: 'FFE0B000' } } });
  ws.columns = cols.map((c) => ({ width: opts.width[c] || widthFor(c, rows) }));
  bandRows(ws, title, line, cols.length); headerRow(ws, HDR_ROW, cols);
  const editable = new Set(opts.editable), extra = opts.extraRows || 0;
  rows.concat(Array.from({ length: extra }, () => ({}))).forEach((rw, i) => {
    cols.forEach((c, j) => { const cell = ws.getCell(HDR_ROW + 1 + i, j + 1); const v = rw[c]; cell.value = v === '' || v == null ? null : v; cell.border = box; cell.alignment = { vertical: 'top', wrapText: ['what_it_changes', 'where_to_look', 'note', 'current_products'].includes(c) }; cell.font = { size: 10.5, color: { argb: editable.has(c) ? BLUE : GREY } }; if (editable.has(c) && !(opts.skip && opts.skip(rw, c))) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT } }; cell.border = { top: { style: 'thin', color: { argb: INPUT_B } }, left: { style: 'thin', color: { argb: INPUT_B } }, bottom: { style: 'thin', color: { argb: INPUT_B } }, right: { style: 'thin', color: { argb: INPUT_B } } }; cell.font = { size: 10.5, bold: true, color: { argb: BLUE } }; } else if (opts.skip && opts.skip(rw, c) && editable.has(c)) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } }; } if (opts.fmt && opts.fmt[c]) cell.numFmt = opts.fmt[c]; });
    if (opts.rowHeight) ws.getRow(HDR_ROW + 1 + i).height = opts.rowHeight;
  });
  ws.views = [{ state: 'frozen', ySplit: HDR_ROW, xSplit: opts.freezeCols || 0 }];
  return { ws, cols, n: rows.length + extra };
};
{ // levers
  const o = frontSheet('levers', 'LEVERS', 'LEVERS: thresholds, status rules and forecast weights', 'Edit only the yellow VALUE column (C). Save, then on the site: Data and trust, Load an updated workbook, then open Command. Each row says what it changes and where to look. Ranges are sensible limits, not hard stops.', { editable: ['value'], width: { area: 16, key: 30, value: 11, unit: 12, low: 8, high: 8, what_it_changes: 70, where_to_look: 40 }, rowHeight: 32, freezeCols: 2 });
  for (let i = 0; i < o.n; i++) { const d = D.tables.levers[i], c = o.ws.getCell(HDR_ROW + 1 + i, 3); c.dataValidation = { type: 'decimal', operator: 'between', formula1: d.low, formula2: d.high, allowBlank: false, showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Outside the usual range', error: 'The usual range is ' + d.low + ' to ' + d.high + '. Keep the value anyway?' }; }
}
{ // lever_groups
  const o = frontSheet('lever_groups', 'LEVERS_BY_GROUP', 'LEVERS BY GROUP: region, industry and account size', 'Edit the yellow cells. plan_scale (regions only) re-bases that region\'s plan and commit. nrr_forecast is the retention each group is expected to deliver; Retention risk compares actual with it. retention_shock_pct is a what-if: the share of the group\'s revenue lost today. Type percentages with the % sign (8%) or as decimals (0.08).', { editable: ['plan_scale', 'nrr_forecast', 'retention_shock_pct'], width: { group_type: 12, group: 30, plan_scale: 12, nrr_forecast: 15, retention_shock_pct: 17, note: 90 }, fmt: { plan_scale: '0.00', nrr_forecast: '0.0%', retention_shock_pct: '0.0%' }, rowHeight: 24, freezeCols: 2, skip: (rw, c) => c === 'plan_scale' && rw.group_type !== 'Region' });
  const v = (cell, def) => { cell.dataValidation = def; };
  D.tables.lever_groups.forEach((g, i) => { const row = HDR_ROW + 1 + i; if (g.group_type === 'Region') v(o.ws.getCell(row, 3), { type: 'decimal', operator: 'between', formula1: 0.5, formula2: 1.5, showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Plan scale', error: 'Enter a number between 0.5 and 1.5 (1 = plan as published).' }); v(o.ws.getCell(row, 4), { type: 'decimal', operator: 'between', formula1: 0.8, formula2: 1.3, showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Retention forecast', error: 'Enter a percentage between 80% and 130%, for example 103%.' }); v(o.ws.getCell(row, 5), { type: 'decimal', operator: 'between', formula1: 0, formula2: 0.5, showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Retention shock', error: 'Enter a percentage between 0% and 50%, for example 8%.' }); });
}
{ // whatif_deals
  const o = frontSheet('whatif_deals', 'WHATIF_DEALS', 'WHAT-IF: DEALS', 'Fill a yellow new_ cell to change that deal; leave blank to keep what is in sf_opportunities. Columns A to I are for reading. You can type any opp_id from sf_opportunities into an empty row at the bottom. new_stage Closed Won or Closed Lost closes the deal today.', { editable: ['new_stage', 'new_amount_arr', 'new_close_date', 'new_exec_sponsor', 'new_competitor'], width: { opp_id: 10, account_name: 24, region: 10, product_line: 15, current_stage: 13, current_amount_arr: 12, current_close_date: 13, current_exec_sponsor: 12, current_competitor: 17, new_stage: 15, new_amount_arr: 13, new_close_date: 14, new_exec_sponsor: 13, new_competitor: 18 }, extraRows: 8, fmt: { current_amount_arr: '0.00', new_amount_arr: '0.00' }, freezeCols: 2, rowHeight: 20 });
  const lst = (a) => ({ type: 'list', allowBlank: true, formulae: ['"' + a.join(',') + '"'], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Pick from the list', error: 'Choose a value from the list, or clear the cell.' });
  for (let i = 0; i < o.n; i++) { const row = HDR_ROW + 1 + i; o.ws.getCell(row, 10).dataValidation = lst(['Discovery', 'Validate', 'Proposal', 'Negotiation', 'Contracting', 'Closed Won', 'Closed Lost']); o.ws.getCell(row, 13).dataValidation = lst(['0', '1']); o.ws.getCell(row, 14).dataValidation = lst(['None', 'Microsoft Teams', 'Webex by Cisco', 'Google Meet', 'Five9', 'Genesys', 'RingCentral']); o.ws.getCell(row, 11).dataValidation = { type: 'decimal', operator: 'between', formula1: 0, formula2: 50, allowBlank: true, showErrorMessage: true, errorTitle: 'Amount', error: 'Enter yearly revenue in $M, between 0 and 50.' }; }
}
{ // whatif_accounts
  const o = frontSheet('whatif_accounts', 'WHATIF_ACCOUNTS', 'WHAT-IF: ACCOUNTS', 'Fill a yellow new_ cell to change that account; leave blank to keep what is in sf_accounts. Columns A to F are for reading. new_renewal_date is YYYY-MM-DD. You can type any account_id from sf_accounts into an empty row at the bottom.', { editable: ['new_arr_current', 'new_renewal_date', 'new_owns_phone', 'new_owns_contact_center', 'new_owns_ai_addon'], width: { account_id: 11, account_name: 28, region: 10, current_arr: 11, current_renewal_date: 15, current_products: 34, new_arr_current: 15, new_renewal_date: 16, new_owns_phone: 13, new_owns_contact_center: 17, new_owns_ai_addon: 15 }, extraRows: 8, fmt: { current_arr: '0.00', new_arr_current: '0.00' }, freezeCols: 2, rowHeight: 20 });
  for (let i = 0; i < o.n; i++) { const row = HDR_ROW + 1 + i; [9, 10, 11].forEach((c) => (o.ws.getCell(row, c).dataValidation = { type: 'list', allowBlank: true, formulae: ['"0,1"'], showErrorMessage: true, errorTitle: 'Pick 0 or 1', error: '1 = owns it, 0 = does not.' })); }
}

// ================= DATA_GUIDE =================
{
  const ws = wb.addWorksheet('DATA_GUIDE', { properties: { tabColor: { argb: 'FF6B6B75' } } });
  ws.columns = [{ width: 24 }, { width: 34 }, { width: 10 }, { width: 14 }, { width: 70 }, { width: 24 }];
  bandRows(ws, 'DATA GUIDE: what each data tab holds', 'These tabs are the foundation. Leave them alone unless you mean to change the underlying data; the front tabs are where quick changes go. Every row on a data tab carries its source system, a record id, when it last changed and whether it is real, reported or synthetic.', 6);
  headerRow(ws, HDR_ROW, ['Tab', 'Source system', 'Rows', 'Refreshes', 'What it holds', 'Last updated (UTC)']);
  D.order.filter((k) => !FRONT.includes(k)).forEach((k, i) => { const sh = SHEETS[k], src = sh ? SOURCES[sh.src] : null; const vals = [k, src ? src.system : 'Provenance metadata', D.tables[k].length, src ? src.cadence : '', sh ? sh.desc : k === 'lineage' ? 'Source, owner, who can see it, refresh and change point for every field' : 'Meaning and formula for every field and derived measure', src ? src.updated.replace('T', ' ').replace('Z', '') : '']; vals.forEach((v, j) => { const c = ws.getCell(HDR_ROW + 1 + i, j + 1); c.value = v; c.border = box; c.alignment = { wrapText: true, vertical: 'top' }; c.font = { size: 10.5, bold: j === 0 }; }); });
  ws.views = [{ state: 'frozen', ySplit: HDR_ROW }];
}

// ================= data tabs =================
D.order.filter((k) => !FRONT.includes(k)).forEach((k) => {
  const cols = D.cols[k] || Object.keys(D.tables[k][0]), rows = D.tables[k], ws = wb.addWorksheet(k);
  ws.columns = cols.map((c) => ({ width: widthFor(c, rows) }));
  headerRow(ws, 1, cols); ws.getRow(1).height = 22;
  rows.forEach((rw, i) => cols.forEach((c, j) => { const v = rw[c]; if (v !== '' && v != null) ws.getCell(i + 2, j + 1).value = v; }));
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }]; ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
});

wb.xlsx.writeFile(OUT).then(() => console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB', wb.worksheets.map((w) => w.name).join(', ')));
