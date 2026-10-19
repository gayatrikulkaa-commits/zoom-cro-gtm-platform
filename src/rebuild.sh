#!/bin/sh
cd "$(dirname "$0")" && node --check app.js && node gen-data.js >/dev/null && node build.js || exit 1
mk() { # name, pre-script
  (echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'; echo "<script>$2</script>"; cat ../dist/index.html; echo '</body></html>') > ../src/t-$1.html
}
mk overview ""
mk pipeline "window.__tab='pipeline'"
mk accounts "window.__tab='accounts'"
mk sellers "window.__tab='sellers'"
mk plan "window.__tab='plan'"
mk drawer "window.__drawer='a01'"
mk ask "window.__ask=['What changed in my forecast?','Who needs coaching this week?']"
