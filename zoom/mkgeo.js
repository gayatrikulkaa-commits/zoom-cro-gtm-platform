// One-off build step: turns Natural Earth 110m (world-atlas TopoJSON) into compact SVG paths for the Compete map.
// usage: node mkgeo.js <countries-110m.json>  -> writes geo.json next to this file
const fs = require('fs'), path = require('path');
const topo = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const { scale, translate } = topo.transform, W = 1000, LON0 = -170, LON1 = 180, LAT0 = -57, LAT1 = 80;
const H = Math.round((W * (LAT1 - LAT0)) / (LON1 - LON0));
const px = (lon) => ((lon - LON0) / (LON1 - LON0)) * W, py = (lat) => ((LAT1 - lat) / (LAT1 - LAT0)) * H;
// decode arcs (delta-encoded) to lon/lat
const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; }); });
const ring = (idx) => { const pts = []; idx.forEach((i) => { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; a.forEach((p, k) => { if (k || !pts.length) pts.push(p); }); }); return pts; };
const f1 = (n) => (Math.round(n * 10) / 10).toString();
function pathOf(geom) {
  const polys = geom.type === 'Polygon' ? [geom.arcs] : geom.arcs;
  let d = '';
  polys.forEach((poly) => poly.forEach((r) => {
    const pts = ring(r).filter((p) => p[1] > LAT0 - 5);
    if (pts.length < 3) return;
    let last = null, s = '';
    pts.forEach((p, k) => { const x = px(p[0]), y = py(p[1]); if (last && Math.abs(x - last[0]) < 0.4 && Math.abs(y - last[1]) < 0.4) return; s += (k && last ? 'L' : 'M') + f1(x) + ' ' + f1(y); last = [x, y]; });
    d += s + 'Z';
  }));
  return d;
}
const KEEP = { 840: 'US', 124: 'CA', 32: 'AR', 826: 'UK', 276: 'DE', 756: 'CH', 250: 'FR', 724: 'ES', 528: 'NL', 392: 'JP', 410: 'KR', 356: 'IN', 36: 'AU' };
let land = ''; const c = {};
topo.objects.countries.geometries.forEach((g) => {
  const id = +g.id; if (id === 10) return; // Antarctica
  const d = pathOf(g); if (!d) return;
  if (KEEP[id]) c[KEEP[id]] = d; else land += d;
});
const out = { w: W, h: H, lon0: LON0, lon1: LON1, lat0: LAT0, lat1: LAT1, land, c };
fs.writeFileSync(path.join(__dirname, 'geo.json'), JSON.stringify(out));
console.log('geo.json', Math.round(JSON.stringify(out).length / 1024) + ' KB', 'h', H, Object.keys(c).join(','));
