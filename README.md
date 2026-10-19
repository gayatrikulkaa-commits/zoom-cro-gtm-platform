# Zoom CRO platform: an AI sales transformation prototype

A single-page prototype of how a CRO at Zoom could run an AI-assisted go-to-market: forecast, sellers, accounts, pricing, competitive pressure, guided selling, and a deployment plan that covers data, process and change management.

**All data is synthetic.** Zoom is the example company. Account names are fictional and no figures come from Zoom or from any vendor system. The page carries a visible "Mock data" label.

## Pages

| Path | What it is |
| --- | --- |
| `/` | The platform (CRO Hub, My approach, Levers, Guided selling, Accounts, Sellers, Pricing, Compete, Coach, Decide, Studio, Lab, Sources) |
| `/walkthrough/` | The same platform with a narrated tour (about 98 seconds of voiceover) that switches tabs in time with the audio |

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

`zoom/` is the source of truth. `zoom/gen.js` is seeded, so the data is reproducible. `gtm/gen.js` generates the 40-account portfolio whose totals reconcile exactly ($480M in flight, $185M commit, $210M forecast, $24M scenario uplift).

## Deploy on Replit

Import this repository into Replit (replit.com/github, then choose the repo). The `.replit` file configures a static deployment that serves `dist/`.

## What is simulated

The Studio compiler, the Ask assistant and the seller coach are deterministic simulations, not live models. The $24M uplift is a scenario, not a measured result. Statements attributed to a vendor are labelled as that vendor's own claims.
