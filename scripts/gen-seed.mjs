// Genera supabase/seed.sql a partir del catalogo de ubicaciones.
// Uso: node scripts/gen-seed.mjs
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const parroquias = JSON.parse(fs.readFileSync(join(root, 'src/data/parroquias_points.json')))
const hospitales = JSON.parse(fs.readFileSync(join(root, 'src/data/hospitales.json')))
const all = [...parroquias, ...hospitales]

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)

const values = all
  .map((l) => `  (${q(l.id)}, ${q(l.name)}, ${q(l.kind)}, ${q(l.state)}, ${q(l.municipio || null)}, ${Number(l.lat)}, ${Number(l.lng)})`)
  .join(',\n')

const sql = `-- ===========================================================================
-- Mapa de Ayuda — Datos iniciales (${all.length} ubicaciones)
-- Parroquias: ${parroquias.length} · Hospitales: ${hospitales.length}
-- Ejecutar DESPUES de schema.sql. Es idempotente (on conflict do nothing).
-- ===========================================================================

insert into public.locations (id, name, kind, state, municipio, lat, lng) values
${values}
on conflict (id) do nothing;
`

fs.writeFileSync(join(root, 'supabase/seed.sql'), sql)
console.log(`seed.sql generado: ${all.length} ubicaciones (${parroquias.length} parroquias, ${hospitales.length} hospitales)`) 
