# Zoom CRO platform: an AI sales transformation prototype

A single-page prototype of how a CRO at Zoom could run an AI-assisted go-to-market: forecast, sellers, accounts, pricing, competitive pressure, guided selling, and a deployment plan that covers data, process and change management.

**All data is synthetic.** Zoom is the example company. Account names are fictional and no figures come from Zoom or from any vendor system. The page carries a visible "Mock data" label.

## Pages

| Path | What it is |
| --- | --- |
| `/` | The platform, in five steps and six screens. **CRO Hub** (see and decide): the answer, four numbers that each say how Databook sees them, three decisions, the top 5 or 10 accounts, win and loss patterns, positioning, and spend, hires and sellers against revenue. **Accounts** (find): every account with its five angles (strategic priorities, financial drivers, management intent, competition, timing), each labelled Verified, Inferred or Needs validation. **Performance** (find): regions and products, forecast, sellers, spend and pricing, rivals. **Guided selling** (guide): the plays behind the three decisions, the Coach studio and the seller coach. **Prove**: the loop, the ledger behind the upside, and how it would be measured. **Connections**: where insights, plays and decks go (all simulated), where signals come from, a use-case request box, and a settings panel for the Hub. **Under the hood**: data and trust, feeds and matching, how it reasons, the Sales Ops Studio, the Workspace, approvals and rules |
| `/walkthrough/` | A frozen copy of the earlier version of the platform with a narrated tour (about 98 seconds of voiceover). It predates the three-layer restructure and is not rebuilt with the platform |

`dist/` holds the built, self-contained pages, so hosting needs no build step. The pages load Inter from Google Fonts, `xlsx` from cdnjs and `pptxgenjs` from jsdelivr, so they need an internet connection.

## Run locally

```bash
node tools/serve.js        # http://localhost:8765 (set PORT to change it)
```

## Rebuild and test

```bash
cd tools && npm install && cd ..   # only needed for the workbook and deck scripts and the tests that use them
cd zoom
GEN=1 sh rebuild.sh                # regenerate the seeded data and workbook, then build dist/
node build-walkthrough.js          # optional: rebuild the narrated walkthrough
node checks.js && node roundtrip.js && node coachtest.js && node gtmtest.js
```

`zoom/` is the source of truth. `deliverables/Presenter_Notes.md` holds the pitch-to-platform map, the demo script, the talk track, the approach and the with-and-without-Databook comparison, which are no longer part of the platform. `zoom/gen.js` is seeded, so the data is reproducible. `gtm/gen.js` builds the 40-account array from the dashboard model, so its dollars are the model's own (open pipeline, commit, risk-adjusted forecast, modeled uplift) and every screen agrees.

## Deploy on Replit

Import this repository into Replit (replit.com/github, then choose the repo). The `.replit` file configures a static deployment that serves `dist/`.

## What is simulated

The Studio compiler, the Ask assistant and the seller coach are deterministic simulations, not live models. The modeled impacts (bookings, renewals protected) are estimates from stated assumptions, not measured results. Statements attributed to a vendor are labelled as that vendor's own claims.
