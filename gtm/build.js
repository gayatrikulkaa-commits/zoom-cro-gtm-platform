// Assembles the GTM Operating System into one self-contained page at dist/index.html (the site root).
const fs = require('fs'), path = require('path');
const r = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark"><title>Zoom Enterprise GTM Operating System</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
${r('styles.css')}
</style></head><body>
<div id="gtm"></div>
<script>window.GTM = ${r('accounts.json').replace(/<\/script/g, '<\\/script')};</script>
<script>
${r('app.js')}
</script>
</body></html>
`;
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'gtm', 'index.html'), html);
console.log('dist/gtm/index.html', (html.length / 1024).toFixed(0) + ' KB');
// The same page as a fragment for publishing as an artifact (the host adds the document skeleton).
const frag = `<title>Zoom GTM Operating System</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
${r('styles.css')}
</style>
<div id="gtm"></div>
<script>window.GTM = ${r('accounts.json').replace(/<\/script/g, '<\\/script')};</script>
<script>
${r('app.js')}
</script>
`;
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'gtm-artifact.html'), frag);
console.log('dist/gtm-artifact.html', (frag.length / 1024).toFixed(0) + ' KB');
