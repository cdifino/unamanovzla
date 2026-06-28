// Limpia src/data/hospitales.json:
//  - Quita puntos fuera de Venezuela (datos erroneos de OSM, p.ej. Paraguay).
//  - Quita nombres genericos sin identidad (Modulo, Ambulatorio, IPS, IPN).
// Genera tambien supabase/cleanup_locations.sql para borrar esas filas
// de la base de datos de produccion.
// Uso: node scripts/clean-hospitals.mjs
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'src/data/hospitales.json')
const hospitales = JSON.parse(fs.readFileSync(file))

// Caja geografica del area metropolitana de Caracas / Miranda / La Guaira.
const inVenezuela = (l) =>
  Number.isFinite(l.lat) && Number.isFinite(l.lng) &&
  l.lat >= 9.5 && l.lat <= 11.2 && l.lng >= -67.6 && l.lng <= -65.5

const norm = (s) =>
  (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const GENERIC = new Set(['modulo', 'ambulatorio', 'ips', 'ipn'])

const removed = []
const kept = []
for (const h of hospitales) {
  if (!inVenezuela(h)) { removed.push({ ...h, reason: 'fuera de Venezuela' }); continue }
  if (GENERIC.has(norm(h.name))) { removed.push({ ...h, reason: 'nombre generico' }); continue }
  kept.push(h)
}

fs.writeFileSync(file, JSON.stringify(kept, null, 2) + '\n')

const ids = removed.map((r) => `    '${r.id.replace(/'/g, "''")}'`).join(',\n')
const cleanup = `-- ===========================================================================
-- Mapa de Ayuda — Limpieza de ubicaciones erroneas en PRODUCCION
-- Ejecuta este archivo en: Supabase > SQL Editor.
-- Borra ${removed.length} hospitales mal importados de OpenStreetMap
-- (fuera de Venezuela o con nombres genericos sin identidad).
-- ===========================================================================
delete from public.locations where id in (
${ids}
);
`
fs.writeFileSync(join(root, 'supabase/cleanup_locations.sql'), cleanup)

console.log(`Hospitales: ${hospitales.length} -> ${kept.length} (removidos ${removed.length})`)
const byReason = {}
removed.forEach((r) => { byReason[r.reason] = (byReason[r.reason] || 0) + 1 })
console.log('Motivos:', JSON.stringify(byReason))
console.log('cleanup_locations.sql generado.')
