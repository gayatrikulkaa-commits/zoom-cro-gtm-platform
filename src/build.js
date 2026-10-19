const fs = require('fs'), path = require('path');
const r = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const data = r('data.json'), css = r('styles.css'), js = r('app.js');
const html = `<title>CRO Command Center</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Schibsted+Grotesk:wght@500;600;700;800&display=swap">
<style>
${css}
</style>
<div id="cro"></div>
<script>window.DATA = ${data};</script>
<script>
${js}
</script>
`;
fs.mkdirSync(path.join(__dirname, '..', 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
