# Presenter notes: Zoom CRO GTM Decision System

These are for you to talk through. None of this is on the platform. Figures marked *(Databook states)* are Databook's own claims from the launch webinar. Everything else is either Zoom's reported numbers or mock data from the prototype.

---

> The current script is `Talk_Track_20min.md`, with a spoken version in `talk_track_script.txt` and a rehearsal recording, `Talk_Track_rehearsal.m4a`. The sections below are background.

## 0. The story in one breath

"AI sales transformation is not only about the top line. It is about whether Zoom's brand and product value reach the buyer, because that is what moves the top line. So the CRO should not react to numbers after the fact. Databook reads first-party context (Salesforce, Gong, Grafana, monday.com and what sellers record) and third-party context (filings, earnings calls, news, licensed data), predicts where revenue will move, and equips sellers to act before it does."

Four things the platform shows, in the order a CRO would ask for them:
1. **What will happen, and why we think so.** Every Hub number says how Databook sees it, from which systems, and whether that is a record (Verified), a Databook read (Inferred) or a hypothesis (Needs validation).
2. **What to do about it.** Three decisions, each with an owner, a date, a modeled impact and an approval that updates every screen.
3. **Where to spend time.** Top 5 or Top 10 accounts, a mix of risks and a win to repeat. Win and loss patterns that predict a loss, and how many open deals show them today.
4. **What the money returns.** Marketing spend, new hires and top sellers against revenue, with the gold-standard habit to copy.

## 0a. Run of show: about 20 minutes (deck 8, platform 10, buffer 2)

| Time | Where | Say | Click |
| --- | --- | --- | --- |
| 0:00 to 8:00 | Deck, six slides | Zoom's need, the market gap, how Databook helps, the three layers, the loop, hire or equip | Slide 5 sets up the platform |
| 8:00 | **CRO Hub** | "Bookings are forecast at $58.1M against $60.0M. Two decisions close the $1.9M gap and a third protects $14.6M of renewals." | Open the page |
| 8:45 | Four tiles | "Each number says how Databook sees it: which systems, first-party or outside data." Mention the Databook mark-down and mark-up on open deals | Tap **Renewal revenue at risk**: nine renewals, the signals per account, the rule, and the outside leadership or vendor change on seven of them. Close |
| 10:00 | **Three decisions** | "Each has an owner, a date, a modeled impact and a confidence. Bookings and renewals protected are never added together." | On decision 1 click **Start with Northwind Traders** |
| 11:00 | **Northwind account** | The read in one sentence. Then the five angles: strategic priorities, financial drivers, management intent, competition, timing. Point at the labels: the Q3 downsizing mandate is *Needs validation*, no savings figure is quoted until the customer shares a baseline | Click **Approve play** |
| 13:30 | **Guided selling** | "The play is four steps in Slack and Salesforce. The CRO approves first because sellers ignore nudges that do not come from a manager." | **Guide the seller**, then **Message the account team**, edit, **Send** (simulated) |
| 15:00 | **Seller coach** (optional, 30 s) | "The same account in a six-step coach that ends in a brief and a customer deck" | **Open the seller coach** |
| 15:30 | **CRO Hub** again | Top accounts row now reads *Approved · 0 of 4 done*. Scroll to *Why we win and lose* and *Where the money comes from* | Click Hub in the sidebar |
| 17:30 | **Prove** | "Authorized, started, completed, accepted, buyer step. Revenue is not claimed until it shows up, about 110 days later. Baseline is the CFO's plan" | Sidebar, Prove |
| 18:30 | Close on slide 6 | Behaviors and systems move together | Back to the deck |

If you are interrupted, every route is one click: **Under the hood** has data and trust, feeds and matching (39% to 99%), how it reasons, and the Studio. **Performance** has regions, forecast, sellers, spend and pricing, rivals.

## 0b. What each Hub block is for

