#!/bin/sh
# Rebuild the site from the current sources; add GEN=1 to regenerate the data and workbook first.
cd "$(dirname "$0")" || exit 1
[ -n "$GEN" ] && node gen.js > /dev/null
cat app1.js app2.js app2b.js app2c.js app2d.js app2e.js app3.js app5.js app6.js app7.js app8.js app9.js app4.js > "${TMPDIR:-/tmp}/zoom_app_check.js" && node --check "${TMPDIR:-/tmp}/zoom_app_check.js" || exit 1
node build.js || exit 1
# preview wrapper (full HTML page) for local testing
(echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'; cat ../dist/zoom/index.html; echo '</body></html>') > ../dist/preview.html
# the merged platform is the site root; the standalone GTM page stays at /gtm/
cp ../dist/preview.html ../dist/index.html
