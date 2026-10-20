# The mock dataset behind the platform

Everything here is synthetic. Company names are used only as labels for fictional accounts: no figure, health score, risk, rival or signal is real or comes from that company. The only real numbers anywhere in this repository are Zoom's reported revenue and guidance (FY26 revenue $4,868.8M, Enterprise $2,934.1M, net dollar expansion 98%, customers over $100K 4,468, FY27 guidance $5.065B to $5.075B).

| File | What it is |
| --- | --- |
| `accounts_40.csv` | One row per account (40), the quickest way to read or load the data |
| `../deliverables/Zoom_CRO_Foundation.xlsx` | The full workbook: 21 sheets (accounts, contacts, 471 opportunities, sellers, calls, usage, delivery projects, outside signals, marketing funnel, targets, levers, lineage, dictionary). The platform reads this structure |
| `../zoom/data.json` | The same tables as JSON, which the platform embeds |
| `../gtm/accounts.json` | The 40-account array: owner, products owned, rival, risk thread, and the dollars derived from the model |

The `lineage` and `dictionary` sheets list, for every field, its source system, owner, refresh rate and whether it is real or synthetic.

Regenerate: `GEN=1 sh zoom/rebuild.sh`, then `node zoom/export-accounts.js`. The generator is seeded, so the data is reproducible.

Dollar figures in the CSV are USD millions. "Open deals" is the open pipeline, "agreed by sales team" is the commit category, "expected to close" is Databook's risk-adjusted view of open deals, and "modeled uplift" is an estimate from stated assumptions, not a result.
