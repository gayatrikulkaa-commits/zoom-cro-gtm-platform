# Platform change plan: simpler, one story with the deck, Databook's signal visible

Basis: the PRD, the six-slide pitch, Databook's Ramboll deck, the two assessment PDFs, and the live platform (every tab opened, code read in `zoom/`). Nothing has been changed yet. All figures below are from the synthetic data in the platform unless marked.

## 1. What I found

### The Hub does not yet say why Databook is the one signalling each number

| Hub number | What it shows now | What is missing |
| --- | --- | --- |
| Forecast $210M, "$234M with Databook" | Run-rate forecast from the 40-account portfolio (`gtm/accounts.json`) | No reason for the +$24M. Those per-account uplifts are set so the total lands on exactly $24M (`gtm/gen.js`); nothing derives them from signals |
| Upside +$4.6M "if the moves below land" | Bridge from assumptions (50% sponsor-push success, 25% expansion conversion, 30% in-year) | It sits next to a $24M headline on the same card. A CRO sees two uplifts |
| Revenue at risk $38.9M, 9 accounts | The sum of renewing ARR below the health line | Not shown: which signals flagged it (seat activation falling, no executive on calls, rival named, renewal date) or what each system contributed |
| Competitive deals 26% | Share of open pipeline naming a rival | Not shown: where the rival name came from, or which accounts |
| "Market share 12%" in the AI-play band | It is a win rate (rival named vs not), not share | Wrong label; the deck says the same thing on slide 3 |

### Things you asked for that exist but are buried (so the work is mostly surfacing)

| You asked for | Where it is today | Real numbers already in the data |
| --- | --- | --- |
| Marketing spend vs revenue | Pricing and promotions, Marketing sub-tab | Seven quarters, four channels: $15.8M spend, $66.7M bookings (4.2x). Expansion 12.3x, Partner 5.7x, Sales-sourced 3.4x, Marketing 2.4x |
| AEs onboarded this year and the revenue they made | Only a ramp-time line inside Sellers | 4 AEs hired Feb to Jul 2025; ramp 5.4 to 6.6 months (avg 6.1); FY27 closed $10.1M against $25.0M quota. This is the platform's own evidence for slide 6's "six months of ramp" |
| Top sellers and what they closed | Sellers, "Show every account executive" (closed). Revenue and uplift has "which sellers gain most", which is modeled uplift, not revenue | Priya Anand $5.1M, Marcus Reyes $2.9M, Oliver Grant $2.8M, Daniel Okafor $2.7M |
| Top accounts | Accounts (renewals at risk, ranked) and Revenue and uplift (top five uplift) | Two different lists, neither on the Hub, no mix of wins, risks and expansions |
| Five or ten accounts the CRO should focus on | Missing | Computable from account health, renewal date, in-flight, uplift, owner |

### Small defects to fix on the way

- Accounts headline says "8 accounts hold $38.9M"; the list below it shows 9 (Hub also says 9).
- One AE quota is $15.1M while the other 15 are $2.0M to $5.5M (looks like a seeding slip; it makes the 2025 cohort look 40% to quota instead of about 51%).
- 18 sidebar items. The PRD and the assessment both ask for fewer.
- No Verified / Inferred / Needs validation labels anywhere, and the five Databook dimensions (strategic priorities, financial drivers, management intent, competitive dynamics, timing) are not named on the account screens.

## 2. Deck and platform: where they disagree

| Slide | Deck says | Platform says | Fix |
| --- | --- | --- | --- |
| 5 | Region lights: AMER on plan, EMEA at risk, APAC behind. Slack channel `#acct-northwind`. Play: "Reframe the Contact Center play" | Americas Watch, EMEA Act now (but EMEA is above plan on bookings), APAC Act now. Lead account is Acme Corp; Northwind is play 2 | Use one anchor account in both. Recommend Northwind Traders (EMEA, $35.8M in flight, the deck already uses it). Make the platform's region wording match the deck |
| 5 | Prove: authorized, started, completed, accepted, buyer step | Same five boxes | Already aligned |
| 3 | "Market share: measured by win rate against named rivals" | Tile labelled "Market share 12%" | Rename both to "Win rate against named rivals" |
| 2 | "~96% of the $125B market untapped" | Not on the platform | The assessment is right that this is revenue over TAM, not share. Relabel as an illustrative scale comparison or drop it |
| 3 | Abstract (three columns) | Account journey has the real chain | Add one worked line to the slide: priority, Zoom product, seller play, buyer step, using the anchor account |
| 4 | "39% to 99%", "about 3% above plan", "two sellers reach the same strategy" | Ingress tab shows 39% vs 99% | Attribute all three to Databook on the slide; soften "same strategy" to "consistent strategy" |
| 6 | Hire 10 to 20 reps for $3M to $5M vs equip sellers | "Without vs with" tab was removed | Show the platform's own 2025 hire cohort on the Hub as the local evidence; keep the Databook example caveat on the slide |

## 3. Proposed CRO Hub (one screen, answer first)

