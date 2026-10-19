const fs = require('fs'), path = require('path');
const r = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const data = r('data.json'), css = r('styles.css'), model = r('model.js') + '\n' + r('model2.js') + '\n' + r('coach.js'), geo = r('geo.json'), gtm = fs.readFileSync(path.join(__dirname, '..', 'gtm', 'accounts.json'), 'utf8'), app = ['app1.js', 'app2.js', 'app2b.js', 'app2c.js', 'app2d.js', 'app2e.js', 'app3.js', 'app5.js', 'app6.js', 'app7.js', 'app8.js', 'app9.js', 'app4.js'].map(r).join('\n');
const html = `<title>Zoom CRO Command Center</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
<div id="zcro"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>
<script>window.DATA = ${data.replace(/<\/script/g, '<\\/script')};window.GEO = ${geo};window.GTM = ${gtm.replace(/<\/script/g, '<\\/script')};</script>
<script>${model}</script>
<script>
(function () {
'use strict';
${app}
})();
</script>
`;
fs.mkdirSync(path.join(__dirname, '..', 'dist', 'zoom'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'zoom', 'index.html'), html);
console.log('dist/zoom/index.html', (html.length / 1024).toFixed(0) + ' KB');
