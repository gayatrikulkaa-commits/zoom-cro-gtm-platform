# The mock data, and how it connects to the platform

**Everything here is synthetic.** Company names are labels for fictional accounts: no figure, health score, risk, rival or signal comes from that company. The only real numbers in this repository are Zoom's reported FY26 revenue ($4,868.8M), Enterprise revenue ($2,934.1M), net dollar expansion (98%), customers over $100K (4,468) and FY27 guidance ($5.065B to $5.075B).

## Files

| File | What it is |
| --- | --- |
| `accounts_40.csv` | One row per account (40). The quickest way to read or load the data |
| `Zoom_CRO_Foundation.xlsx` | The full workbook: 21 sheets, the structure the platform reads. Edit a cell, load it, and the Hub moves |
| `../zoom/data.json` | The same tables as JSON, which the platform embeds |
| `../gtm/accounts.json` | The 40-account array: owner, products owned, rival, risk thread, and the dollars derived from the model |

Download from the live site: `/data/accounts_40.csv`, `/data/Zoom_CRO_Foundation.xlsx`, `/data/README.md`.

## `accounts_40.csv` columns

| Column | Meaning |
| --- | --- |
| `account_id`, `account_name`, `region`, `country`, `industry`, `segment` | Who the account is. Names are labels only |
| `seller` | The Zoom account executive who owns it |
| `yearly_revenue_usd_m` | What the account pays Zoom each year, in $M |
| `health_score` | 0 to 100: 35% product use, 25% engagement on calls, 20% delivery progress, 20% commercial signals |
| `renewal_date` | When the contract renews |
| `revenue_at_risk_usd_m` | Yearly revenue at risk, only if the account renews within 270 days and health is below 60. Higher when health is lower, halved if the renewal is more than 180 days away |
| `open_deals_usd_m` | Total of deals not yet won or lost |
| `agreed_by_sales_team_usd_m` | Open deals the sales team has marked "commit" |
| `expected_to_close_usd_m` | Databook's view of the open deals: each deal's chance to close, times its amount |
| `modeled_uplift_usd_m` | An estimate of extra new sales from the decisions, not a result |
| `owns_workplace`, `owns_phone`, `owns_contact_center`, `owns_ai` | 1 if the account already owns the product |
| `rival_named` | A rival named on its open deals or calls |
| `risk_thread` | single (one seller, no senior leader), business (no business case), stalled (next steps stuck), or blank |

## From the data to the CRO Hub

Each number on the Hub is computed from these tables. Nothing on the Hub is typed in.

| On the Hub | Where it comes from |
| --- | --- |
| **Forecast** | Closed so far this fiscal year (`sf_opportunities`, Closed Won since 1 Feb 2026) + open deals this and next quarter, each at Databook's chance to close + new deals assumed at 20% of next quarter's target (lever `q4_in_quarter_creation_share`) |
| **Target** | `targets` sheet: the plan by quarter, region and product |
| **Actual** | The closed-so-far part of the forecast |
| **Databook's chance to close** | Starts from the stage, then adds or subtracts for: senior leader on the deal (+7% / -11%), contacts engaged, days quiet (up to -24%), rival named (-5%), account health, delivery status. Levers `sponsor_bonus`, `no_sponsor_penalty`, `competitor_penalty`, `stale_days` |
| **Sales team's call** | `rep_probability` on each open deal in `sf_opportunities` |
| **Renewals at risk** | `sf_accounts` renewal date and health (usage from `grafana_usage`, engagement and rivals from `gong_calls`, delivery from `monday_projects`). Outside signals come from `external_signals` |
| **Win rate vs a rival** | Decided deals in `sf_opportunities` where `competitor` is named, against those where it is not |
| **Beyond target** | Forecast + the two sales decisions, against the target |
| **Customers asked for a product, no deal yet** | Products raised on `gong_calls` for healthy accounts with no open opportunity for that product |
| **Three decisions** | Reframe the Contact Center pitch: open Contact Center deals that name a rival or have no senior leader. Save renewals: the at-risk renewals. Senior leader: the remaining deals with none. Each estimate is the deal's gain in chance to close times an assumed success rate (`sponsor_push_success_rate` 50%, `renewal_rescue_save_rate` 40%). They never overlap and are never added together across kinds |
| **Key accounts** | Ranked by dollars at stake divided by the square root of days to the decision. At stake is revenue at risk, open deals naming a rival, or estimated expansion |
| **Funnel** | Open deals by `stage`, with counts of deals with no senior leader (`exec_sponsor`), a named rival, or fewer than 3 contacts (`contacts_engaged`) |
| **Return on spend** | `marketing_funnel`: `bookings_won` divided by `spend_usd_m`, for the five quarters that have had time to close |
| **Sellers hired last year** | `sf_users`: `hire_date` in FY26, `ramp_months_to_first_win`, and closed-won by `owner_id` |
| **Top sellers** | Closed-won since 1 Feb 2026 by owner. The 3+ contacts comparison uses decided deals in the last four quarters |
| **Sellers using Databook** | `pilot_flag` on `sf_users` |
| **Uplift and adoption** | The modeled uplift times the share of sellers using the plays (a slider). Behavior figures come from the pilot and control deals since 20 Jul 2026 |

## Change the data, change the Hub

Open the workbook, change a cell (for example a deal's `exec_sponsor`, an account's `renewal_date`, or a lever such as `sponsor_push_success_rate`), and load it in the platform (Data and trust, load a workbook). Statuses, the forecast and the decisions recompute. The workbook's `lineage` and `dictionary` sheets say, for every field, its source system, owner, refresh rate and whether it is real or synthetic.

## Regenerate

`GEN=1 sh zoom/rebuild.sh` regenerates the seeded data and the workbook. `node zoom/export-accounts.js` rewrites the CSV. The generator is seeded, so the data is reproducible.