| Block | The point you are making |
| --- | --- |
| Four tiles | The value of Databook is a different, earlier read on the same dollars, with the evidence one tap away |
| Three decisions | The CRO has no time for a 50-step approval flow; these three move the top line |
| Where to spend your time | A CRO's attention is the scarce resource; this ranks it by dollars and urgency and keeps the accounts where decisions start on the list |
| Why we win and lose | Win and loss as patterns Databook can see before the deal is lost. Contact Center is where Zoom loses most (28% win rate) |
| Positioning | The AI-first story only lands if senior buyers hear it: 40% of calls have an executive, 11 of 40 accounts own Contact Center or AI, $11.9M was asked for with no deal open |
| Where the money comes from | Spend returns 4.3x overall, 2.4x on Marketing and 12x on Expansion; FY26 hires take about six months to a first win; the top three sellers engage three or more contacts on 70% of deals, against 57% |
| Where it stands, by region | The traffic lights from slide 5 |
| Prove strip | The loop from slide 5, with revenue honestly pending |

## 0c. Likely questions, and the honest answer

1. **Zoom could build this dashboard in a weekend.** Yes for the front end. What it cannot cheaply build is the licensed outside data, entity resolution across four systems (39% by text matching against 99% with Databook, as Databook states), the same answer for every seller, and proof against a baseline. See Under the hood, How it reasons.
2. **How do you know the $2.0M is right?** It is not a result. It is deals the signals call fixable, times an assumed 50% success rate. Both are on the ledger, with a confidence of Medium. Revenue is claimed only after closed deals show it.
3. **Is Databook doing this today?** The platform is a proposed engagement. The customer context graph, guided workflows, AI Studio and Control Center are Databook's documented positioning; the exact screens and numbers here are a prototype on synthetic data.
4. **Why is Northwind first?** It is where decision 1 starts: Contact Center, a rival named on the deal, a business case missing, a $1.0M deal closing November 5, and $5.6M already lost to rivals there in four quarters.
5. **Account names look real.** Several account names are real companies with invented data, labelled Mock data. If that is a concern, rename them before sharing (see the open items below).
6. **Is the pilot proof?** No. Sellers chose to join, the sample is 25 and 31 deals, and the ranges overlap. It is a leading signal. Attribution needs a comparison group and the CFO's plan as the baseline.
7. **How is Databook paid?** Outcome-based as Databook states: a platform fee plus about 3% of revenue above plan; the platform fee is not disclosed.
8. **What do you do in the first 30 days?** Section 2 below.

---

## 2. My approach: data, process and change management

Databook supplies the context and the reasoning. Three things decide whether it works at Zoom.

**Data: trust before intelligence**
- If the AI resolves the wrong company, everything above it is wrong and still sounds confident. So: entity resolution first.
- Every field has an owner, a refresh schedule and a place to fix it. Real, simulated and insufficient are labeled as such; nothing is guessed.
- Stale feeds and failed checks are shown to the CRO, not buried.

**Process: decisions with owners**
- Every move has an owner, a due date, a dollar impact and a confidence. Different kinds of impact (bookings, revenue protected, pipeline) are never added together.
- The CRO approves before a seller sees a play. Every change is logged.
- Zoom's own sales stages drive the methodology check: it says what should exist at each stage, then looks for it in the account's context.

**Change management: adoption measured as behavior**
- Measure within weeks what people do (approved, coached, acted, buyer next step), then revenue two quarters later.
- Pilot with baselines first and a comparison group. Sellers chose to join, so a gap between pilot and others is not proof. Gate the next region on adoption.

**How it lands *(Databook states)***: 1 to 2 weeks to calibrate, 3 to 4 weeks to launch the data and intelligence layers, then about 90 days of risk-free proof with two to four workflows. Ownership then moves to revenue operations: usually single-digit people, rarely full time. Databook says roughly nine in ten AI transformations fail to deliver measurable outcomes because of adoption and process change, not technology, which is why behaviors and systems have to move together.