1. **Answer line.** "Bookings are forecast at $58.1M against a $60.0M plan. $38.9M of renewals are at risk. Three decisions are worth about $X if approved."
2. **Four tiles, each with a "Databook signal" line** and an Evidence label (Verified record / Inferred / Modeled). Click a tile for the proof.
   - Bookings vs plan. Signal: forecast re-weighted on call activity and sponsor presence, against the sales team's own call.
   - Revenue at risk. Signal chips per account: seat activation falling (Grafana), no executive on calls (Gong), rival named (Gong, Salesforce), renewal inside N days (Salesforce).
   - Competitive exposure. Signal: rival named, from which system; named accounts; rival's own trigger where there is one (contract expiry, new executive).
   - Upside. A ledger, not a number: each line is move, signal, assumption, confidence, dollar type (bookings, protected revenue, pipeline kept separate).
3. **Top 5 accounts to focus on** (toggle to 10). A mix of one big win to protect, two at-risk renewals, one expansion, one competitive deal. Columns: account, AE, dollars, Databook signal, next move, date, status. Row opens the account.
4. **Three decisions** (the existing moves, trimmed). Approve / Defer / Ask for evidence, owner, date, dollar impact. Status is stored once and shown on Hub, Guided selling and Prove.
5. **Where the money comes from** (new, three small panels, one line each, link to detail).
   - Spend to revenue: marketing channels, with the "move the next dollar" read.
   - Hires to revenue: the 2025 AE cohort, ramp vs quota.
   - Sellers to revenue: top six by FY27 closed-won, and who is below pace.
6. **Region lights** compressed to one row each (deck slide 5 labels). The AI-play band shrinks to a single strip.
7. **Prove strip** unchanged.

## 4. Change list

| # | Change | Where | Priority | Risk |
| --- | --- | --- | --- | --- |
| 1 | Reconcile uplift: one ledger, derived from signals and stated assumptions. Keep $24M only if it can be built from the lines (or relabel it a four-quarter scenario) | `app5.js` `viewCommand`, `gtm/gen.js`, `model2.js` | P0 | Medium: touches the headline number and `gtmtest.js` |
| 2 | "Databook signal" line and Evidence label on every Hub tile and on each ledger line | `app5.js`, new helper in `app1.js` | P0 | Low |
| 3 | Top 5 / Top 10 focus table on the Hub | `app5.js` using `M.accounts` and `GA` | P0 | Low |
| 4 | Spend, hires and sellers panels on the Hub; expand Sellers and Marketing detail behind them | `app5.js`, `app2.js`, `app2e.js`; no new data | P0 | Low |
| 5 | Anchor account in one place (default for Hub row 1, Journey, Guided, deck) and fix region wording | `app5.js`, `app6.js`, `app8.js`, deck | P0 | Medium: presenter script is built on Acme |
| 6 | Rename "Market share" to "Win rate against named rivals" everywhere | `app5.js`, `app6.js` | P0 | Low |
| 7 | Approve / Defer / Ask for evidence stored once and read everywhere | existing `aStatus`, `desk.actionStatus` | P0 | Low |
| 8 | Name the five Databook dimensions on the account screen, each with source and Verified / Inferred / Needs validation | Account engine, Journey step 3 | P1 | Low |
| 9 | Sidebar from 18 items to about 11 by merging into sub-tabs (Revenue + Region and product + Forecast; Accounts + Account engine; Sellers + Pricing and marketing). Keep every hash route working | `app1.js` `TABS`, `ROUTE`, `app2e.js` | P1 | Medium: back-button and deep links |
| 10 | Fix the 8-vs-9 count and the AE quota outlier; rerun data and workbook | `app2c.js`, `gen.js` | P1 | Low |
| 11 | Edit the six slides as in section 2 | deck (`.pptx`) | P0 | Low |

## 5. From the PRD: what I would not build as new screens

The assessment and your note both say consolidate first. Mapping:

- Gold-standard expansion coach: the six-step seller coach already is one; add a "built from a validated won account" line with the match reasons.
- Recovery coach: the Contoso renewal play; same mechanism.
- Champion kit: the coach's executive brief and customer deck, with an editable "draft only, not sent" label.
- One agent with replanning: a status line on the Guided play (Planned, Awaiting approval, In progress, Evaluating, Completed), not a new tab.
- Integrations page: Ingress and Data and trust, with Connected / Simulated / Proposed labels.
- WBR, QBR, adoption: a saved view of the Hub and the Prove strip, not new pages.

## 6. Decisions I need from you

1. **Anchor account.** Northwind Traders (matches the deck, largest, EMEA) or Acme Corp (matches the current script)? I recommend Northwind.
2. **The $24M.** Rebuild it as the sum of the ledger lines, or keep it as a labelled four-quarter scenario beside a smaller, derived in-year number? I recommend the second: it stays honest and still tells the large story.
3. **Go-ahead** to build items 1 to 7 and 11 first (the Hub and the deck), then 8 to 10.

## 7. Verification once built

`sh zoom/rebuild.sh` then `node checks.js && node roundtrip.js && node coachtest.js && node gtmtest.js`, with new assertions: Hub tiles reconcile to the ledger, top-5 rows match Accounts and Guided owners, an approval on the Hub shows on Guided selling and Prove. I will also check the Hub on a phone width. Nothing is pushed or published until you say so.
