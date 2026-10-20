// Writes data/accounts_40.csv: one row per account, joined from the Salesforce-style table, the model and the platform array.
const fs = require('fs'), path = require('path');
const ZM = require('./model'), ZM2 = require('./model2');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8')), G = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'gtm', 'accounts.json'), 'utf8'));
const T = JSON.parse(JSON.stringify(D.tables)), pre = ZM2.prepare(T), M = ZM.buildModel(pre.T, pre.cfg); ZM2.enrich(M, pre.T);
const q = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const r1 = (x) => Math.round(x * 100) / 100;
const cols = ['account_id', 'account_name', 'region', 'country', 'industry', 'segment', 'seller', 'yearly_revenue_usd_m', 'health_score', 'renewal_date', 'revenue_at_risk_usd_m', 'open_deals_usd_m', 'agreed_by_sales_team_usd_m', 'expected_to_close_usd_m', 'modeled_uplift_usd_m', 'owns_workplace', 'owns_phone', 'owns_contact_center', 'owns_ai', 'rival_named', 'risk_thread', 'data_flag'];
const rows = G.accounts.map((a) => { const z = M.acc[a.id]; return [a.id, a.name, a.region, z.country, a.industry, a.segment, a.rep, r1(z.arr_current), z.health, z.renewal_date, r1(z.arrAtRisk || 0), a.inFlight, a.commit, a.forecast, a.uplift, +a.owns.workplace, +a.owns.phone, +a.owns.contactCenter, +a.owns.ai, a.rival || '', a.thread || '', 'synthetic; company name used as a label only'].map(q).join(','); });
fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
const csv = [cols.join(',')].concat(rows).join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '..', 'data', 'accounts_40.csv'), csv);
// the publishable site serves dist/, so the downloads sit there too
const dd = path.join(__dirname, '..', 'dist', 'data'); fs.mkdirSync(dd, { recursive: true });
fs.writeFileSync(path.join(dd, 'accounts_40.csv'), csv);
fs.copyFileSync(path.join(__dirname, '..', 'deliverables', 'Zoom_CRO_Foundation.xlsx'), path.join(dd, 'Zoom_CRO_Foundation.xlsx'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'README.md'), path.join(dd, 'README.md'));
fs.copyFileSync(path.join(__dirname, '..', 'deliverables', 'Zoom_CRO_Foundation.xlsx'), path.join(__dirname, '..', 'data', 'Zoom_CRO_Foundation.xlsx'));
console.log('data/accounts_40.csv', rows.length, 'accounts');
