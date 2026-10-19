// Builds the narrated walkthrough: the Zoom CRO platform plus a voiceover player that switches tabs in time with the audio.
// Output: dist/walkthrough/artifact.html (fragment for publishing) and dist/walkthrough/index.html (full page for local preview).
// Needs the main build first (sh rebuild.sh) so dist/zoom/index.html is current, and deliverables/voiceover.mp3.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const base = fs.readFileSync(path.join(root, 'dist', 'zoom', 'index.html'), 'utf8');
const mp3 = fs.readFileSync(path.join(root, 'deliverables', 'voiceover.mp3')).toString('base64');
const css = fs.readFileSync(path.join(__dirname, 'walkthrough.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'walkthrough.js'), 'utf8');
// the walkthrough code goes at the end of the dashboard's own closure so it can call setTab()
const tail = '})();\n</script>';
const i = base.lastIndexOf(tail);
if (i < 0) throw new Error('could not find the end of the app script in dist/zoom/index.html');
let html = base.slice(0, i) + js + '\n' + base.slice(i);
html = html.replace('<title>Zoom CRO Command Center</title>', '<title>Zoom CRO Platform Walkthrough</title>');
html = html.replace('</style>', css + '\n</style>');
html = html.replace('<div id="zcro"></div>', '<div id="zcro"></div>\n<script>window.WT_AUDIO = "data:audio/mpeg;base64,' + mp3 + '";</script>');
fs.mkdirSync(path.join(root, 'dist', 'walkthrough'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'walkthrough', 'artifact.html'), html);
fs.writeFileSync(path.join(root, 'dist', 'walkthrough', 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">' + html + '</body></html>');
console.log('dist/walkthrough/artifact.html', (html.length / 1048576).toFixed(2) + ' MB');
