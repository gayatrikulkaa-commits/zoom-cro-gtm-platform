// ---------- core: data, state, provenance, formatting, charts ----------
const D = window.DATA, ZM = window.ZM, ZM2 = window.ZM2, ZC = window.ZC, GEO = window.GEO;
const SRC = D.sources;
const ASOF_TS = Date.parse('2026-10-17T06:00:00Z');
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (x, d = 0) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (x, d = 1) => (x < 0 ? '-' : '') + '$' + nf(Math.abs(x), d) + 'M';
const pc = (x, d = 0) => nf(x * 100, d) + '%';
const sum = ZM.sum, mean = ZM.mean, clamp = ZM.clamp;
const dateFmt = (iso) => new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const tsFmt = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC';
const ucf = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const store = { get(k, d) { try { const v = localStorage.getItem('zcro:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('zcro:' + k, JSON.stringify(v)); } catch (e) {} } };
const TABS = [['command', 'CRO Hub'], ['guided', 'Guided selling'], ['coach', 'Seller coach'], ['revenue', 'Revenue and uplift'], ['regprod', 'Region and product'], ['forecast', 'Forecast'], ['accounts', 'Accounts'], ['sellers', 'Sellers'], ['pricing', 'Pricing and promotions'], ['compete', 'Compete'], ['engine', 'Account engine'], ['decide', 'Decide'], ['studio', 'Sales Ops Studio'], ['lab', 'Workspace'], ['why', 'How it reasons'], ['ingress', 'Ingress and resolution'], ['sources', 'Data and trust'], ['prove', 'Prove'], ['connect', 'Connections'], ['uplift', 'Uplift and adoption'], ['kpis', 'CRO KPIs'], ['assets', 'Client materials'], ['costudio', 'Coach studio']];
const ROUTE = { revenue: ['uplift'], journey: ['command'], perf: ['kpis'], hood: ['sources'], engine: ['accounts', 'priority'], answer: ['command'], guide: ['command'], hub: ['command'], overview: ['forecast', 'summary'], scorecard: ['kpis'], pipeline: ['forecast', 'pipeline'], regions: ['forecast', 'regions'], graph: ['accounts', 'view'], tasks: ['decide', 'actions'], desk: ['decide', 'calls'], databook: ['why'] };
const ROLES = { cro: 'Chief Sales and Growth Officer', rvp: 'Regional Vice President', ae: 'Account Executive', csm: 'Customer Success Manager' };
const rowOfSpec = (sp) => { if (!sp) return null; const [lens, label] = sp.split('|'); return lens === 'all' ? M.matrix.all : (M.matrix[lens] || []).find((r) => r.label === label); };
const ROLE_LBL = Object.assign({ revops: 'Revenue Operations', finance: 'Finance', dealdesk: 'Deal desk', se: 'Solutions Engineer' }, ROLES);
const catLabel = (c) => ({ Commit: 'Committed', 'Best Case': 'Likely', Pipeline: 'Early' }[c] || c);
const PRODUCT_COLOR = { Workplace: 'var(--peri)', Phone: 'var(--data)', 'Contact Center': 'var(--red)', AI: 'var(--ink-3)' };

// ---------- state ----------
const freshT = () => { const t = {}; Object.keys(D.tables).forEach((k) => (t[k] = (D.front || []).includes(k) ? D.tables[k].map((r) => Object.assign({}, r)) : D.tables[k])); return t; };
let T = freshT();
function setLever(k, v) { let r = (T.levers || []).find((x) => x.key === k); if (!r) { const d = ZM2.LEVER_DEFS.find((x) => x[1] === k); r = { area: d[0], key: k, value: v, unit: d[3], low: d[4], high: d[5], what_it_changes: d[6], where_to_look: d[7] }; T.levers = (T.levers || []).concat([r]); } r.value = v; }
function setGroup(type, group, col, v) { const r = (T.lever_groups || []).find((x) => x.group_type === type && x.group === group); if (r) r[col] = v; }
const S = { tab: 'command', lens: 'region', focus: null, mapMetric: 'lost', country: null, sub: { forecast: 'summary', accounts: 'priority', decide: 'actions', pricing: 'pricing', compete: 'map', lab: 'scenarios' }, horizon: 'now', accGroup: null, compLens: 'region', run: null, demo: false, grouped: store.get('grouped', true), asset: null, agentNote: '', region: 'All', role: 'cro', account: null, drawer: null, prov: null, copilot: false, modal: null, msgs: [], quarter: 'cur', allDeals: false, sort: { deals: ['exposure', -1], accounts: ['arr', -1], sellers: ['pace', -1], tasks: ['impact', -1] }, taskFilter: 'All', lineageSheet: 'all', hl: null, agent: null, adopt: 70, upliftPct: 1.0, notice: '' };
const desk = Object.assign({ overrides: {}, agents: [], audit: [], runs: [], taskStatus: {}, comments: {}, queue: {}, actionStatus: {} }, store.get('desk', {}));
desk.coach = Object.assign({ sessions: [], auth: {}, cfg: null, proposal: null, history: [] }, desk.coach || {});
const saveDesk = () => store.set('desk', desk);
let M = null;
function rebuild() { const pre = ZM2.prepare(T); S.prep = pre; M = ZM.buildModel(pre.T, Object.assign({}, pre.cfg, { overrides: desk.overrides })); ZM2.enrich(M, pre.T); if (!S.account || !M.acc[S.account]) S.account = (M.accounts.find((a) => a.account_name === 'Nike') || M.accounts[0]).account_id; }
function route(t) { const r = ROUTE[t]; if (r) { S.tab = r[0]; if (r[1]) S.sub[r[0]] = r[1]; } else if (TABS.some((x) => x[0] === t)) S.tab = t; }
try { route(location.hash.replace('#', '')); } catch (e) {}
// Back and Forward move between the screens of the platform, not out of it: every screen change adds a history entry
// that remembers the tab and sub-tab, and popstate puts them back.
const histState = () => ({ zcro: 1, tab: S.tab, sub: Object.assign({}, S.sub) });
function pushHash() {
  try {
    if (location.hash === '#' + S.tab && history.state && history.state.zcro) history.replaceState(histState(), '', '#' + S.tab);
    else history.pushState(histState(), '', '#' + S.tab);
  } catch (e) {}
}
function restoreFromHistory(st) {
  const h = location.hash.replace('#', '');
  if (st && st.zcro && TABS.some((x) => x[0] === st.tab)) { S.tab = st.tab; Object.assign(S.sub, st.sub || {}); } else route(h);
}
rebuild();
const roleKey = () => S.role;
const canAccess = (acc) => !acc || acc.split(',').includes(S.role);
const inReg = (r) => S.region === 'All' || r === S.region;

// ---------- provenance ----------
const CAD_H = { hourly: 6, daily: 36, weekly: 240, monthly: 960, quarterly: 2400, manual: Infinity, 'on change': Infinity };
const isStale = (upd, cad) => (ASOF_TS - Date.parse(upd)) / 36e5 > (CAD_H[cad] == null ? Infinity : CAD_H[cad]);
function dsInfo(name) {
  const L = (T.lineage || []).filter((r) => r.sheet === name && r.field_kind === 'sourced');
  if (!L.length) return null; const f = L[0]; let acc = null;
  L.forEach((r) => { const a = new Set(String(r.access_group).split(',')); acc = acc ? new Set([...acc].filter((x) => a.has(x))) : a; });
  const rows = (T[name] || []), upd = rows.length && rows[0].last_updated_at ? rows.reduce((m, r) => (r.last_updated_at > m ? r.last_updated_at : m), '') : f.last_updated_at;
  return { name, system: f.source_system, object: f.source_object, owner: f.system_owner, steward: f.data_steward, cadence: f.refresh_cadence, updated: upd, change: f.change_point, access: [...acc], rows: rows.length, stale: isStale(upd, f.refresh_cadence), desc: (D.sheetInfo[name] || {}).desc || '' };
}
const DS_LABEL = { sf_accounts: 'Salesforce accounts', sf_contacts: 'Salesforce contacts', sf_opportunities: 'Salesforce opportunities', sf_users: 'Salesforce users', sf_history: 'Salesforce forecast history', gong_calls: 'Gong calls', grafana_usage: 'Grafana usage', monday_projects: 'monday.com projects', external_signals: 'Outside news and data', targets: 'Plan', assumptions: 'Assumptions', promotions: 'Promotions', marketing_funnel: 'Marketing funnel', forecast_snapshots: 'Weekly forecast snapshots', competitive_signals: 'Competitive signals', levers: 'Levers', lever_groups: 'Group levers', whatif_deals: 'Deal what-ifs', whatif_accounts: 'Account what-ifs' };
const PROV = {
  fy_landing: { label: 'FY27 new yearly revenue landing', ds: ['sf_opportunities', 'targets', 'assumptions', 'gong_calls', 'grafana_usage', 'monday_projects', 'sf_accounts'], formula: 'Closed-won to date + risk-weighted open deals for Q3 and Q4 + expected in-quarter creation (assumption, share of Q4 plan)', derived: true },
  q3_forecast: { label: 'Current quarter forecast', ds: ['sf_opportunities', 'gong_calls', 'grafana_usage', 'monday_projects', 'sf_accounts', 'targets'], formula: 'Closed won in quarter + sum of open amount x Prototype win chance (stage, sponsor, number of contacts, how recent the last activity is, competitor, account health, delivery)', derived: true },
  rep_call: { label: 'Sales team forecast', ds: ['sf_opportunities'], formula: 'Closed won + sum of amount x sales team win chance by forecast category', derived: true },
  coverage: { label: 'Pipeline cover', ds: ['sf_opportunities', 'targets'], formula: 'Open amount closing in the quarter divided by plan (or by plan less closed to date for the current quarter)', derived: true },
  nrr: { label: 'Revenue kept and grown, strategic accounts', ds: ['sf_accounts'], formula: 'Sum of arr_current divided by sum of arr_12m_ago', derived: true },
  grr: { label: 'Revenue kept, strategic accounts', ds: ['sf_accounts'], formula: '1 less contraction_ttm divided by arr_12m_ago', derived: true },
  at_risk: { label: 'revenue at risk', ds: ['sf_accounts', 'grafana_usage', 'gong_calls', 'monday_projects'], formula: 'For accounts below the health warning level renewing within 270 days: yearly revenue x renewal risk, where risk = (1 - health)^1.4, halved beyond 180 days, plus 5 points if a competitor is named', derived: true },
  pace: { label: 'Reps on track', ds: ['sf_opportunities', 'sf_users'], formula: 'FY27 closed-won divided by quota x fraction of year elapsed; on track when 100 percent or more', derived: true },
  whitespace: { label: 'Untapped revenue', ds: ['sf_accounts', 'gong_calls'], formula: 'yearly revenue x weight for each product not owned (Phone 12%, Contact Center 20%, AI 6%); the next product weighs call topics', derived: true },
  health: { label: 'Account health', ds: ['sf_accounts', 'grafana_usage', 'gong_calls', 'monday_projects'], formula: '0.35 usage + 0.25 engagement + 0.20 delivery + 0.20 commercial', derived: true },
  history: { label: 'Commit against actual', ds: ['sf_history', 'sf_opportunities'], formula: 'Commit three weeks into the quarter against closed-won new yearly revenue', derived: false },
  cohort: { label: 'Pilot sellers vs everyone else', ds: ['sf_opportunities', 'sf_users'], formula: 'Closed deals since the trial start: guided deals of sellers using Databook against all deals of other sellers; a 95 percent confidence range', derived: true },
  maturity: { label: 'Selling skill', ds: ['sf_opportunities', 'gong_calls', 'sf_users'], formula: '40 executive sponsor share + 25 number of contacts + 20 next steps + 15 how recent the last activity is', derived: true },
  plan: { label: 'Plan', ds: ['targets'], formula: 'Plan for new yearly revenue by region, product line and quarter', derived: false },
  signals: { label: 'Outside news and data', ds: ['external_signals'], formula: 'Third-party and public news matched to the account', derived: false },
  tasks: { label: 'Tasks', ds: ['sf_opportunities', 'sf_accounts', 'gong_calls', 'grafana_usage', 'monday_projects'], formula: 'Rules over the cross-source facts; impact is the change in expected yearly revenue if the action is taken', derived: true },
  contacts: { label: 'Buying committee', ds: ['sf_contacts'], formula: 'Contacts at the account', derived: false },
  assumptions: { label: 'Assumptions', ds: ['assumptions'], formula: 'Illustrative values with ranges and reasons', derived: false },
  conv: { label: 'Conversation insights', ds: ['gong_calls', 'sf_accounts', 'grafana_usage', 'monday_projects', 'sf_opportunities', 'external_signals'], formula: 'Each Gong call is tagged by topic: Renewal or Pricing for renewal, Quality, Onboarding, Security, Integration or a rival for retention, Contact Center, AI, Phone or Rooms for expansion. Suggestions combine the tags with usage, delivery, renewal date and open deals for the same account', derived: true },
  pricing: { label: 'Pricing and discounts', ds: ['sf_opportunities'], formula: 'Win rate = closed-won deals divided by decided deals within each discount band; discount given = amount x discount divided by (100 less discount), the list price given up', derived: true },
  promos: { label: 'Promotion return', ds: ['promotions', 'sf_opportunities'], formula: 'Extra bookings = deals decided x (win rate with the promotion less win rate for similar deals without one) x average won deal; return = extra bookings divided by the extra discount given', derived: true },
  funnel: { label: 'Marketing funnel', ds: ['marketing_funnel', 'sf_opportunities'], formula: 'Leads to qualified leads to opportunities to wins by channel; cost per $1 = channel spend divided by bookings won', derived: false },
  m_perf: { label: 'Performance against plan to date', ds: ['sf_opportunities', 'targets', 'levers'], derived: true, formula: (sp) => { const L = M.lv, r = rowOfSpec(sp), c = r && r.perf; return 'Closed-won this fiscal year divided by the plan that has elapsed: full quarters so far plus ' + pc(M.bookedShare, 0) + ' of the current quarter, the share that normally closes by now. <b>Green</b> at or above ' + pc(L.perf_green_min, 0) + ', <b>amber</b> from ' + pc(L.perf_amber_min, 0) + ', <b>red</b> below. Shows insufficient data under two closed deals. Confidence: High from 10 closed deals, Medium from 5.' + (c && c.value != null ? '<br><b>' + esc(r.label) + ':</b> closed ' + fm(c.actual, 1) + ' of ' + fm(c.elapsed, 1) + ' elapsed plan = ' + pc(c.value, 0) + ' (' + c.n + ' deals, confidence ' + c.conf + ').' : ''); } },
  m_fcst: { label: 'Forecast against full-year plan', ds: ['sf_opportunities', 'targets', 'forecast_snapshots', 'gong_calls', 'grafana_usage', 'monday_projects', 'sf_accounts', 'levers'], derived: true, formula: (sp) => { const L = M.lv, r = rowOfSpec(sp), c = r && r.fcst; return 'Expected landing = closed so far + risk-weighted open deals closing this and next quarter + assumed new pipeline (' + pc(L.q4_in_quarter_creation_share, 0) + ' of next-quarter plan), divided by the full-year plan. <b>Green</b> at or above ' + pc(L.att_green_min, 0) + ', <b>amber</b> from ' + pc(L.att_amber_min, 0) + ', <b>red</b> below. Confidence is separate: it rises when assumed pipeline is 10% or less of the landing, when executives sponsor 60% or more of open pipeline, and when the sales forecast settles by week 10.' + (c && c.value != null ? '<br><b>' + esc(r.label) + ':</b> ' + fm(c.landing, 1) + ' of ' + fm(c.fyPlan, 1) + ' = ' + pc(c.value, 0) + '. Confidence ' + c.conf + ': ' + c.confWhy.map(esc).join('; ') + '.' : ''); } },
  m_ret: { label: 'Retention risk', ds: ['sf_accounts', 'grafana_usage', 'gong_calls', 'monday_projects', 'lever_groups'], derived: true, formula: (sp) => { const L = M.lv, r = rowOfSpec(sp), c = r && r.ret; return 'The worse of two tests. (1) Net revenue retention against the forecast for the group: amber if ' + nf(L.nrr_gap_yellow * 100, 0) + ' points short, red if ' + nf(L.nrr_gap_red * 100, 0) + '. (2) Revenue at risk as a share of yearly revenue: amber above ' + pc(L.at_risk_share_yellow, 0) + ', red above ' + pc(L.at_risk_share_red, 0) + '. A red here stays visible whatever the forecast column says. Shows insufficient data under ' + L.min_accounts_for_status + ' accounts.' + (c && c.value != null ? '<br><b>' + esc(r.label) + ':</b> retention ' + pc(c.value, 1) + ' against ' + pc(c.nrrF, 0) + ' forecast; ' + fm(c.atRisk, 1) + ' at risk (' + pc(c.riskShare, 1) + ' of yearly revenue); ' + c.n + ' accounts, confidence ' + c.conf + '.' : ''); } },
  m_grow: { label: 'Growth execution', ds: ['sf_opportunities', 'gong_calls'], derived: true, formula: (sp) => { const L = M.lv, r = rowOfSpec(sp), c = r && r.grow; return 'Share of open pipeline value (this and next quarter) that is healthy: an executive sponsor, activity within ' + M.cfg.staleDays + ' days and two or more customer contacts. <b>Green</b> at or above ' + pc(L.exec_healthy_green_min, 0) + ', <b>amber</b> from ' + pc(L.exec_healthy_amber_min, 0) + ', <b>red</b> below. Insufficient data under ' + L.min_deals_for_status + ' open deals. This measures sales execution, not revenue.' + (c && c.value != null ? '<br><b>' + esc(r.label) + ':</b> ' + pc(c.value, 0) + ' healthy across ' + c.n + ' open deals' + (c.cover != null ? '; next-quarter cover ' + nf(c.cover, 1) + 'x' : '') + '; confidence ' + c.conf + '.' : ''); } },
  m_comp: { label: 'Competitive exposure', ds: ['sf_opportunities', 'competitive_signals'], derived: true, formula: (sp) => { const L = M.lv, r = rowOfSpec(sp), c = r && r.comp; return 'Share of open pipeline value (this and next quarter) where the CRM names a competitor. <b>Green</b> below ' + pc(L.comp_exposure_amber, 0) + ', <b>amber</b> from there, <b>red</b> at or above ' + pc(L.comp_exposure_red, 0) + '. This is exposure in the illustrative account book, not market share. A mention is not a loss and a recorded loss reason is not proof of cause.' + (c && c.value != null ? '<br><b>' + esc(r.label) + ':</b> ' + pc(c.value, 0) + ' of open pipeline; ' + fm(c.lost, 1) + ' lost to a named rival in four quarters; ' + c.n + ' open deals, confidence ' + c.conf + '.' : ''); } },
  loop: { label: 'Execution loop', ds: ['sf_opportunities', 'gong_calls'], formula: 'Counts the steps from a leadership decision to a seller action: approved, coach started, completed, missing information resolved, asset reviewed, action accepted, buyer next step recorded. A seeded pilot sample is shown with this session. These are leading indicators. The commercial outcome is lagging and is not claimed.', derived: false },
  bridge: { label: 'Plan, actual, probable and upside', ds: ['targets', 'sf_opportunities', 'gong_calls', 'sf_accounts', 'levers'], formula: 'Plan for the year; actual = closed-won to date; probable = risk-weighted open deals this and next quarter; expected creation = assumed share of next quarter plan created and closed inside the quarter; upside = open deals fixable by a sponsor or a fresh call (at the success rate) plus expansion customers have asked for (at the conversion rate).', derived: true },
  lags: { label: 'Lags', ds: ['forecast_snapshots', 'sf_opportunities', 'monday_projects', 'levers'], formula: 'Forecast lag = first week from which the weekly forecast stays within the lag band of the final actual. Booking curve = share of a quarter closed by this day in the last full quarters. Cycle = days from creation to close on won deals. Go-live = days from kickoff to go-live on finished projects.', derived: true },
  capacity: { label: 'Demand and capacity', ds: ['sf_opportunities', 'targets', 'sf_users', 'monday_projects', 'levers'], formula: 'Pipeline needed = next quarter plan x cover norm; pipeline present = open deals closing next quarter; capacity = account executives x pipeline one executive can work; delivery load = open projects per owner against projects one owner can run.', derived: true },
  signal_prob: { label: 'Prototype win chance', ds: ['sf_opportunities', 'gong_calls', 'grafana_usage', 'monday_projects', 'sf_accounts'], formula: 'Stage base (Discovery 10, Validate 25, Proposal 45, Negotiation 65, Contracting 85) + 5 points per contact above 2.5, +7 or -11 for executive sponsor, - up to 24 for days quiet, -5 competitor, +3 guided, +4 or -7 and -5 for account health and delivery', derived: true },
};
function provHTML(keyOrDs) {
  const p = PROV[keyOrDs] || { label: DS_LABEL[keyOrDs] || keyOrDs, ds: [keyOrDs], formula: '', derived: false };
  const infos = p.ds.map(dsInfo).filter(Boolean);
  const oldest = infos.reduce((m, i) => (!m || i.updated < m ? i.updated : m), null);
  const access = infos.length ? infos.map((i) => i.access).reduce((a, b) => a.filter((x) => b.includes(x))) : [];
  const cm = desk.comments[keyOrDs] || [], fx = typeof p.formula === 'function' ? p.formula(S.provRow) : esc(p.formula || '');
  return '<div class="panel-hd"><div><span class="kicker">' + (p.derived ? 'Calculated figure' : 'Figure from a source system') + '</span><h3>' + esc(p.label) + '</h3></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="panel-bd">' +
    '<div class="pc-block"><div class="pc-grid"><div class="k">Source</div><div>' + infos.map((i) => '<div><b>' + esc(i.system) + '</b> · ' + esc(DS_LABEL[i.name] || i.name) + ' <span class="sub">(' + nf(i.rows) + ' rows)</span></div>').join('') + '</div>' +
    '<div class="k">Last updated</div><div>' + (oldest ? tsFmt(Date.parse(oldest)) + ' (oldest input)' : '') + infos.map((i) => '<div class="sub">' + esc(DS_LABEL[i.name] || i.name) + ': ' + tsFmt(Date.parse(i.updated)) + ', refreshed ' + esc(i.cadence) + (i.stale ? ' <span class="chip stale">out of date</span>' : '') + '</div>').join('') + '</div>' +
    '<div class="k">Who can see it</div><div>' + (access.length ? access.map((a) => ROLE_LBL[a] || a).join(', ') : 'Roles with access to every input: see each source') + '<div class="sub">You are viewing as ' + ROLES[S.role] + '.</div></div>' +
    '<div class="k">Who owns it</div><div>' + [...new Set(infos.map((i) => i.system + ': ' + i.owner + ' (owner), ' + i.steward + ' (data contact)'))].map((x) => '<div>' + esc(x) + '</div>').join('') + '</div>' +
    '<div class="k">Where to fix it</div><div>' + [...new Set(infos.map((i) => i.system + ': ' + i.change))].map((x) => '<div>' + esc(x) + '</div>').join('') + (p.derived ? '<div>Change the threshold or formula on the Decide tab; the CRO approves.</div>' : '') + '</div>' +
    '<div class="k">How long it stays useful</div><div>' + [...new Set(infos.map((i) => SHELF[i.name] || ''))].filter(Boolean).map((x) => '<div>' + esc(x) + '</div>').join('') + '</div>' +
    (fx ? '<div class="k">' + (p.derived ? 'Formula' : 'Definition') + '</div><div>' + fx + '</div>' : '') + '</div></div>' +
    '<div><h3 style="font-size:15px;margin-bottom:8px">Comments</h3><div id="cmts">' + (cm.length ? cm.map((c) => '<div class="cmt"><div class="w">' + esc(c.who) + ' · ' + esc(c.at) + '</div>' + esc(c.text) + '</div>').join('') : '<p class="empty">No comments yet. Anyone can add context for the next reader.</p>') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><textarea id="cmt-in" aria-label="Comment" placeholder="Add a comment on this figure"></textarea><div><button class="btn sm" data-act="addcomment" data-key="' + esc(keyOrDs) + '">Post comment</button></div></div></div>' +
    (infos.length ? '<div><h3 style="font-size:15px;margin-bottom:8px">Sheets behind it</h3><div class="chips">' + infos.map((i) => '<button class="chip" data-act="lineage" data-ds="' + i.name + '">' + esc(i.name) + '</button>').join('') + '</div></div>' : '') + '</div>';
}
const infoBtn = (k) => '<button class="info" data-act="prov" data-k="' + k + '" aria-label="Where this comes from" title="Source, last update, access, owner, control point">i</button>';
const dsChip = (ds) => { const i = dsInfo(ds); return '<button class="chip' + (i && i.stale ? ' out of date' : '') + '" data-act="prov" data-k="' + ds + '" title="Open provenance">' + esc(i ? i.system : ds) + (i && i.stale ? ' · out of date' : '') + '</button>'; };
function provStrip(keys) {
  const list = [...new Set(keys.flatMap((k) => (PROV[k] ? PROV[k].ds : [k])))], infos = list.map(dsInfo).filter(Boolean), oldest = infos.reduce((m, i) => (!m || i.updated < m ? i.updated : m), null), stale = infos.filter((i) => i.stale);
  return '<details class="prov-d"><summary>Sources on this page' + (stale.length ? ' · <span class="chip stale">' + stale.length + ' out of date</span>' : '') + '</summary><div class="prov"><b>Sources</b>' + list.map(dsChip).join('') + '<span>Oldest input ' + (oldest ? tsFmt(Date.parse(oldest)) : '') + '</span><span>Demo view: ' + ROLES[S.role] + '</span></div></details>';
}

// ---------- ui atoms ----------
const pill = (t, k) => '<span class="pill ' + k + '">' + esc(t) + '</span>';
const toneOf = (v, good, ok) => (v >= good ? 'ok' : v >= ok ? 'warn' : 'bad');
const healthBar = (h) => { const t = toneOf(h, 70, M.cfg.healthCut); const c = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' }[t]; return '<div class="bar-cell"><span class="num" style="min-width:24px">' + h + '</span><div class="mini"><i style="width:' + h + '%;background:' + c + '"></i></div></div>'; };
const kpi = (key, label, val, sub, go) => '<button class="kpi" data-act="prov" data-k="' + key + '"><div class="lbl">' + label + '</div><div class="val">' + val + '</div><div class="sub">' + sub + '</div></button>';
const delta = (v, d = 1) => '<span class="delta ' + (v >= 0 ? 'up' : 'down') + '">' + (v >= 0 ? '+' : '-') + fm(Math.abs(v), d).replace('-', '') + '</span>';
const sortArrow = (t, k) => (S.sort[t][0] === k ? ' ' + (S.sort[t][1] < 0 ? '▼' : '▲') : '');
const th = (t, k, label, cls) => '<th class="sortable ' + (cls || '') + '" data-act="sort" data-t="' + t + '" data-k="' + k + '">' + label + sortArrow(t, k) + '</th>';
const sortRows = (rows, t, g) => { const [k, dir] = S.sort[t]; const f = g[k]; return rows.slice().sort((a, b) => { const x = f(a), y = f(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; }); };
const restricted = '<span class="restricted">Restricted</span>';
const acctName = (id) => (M.acc[id] ? M.acc[id].account_name : id);
const userName = (id) => (M.U[id] ? M.U[id].name : id);

// ---------- charts ----------
const svgOpen = (w, h) => '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img">';
function niceTicks(lo, hi, n) { const span = hi - lo || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), norm = step0 / mag, step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag, out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
function chartHistory(el, w) {
  const q = M.histQ, h = 240, m = { l: 36, r: 8, t: 22, b: 40 }, iw = w - m.l - m.r, ih = h - m.t - m.b, max = Math.max.apply(null, q.map((x) => Math.max(x.commit, x.actual, x.plan))) * 1.12, y = (v) => m.t + ih - (v / max) * ih, bw = Math.min(26, (iw / q.length) * 0.32);
  let o = svgOpen(w, h) + '<g class="grid">' + niceTicks(0, max, 4).map((t) => '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end" class="m">' + nf(t) + '</text>').join('') + '</g>';
  q.forEach((x, i) => {
    const cx = m.l + (iw / q.length) * (i + 0.5);
    o += '<rect x="' + (cx - bw - 1) + '" y="' + y(x.commit) + '" width="' + bw + '" height="' + (y(0) - y(x.commit)) + '" rx="3" fill="var(--peri)" opacity=".55" data-tip="<b>' + x.quarter + ' commit</b><br>' + fm(x.commit) + '"/>';
    o += '<rect x="' + (cx + 1) + '" y="' + y(x.actual) + '" width="' + bw + '" height="' + (y(0) - y(x.actual)) + '" rx="3" fill="var(--data)" data-tip="<b>' + x.quarter + ' actual</b><br>' + fm(x.actual) + ' against plan ' + fm(x.plan) + '"/>';
    o += '<line x1="' + (cx - bw - 4) + '" x2="' + (cx + bw + 4) + '" y1="' + y(x.plan) + '" y2="' + y(x.plan) + '" stroke="var(--ink)" stroke-width="1.5"/>';
    o += '<text x="' + cx + '" y="' + (h - 22) + '" text-anchor="middle">' + x.quarter.replace(' ', ' ') + '</text><text x="' + cx + '" y="' + (h - 8) + '" text-anchor="middle" class="m ' + (x.miss < -0.03 ? '' : '') + '" style="fill:' + (x.miss < -0.03 ? 'var(--bad)' : 'var(--ink-3)') + '">' + (x.miss >= 0 ? '+' : '') + nf(x.miss * 100, 1) + '%</text>';
  });
  el.innerHTML = o + '</svg>';
}
function scatter(el, w, pts, o) {
  const h = o.h || Math.max(280, Math.min(380, w * 0.62)), m = { l: 54, r: 14, t: 14, b: 40 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = (v) => m.l + ((v - o.x[0]) / (o.x[1] - o.x[0])) * iw, y = (v) => m.t + ih - ((v - o.y[0]) / (o.y[1] - o.y[0])) * ih;
  let s = svgOpen(w, h) + '<g class="grid">' + niceTicks(o.y[0], o.y[1], 4).map((t) => '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (m.l - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end" class="m">' + t + (o.yu || '') + '</text>').join('') + niceTicks(o.x[0], o.x[1], 5).map((t) => '<text x="' + x(t) + '" y="' + (h - m.b + 15) + '" text-anchor="middle" class="m">' + t + '</text>').join('') + '</g>';
  (o.lines || []).forEach((l) => { s += l.h != null ? '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(l.h) + '" y2="' + y(l.h) + '" stroke="var(--ink-3)" stroke-dasharray="3 4" opacity=".6"/>' : '<line y1="' + m.t + '" y2="' + (h - m.b) + '" x1="' + x(l.v) + '" x2="' + x(l.v) + '" stroke="var(--ink-3)" stroke-dasharray="3 4" opacity=".6"/>'; });
  s += '<text x="' + (m.l + iw / 2) + '" y="' + (h - 4) + '" text-anchor="middle">' + o.xl + '</text><text transform="translate(11 ' + (m.t + ih / 2) + ') rotate(-90)" text-anchor="middle">' + o.yl + '</text>';
  (o.quad || []).forEach((q) => (s += '<text x="' + x(q[0]) + '" y="' + y(q[1]) + '" text-anchor="' + q[2] + '" style="font-size:10.5px;font-weight:600;opacity:.85">' + q[3] + '</text>'));
  pts.forEach((p) => { s += '<circle cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="' + p.r + '" fill="' + p.c + '" fill-opacity=".7" stroke="' + p.c + '" stroke-width="1.5" ' + (p.id ? 'data-acct="' + p.id + '" ' : '') + 'data-tip="' + p.tip + '"/>'; });
  el.innerHTML = s + '</svg>';
}
function chartAccounts(el, w) {
  const accs = M.accounts.filter((a) => inReg(a.region));
  scatter(el, w, accs.map((a) => ({ x: a.health, y: a.whitespace, r: Math.min(18, 4 + Math.sqrt(a.arr_current) * 1.4), c: a.health < M.cfg.healthCut ? 'var(--bad)' : a.health >= 70 ? 'var(--data)' : 'var(--ink-3)', id: a.account_id, tip: '<b>' + esc(a.account_name) + '</b><br>Health ' + a.health + ' · yearly revenue ' + fm(a.arr_current) + '<br>Untapped revenue ' + fm(a.whitespace) + (a.nextProd ? ' · next: ' + a.nextProd : '') })), { x: [20, 100], y: [0, Math.max(10, Math.ceil(Math.max.apply(null, accs.map((a) => a.whitespace)) / 5) * 5)], xl: 'Account health', yl: 'Untapped revenue ($M)', lines: [{ v: M.cfg.healthCut }, { v: 70 }], quad: [[98, Math.max(8, Math.max.apply(null, accs.map((a) => a.whitespace)) * 1.05), 'end', 'Expand now'], [21, Math.max(8, Math.max.apply(null, accs.map((a) => a.whitespace)) * 1.05), 'start', 'Repair first']] });
}
function chartSellers(el, w) {
  const ss = M.aeRows.filter((s) => inReg(s.region)), n = ss.length, mx = mean(ss.map((s) => s.maturity)), my = mean(ss.map((s) => s.pace * 100));
  scatter(el, w, ss.map((s) => ({ x: s.maturity, y: Math.round(s.pace * 100), r: s.pilot_flag ? 7 : 5.5, c: +s.pilot_flag ? 'var(--red)' : 'var(--ink-3)', tip: '<b>' + esc(s.name) + '</b>' + (+s.pilot_flag ? ' · Databook user' : '') + '<br>Selling skill ' + s.maturity + ' · Progress ' + Math.round(s.pace * 100) + '%' })), { x: [40, 100], y: [0, 180], yu: '%', xl: 'Selling skill score', yl: 'Won so far against quota due so far', lines: [{ h: 100 }] });
}
const CHARTS = { history: chartHistory, acctScatter: chartAccounts, sellerScatter: chartSellers };
function mountCharts() { document.querySelectorAll('[data-chart]').forEach((el) => { const w = Math.floor(el.clientWidth); if (w > 60) CHARTS[el.dataset.chart](el, w); }); }
