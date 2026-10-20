# Zoom CRO go-to-market platform

A prototype for a Databook Labs panel interview: a Zoom CRO platform in three layers (Execution, Intelligence, Data) with an Account journey demo. All account data is synthetic. Read `README.md` for the page map and `deliverables/Presenter_Notes.md` for the pitch map and demo script.

## Where things live
- `zoom/` is the source of truth (`app1.js` to `app9.js`, `styles.css`, model files). `dist/index.html` is the built site that gets published.
- GitHub: `gayatrikulkaa-commits/zoom-cro-gtm-platform`, branch `main` (public: do not commit anything private).
- Replit: the Repl `zoom-cro-gtm-platform`, replId `1b876892-d851-49a9-b3d5-81d0f3ad7283`, published at https://zoom-cro-gtm-platform.replit.app (static deployment serving `dist/`).

## Making a change
1. Edit the sources in `zoom/`. Do not hand-edit `dist/index.html`.
2. Rebuild and test from the repo root:
   ```bash
   sh zoom/rebuild.sh
   cd zoom && node checks.js && node roundtrip.js && node coachtest.js && node gtmtest.js
   ```
   `roundtrip.js` needs `tools/node_modules` (`cd tools && npm install`). If data or the workbook changes, run `GEN=1 sh zoom/rebuild.sh` first.
3. Commit and push to GitHub (`dist/index.html` must be in the commit, because Replit serves it as is).
4. Publish to Replit with the Replit connector tools: call `update_app_using_prompt` on the replId above asking it to pull the latest `main` from GitHub and keep its own `.replit` deployment config, check with `list_app_files` that the new files arrived, then call `publish_app` and poll `get_publish_status` until it says success. Never publish before the pull has landed.

## House rules
- Keep the "Mock data" label and the synthetic-data disclosure visible. Only Zoom's reported revenue and guidance are real figures.
- Keep screens short: answer first, explanations behind a click. No Databook video embeds or links in the page.
- Browser Back must stay inside the platform: change screens with `setTab()` or `pushHash()`, never `history.replaceState` for navigation.
- The narrated `dist/walkthrough/` is a frozen copy of an earlier version; do not expect it to match.
- Ask before pushing or publishing unless the user has just asked for it.
