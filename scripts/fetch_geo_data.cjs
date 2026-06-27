const fs = require('fs');
const path = require('path');
const https = require('https');
const osmtogeojson = require('osmtogeojson');

const ROOT = 'C:\\Users\\cadifino\\mapa-ayuda';
const DATA_DIR = path.join(ROOT, 'src', 'data');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const STATES = ['Distrito Capital', 'Miranda', 'La Guaira'];

function overpass(query, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);
    const req = https.request(OVERPASS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'mapa-ayuda-data-fetch/1.0'
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Overpass HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (err) { reject(new Error(`Invalid JSON from Overpass: ${err.message}\n${data.slice(0, 500)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Overpass request timed out')));
    req.write(body);
    req.end();
  });
}

async function overpassRetry(query, timeoutMs, label, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      console.log(`Fetching ${label} (attempt ${i}/${tries})...`);
      return await overpass(query, timeoutMs);
    } catch (err) {
      lastErr = err;
      console.warn(`${label} attempt ${i} failed: ${err.message}`);
      if (i < tries) await new Promise(r => setTimeout(r, 10000 * i));
    }
  }
  throw lastErr;
}

function slugBase(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-nombre';
}

function uniqueSlug(value, seen) {
  const base = slugBase(value);
  let slug = base;
  let n = 2;
  while (seen.has(slug)) slug = `${base}-${n++}`;
  seen.add(slug);
  return slug;
}

function ringAreaAndCentroid(ring) {
  let twiceArea = 0, x = 0, y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j], [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    twiceArea += f;
    x += (x0 + x1) * f;
    y += (y0 + y1) * f;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    const sums = ring.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
    return { area: 0, centroid: [sums[0] / ring.length, sums[1] / ring.length] };
  }
  return { area: Math.abs(twiceArea / 2), centroid: [x / (3 * twiceArea), y / (3 * twiceArea)] };
}

function geomCentroid(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null;
  for (const poly of polys) {
    if (!poly || !poly[0] || poly[0].length < 3) continue;
    const c = ringAreaAndCentroid(poly[0]);
    if (!best || c.area > best.area) best = c;
  }
  return best ? best.centroid : null;
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-20) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, poly) {
  if (!pointInRing(point, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(point, poly[i])) return false;
  return true;
}

function pointInGeometry(point, geom) {
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInPolygon(point, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some(poly => pointInPolygon(point, poly));
  return false;
}

function bboxOfGeom(geom) {
  const pts = [];
  const walk = (x) => Array.isArray(x[0]) ? x.forEach(walk) : pts.push(x);
  walk(geom.coordinates);
  return pts.reduce((b, p) => [
    Math.min(b[0], p[0]), Math.min(b[1], p[1]),
    Math.max(b[2], p[0]), Math.max(b[3], p[1])
  ], [Infinity, Infinity, -Infinity, -Infinity]);
}

function pointInBbox(point, bbox, pad = 0.01) {
  return point[0] >= bbox[0] - pad && point[0] <= bbox[2] + pad &&
    point[1] >= bbox[1] - pad && point[1] <= bbox[3] + pad;
}

function inferState(point, stateFeatures) {
  for (const f of stateFeatures) if (pointInGeometry(point, f.geometry)) return f.properties.name;
  for (const f of stateFeatures) if (pointInBbox(point, f.bbox, 0.02)) return f.properties.name;
  const [lng, lat] = point;
  if (lat >= 10.34 && lat <= 10.62 && lng >= -67.08 && lng <= -66.72) return 'Distrito Capital';
  if (lat >= 10.48 && lng >= -67.45 && lng <= -66.55) return 'La Guaira';
  return 'Miranda';
}

function convertFeatures(osm) {
  const gj = osmtogeojson(osm, { flatProperties: false });
  return (gj.features || []).filter(f => f.geometry && ['Polygon', 'MultiPolygon'].includes(f.geometry.type));
}

function featureName(f) {
  return f.properties?.tags?.name || f.properties?.name || '';
}

function normalizeStateFeatures(osm) {
  return convertFeatures(osm)
    .map(f => {
      const name = featureName(f);
      if (!STATES.includes(name)) return null;
      return { type: 'Feature', properties: { name }, geometry: f.geometry, bbox: bboxOfGeom(f.geometry) };
    })
    .filter(Boolean);
}

function municipioFor(point, municipioFeatures) {
  const hit = municipioFeatures.find(f => pointInGeometry(point, f.geometry));
  return hit ? hit.properties.name : undefined;
}

function centerOfElement(el) {
  if (el.lat != null && el.lon != null) return [el.lon, el.lat];
  if (el.center && el.center.lat != null && el.center.lon != null) return [el.center.lon, el.center.lat];
  return null;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });

  const queryForAdmin = (level) => `[out:json][timeout:240];
(
  area["admin_level"="4"]["name"="Distrito Capital"];
  area["admin_level"="4"]["name"="Miranda"];
  area["admin_level"="4"]["name"="La Guaira"];
)->.states;
(
  relation["boundary"="administrative"]["admin_level"="${level}"](area.states);
);
out geom;`;

  let raw = await overpassRetry(queryForAdmin(8), 260000, 'admin_level=8 parroquias');
  let level = 8;
  const count8 = (raw.elements || []).filter(e => e.type === 'relation').length;
  if (count8 < 70) {
    const raw7 = await overpassRetry(queryForAdmin(7), 260000, 'admin_level=7 fallback');
    const count7 = (raw7.elements || []).filter(e => e.type === 'relation').length;
    if (count7 > count8) {
      raw = raw7;
      level = 7;
    }
  }
  fs.writeFileSync(path.join(SCRIPTS_DIR, 'overpass_raw.json'), JSON.stringify(raw, null, 2));

  const stateQuery = `[out:json][timeout:180];
(
  relation["boundary"="administrative"]["admin_level"="4"]["name"="Distrito Capital"];
  relation["boundary"="administrative"]["admin_level"="4"]["name"="Miranda"];
  relation["boundary"="administrative"]["admin_level"="4"]["name"="La Guaira"];
);
out geom;`;
  const stateRaw = await overpassRetry(stateQuery, 200000, 'state boundaries');
  fs.writeFileSync(path.join(SCRIPTS_DIR, 'states_raw.json'), JSON.stringify(stateRaw, null, 2));
  const stateFeatures = normalizeStateFeatures(stateRaw);

  let municipioFeatures = [];
  try {
    const municipiosQuery = `[out:json][timeout:180];
(
  area["admin_level"="4"]["name"="Distrito Capital"];
  area["admin_level"="4"]["name"="Miranda"];
  area["admin_level"="4"]["name"="La Guaira"];
)->.states;
(
  relation["boundary"="administrative"]["admin_level"="6"](area.states);
);
out geom;`;
    const municipiosRaw = await overpassRetry(municipiosQuery, 200000, 'municipio boundaries', 2);
    fs.writeFileSync(path.join(SCRIPTS_DIR, 'municipios_raw.json'), JSON.stringify(municipiosRaw, null, 2));
    municipioFeatures = convertFeatures(municipiosRaw).map(f => ({
      type: 'Feature',
      properties: { name: featureName(f) },
      geometry: f.geometry
    })).filter(f => f.properties.name);
  } catch (err) {
    console.warn(`Municipios unavailable: ${err.message}`);
  }

  const seenParroquias = new Set();
  const features = convertFeatures(raw).map(f => {
    const name = featureName(f);
    const centroid = geomCentroid(f.geometry);
    if (!name || !centroid) return null;
    const state = inferState(centroid, stateFeatures);
    const municipio = municipioFor(centroid, municipioFeatures);
    const props = {
      id: uniqueSlug(`${state}-${name}`, seenParroquias),
      name,
      kind: 'parroquia',
      state
    };
    if (municipio) props.municipio = municipio;
    return { type: 'Feature', properties: props, geometry: f.geometry, _centroid: centroid };
  }).filter(Boolean);

  const fc = {
    type: 'FeatureCollection',
    metadata: { source: 'OpenStreetMap Overpass API', admin_level: level, fetched_at: new Date().toISOString() },
    features: features.map(({ _centroid, ...f }) => f)
  };
  fs.writeFileSync(path.join(DATA_DIR, 'parroquias.geojson'), JSON.stringify(fc, null, 2));

  const points = features.map(f => ({
    id: f.properties.id,
    name: f.properties.name,
    kind: 'parroquia',
    state: f.properties.state,
    ...(f.properties.municipio ? { municipio: f.properties.municipio } : {}),
    lat: Number(f._centroid[1].toFixed(6)),
    lng: Number(f._centroid[0].toFixed(6))
  }));
  fs.writeFileSync(path.join(DATA_DIR, 'parroquias_points.json'), JSON.stringify(points, null, 2));

  const hospitalQuery = `[out:json][timeout:180];
(
  area["admin_level"="4"]["name"="Distrito Capital"];
  area["admin_level"="4"]["name"="Miranda"];
  area["admin_level"="4"]["name"="La Guaira"];
)->.states;
(
  node["amenity"="hospital"](area.states);
  way["amenity"="hospital"](area.states);
  relation["amenity"="hospital"](area.states);
);
out center;`;
  const hospitalsRaw = await overpassRetry(hospitalQuery, 200000, 'hospitals');
  fs.writeFileSync(path.join(SCRIPTS_DIR, 'hospitals_raw.json'), JSON.stringify(hospitalsRaw, null, 2));
  const seenHospitals = new Set();
  const hospitals = (hospitalsRaw.elements || []).map(el => {
    const name = el.tags && el.tags.name;
    const center = centerOfElement(el);
    if (!name || !center) return null;
    const state = inferState(center, stateFeatures);
    return {
      id: uniqueSlug(`${state}-${name}`, seenHospitals),
      name,
      kind: 'hospital',
      state,
      lat: Number(center[1].toFixed(6)),
      lng: Number(center[0].toFixed(6))
    };
  }).filter(Boolean).sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(DATA_DIR, 'hospitales.json'), JSON.stringify(hospitals, null, 2));

  const counts = STATES.reduce((acc, s) => {
    acc.parroquias[s] = points.filter(p => p.state === s).length;
    acc.hospitals[s] = hospitals.filter(h => h.state === s).length;
    return acc;
  }, { parroquias: {}, hospitals: {} });
  console.log(JSON.stringify({
    admin_level_used: level,
    parroquias: counts.parroquias,
    hospitals: counts.hospitals,
    total_hospitals: hospitals.length,
    geojson_property_keys: Object.keys(fc.features[0]?.properties || {})
  }, null, 2));
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