**First 30 days**
1. Name an owner for every source (Salesforce, Gong, monday.com, Grafana, outside data).
2. Baseline three leading measures and one outcome, with the CFO's plan as the baseline.
3. Sales operations writes the stage criteria for the methodology check.
4. Set the adoption gate: what share of sellers must be active before a second region joins.
5. Pick two to four workflows that solve a problem Zoom has today.

---

## 3. With and without Databook

**The core question:** to add revenue, you either hire more reps or help the reps you have sell better.

| | Without Databook: hire | With Databook: existing reps |
|---|---|---|
| To add $10M | 10 to 20 reps *(Databook states)* | No hires |
| Cost | About $3M to $5M *(Databook states)*, before marketing, training and tools | Platform fee, plus about 3% of revenue above plan, so about $0.3M for each $10M above plan *(Databook states; the platform fee is not disclosed)* |
| Time | About 6 months of ramp | 1 to 2 weeks to calibrate, 3 to 4 to launch, then a 90-day proof |
| Risk | Base pay is owed even if a rep misses quota | If revenue does not show up, only the platform fee is owed |

The baseline is the CFO's own plan, agreed before work begins, and the system measures the result, not Databook.

**The seven levers for the reps you already have**

| Lever | Without | With | Size in this prototype (mock) |
|---|---|---|---|
| Work the highest-propensity accounts | Territories set from CRM fields, refreshed rarely | Accounts scored from the context graph and outside signals; weights move with usage, renewals, contracts | Sales Ops Studio compiles a scoring rule |
| Engage senior executives and budget authority | Single-threaded deals surface when they slip | Risk threads flag them early; a guided play books the meeting | +$2.5M bookings (modeled) |
| Better conversations about the customer's needs | Decks built from the champion's view | Meeting prep starts from why change, why now, why us | Pilot sellers: senior leader on 68% of deals vs 35% for others (observational, small sample) |
| Save slipping renewals | Risk reaches the CRO at the quarterly review | Usage, calls and delivery combined per account | +$14.6M revenue protected (modeled) |
| Open the expansion customers ask for | Asks stay in call notes | Asks matched to products not yet in play | +$0.9M bookings counted this year (modeled) |
| Hold the price, use the right offers | Discounts creep up on weak deals | Same context shows which offers lift win rate | See Pricing and promotions |
| Close the leaks between handoffs | About 30% of context lost at each handoff | Context graph keeps the account story intact | 700 leads become about 58 customers, 8.2% *(Databook's illustration, not measured here)* |

**What a CRO sees today, and what is missing**
- Today: static forecast slides, Excel exports for the 13-week commit, stage-based forecasts in dashboards.
- Missing: about half of pipeline drops within five weeks of the start of a quarter *(Databook states)*; the champion may not be telling the rep the whole story; no predicted next best action for the top 20 deals the CRO cannot get to.
- With Databook: risk threads on every deal with evidence, a next best move handed to the seller with the CRO's approval, and a closed loop showing whether execution improved.

**Three commercial models**
1. *Account-based:* priced per account, invoiced up front. Hard to tie to a business case.
2. *Consumption-based:* start with one team, widen as workflows prove out. Cost moves with adoption.
3. *Outcome-based:* small platform fee, then about 3% of revenue above your plan. Full risk-sharing.

**Questions to settle early** (the webinar states the outcome, not the mechanics)
- Which artifacts count as Zoom's IP: workflow and agent definitions, scoring weights, playbooks, prompts?
- Can they be exported and run without Databook?
- Who picks the model for each workflow, and what does a change cost?
- What happens to Zoom's graph and data when the contract ends?

---

## What is real and what is not

- Real: Zoom's reported FY26 revenue ($4,868.8M), Enterprise revenue ($2,934.1M), net dollar expansion rate (98%), customers over $100K (4,468) and FY27 guidance ($5.065B to $5.075B).
- Mock: every account, deal, call, project and signal. The $24M uplift is a scenario, not a measured result. The Studio compiler, the Ask assistant and the seller coach are simulations.
