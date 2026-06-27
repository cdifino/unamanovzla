// Utilidades de busqueda para lectores: normaliza texto (sin acentos),
// busca en nombres y en campos de contenido, y deriva palabras clave
// sugeridas a partir de lo que la gente ha ingresado.

export function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Campos donde se busca por palabra clave.
const SEARCH_FIELDS = [
  'name',
  'state',
  'municipio',
  'summary',
  'supplies_needed',
  'rescue_teams',
  'buildings_searched',
  'people_aided',
  'blood_types',
  'donation_poc',
]

export function matchLocation(loc, nq) {
  if (!nq) return true
  for (const f of SEARCH_FIELDS) {
    if (loc[f] && normalize(loc[f]).includes(nq)) return true
  }
  return false
}

const STOPWORDS = new Set([
  'de','la','el','los','las','y','en','para','con','del','a','o','un','una','se','no',
  'su','sus','por','que','mas','muy','este','esta','al','le','lo','es','son','hay','the',
  'ya','todo','toda','todos','todas','como','sin','ante','tras','entre','sobre','hacia',
])

// Construye palabras clave frecuentes desde suministros y equipos de rescate.
export function buildKeywords(locations) {
  const counts = new Map()
  for (const l of locations) {
    const text = [l.supplies_needed, l.rescue_teams, l.buildings_searched, l.blood_types]
      .filter(Boolean)
      .join(' ')
    if (!text) continue
    for (const raw of normalize(text).split(/[^a-z0-9+áéíóúñ-]+/i)) {
      const w = raw.trim()
      if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue
      counts.set(w, (counts.get(w) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))
}

// Separa el texto de donaciones que escribe la persona en items individuales.
export function parseDonationItems(text) {
  return [...new Set(
    (text || '')
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  )]
}

// Dado lo que la persona puede donar, sugiere lugares que lo necesitan.
// Regla: sin necesidades registradas = no se sugiere (no hay match posible).
export function matchDonations(locations, items) {
  const normItems = items
    .map((it) => ({ raw: it, n: normalize(it) }))
    .filter((x) => x.n.length >= 2)
  if (!normItems.length) return []

  const order = { critico: 0, alto: 1, medio: 2, estable: 3, sin_datos: 4 }
  const results = []
  for (const l of locations) {
    const bloodText = l.blood_needed ? 'sangre donacion de sangre ' + (l.blood_types || '') : ''
    const needText = normalize([l.supplies_needed, bloodText].filter(Boolean).join(' '))
    if (!needText.trim()) continue // sin necesidades => no se sugiere
    const matched = []
    for (const it of normItems) {
      const words = it.n.split(/[^a-z0-9+áéíóúñ]+/i).filter((w) => w.length >= 3)
      if (needText.includes(it.n) || words.some((w) => needText.includes(w))) matched.push(it.raw)
    }
    if (matched.length) results.push({ location: l, matched })
  }
  results.sort(
    (a, b) =>
      b.matched.length - a.matched.length ||
      (order[a.location.status_level] ?? 9) - (order[b.location.status_level] ?? 9),
  )
  return results
}
