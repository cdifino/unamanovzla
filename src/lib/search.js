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

// Distancia aproximada en km entre dos coordenadas (formula de Haversine).
export function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

const ORDER = { critico: 0, alto: 1, medio: 2, estable: 3, sin_datos: 4 }

// Construye el texto de necesidades de un punto (incluye sangre).
function needsTextFor(l) {
  const bloodText = l.blood_needed ? 'sangre donacion de sangre ' + (l.blood_types || '') : ''
  return normalize([l.supplies_needed, bloodText].filter(Boolean).join(' '))
}

// Versión basada en chips (vocabulario del formulario de reporte). Intersecta
// las opciones seleccionadas por el donante con las necesidades registradas.
// Ordena por urgencia (gravedad) y luego por cercanía si hay ubicación.
// `selected` es un arreglo de etiquetas (ej: ['Agua', 'Medicinas']).
// `otherText` cubre la opción "Otro". `origin` es {lat,lng} opcional.
export function matchDonationChips(locations, selected, otherText, origin) {
  const terms = []
  for (const s of selected) {
    if (normalize(s) === 'otro') {
      if (otherText && otherText.trim()) terms.push({ label: otherText.trim(), n: normalize(otherText) })
    } else {
      terms.push({ label: s, n: normalize(s) })
    }
  }
  if (!terms.length) return []

  const results = []
  for (const l of locations) {
    const needText = needsTextFor(l)
    if (!needText.trim()) continue
    const matched = []
    for (const tm of terms) {
      const words = tm.n.split(/[^a-z0-9+áéíóúñ]+/i).filter((w) => w.length >= 3)
      if (needText.includes(tm.n) || words.some((w) => needText.includes(w))) matched.push(tm.label)
    }
    if (!matched.length) continue
    const distance =
      origin && Number.isFinite(l.lat) && Number.isFinite(l.lng)
        ? haversineKm(origin, { lat: l.lat, lng: l.lng })
        : null
    results.push({ location: l, matched, distance })
  }

  results.sort((a, b) => {
    const u = (ORDER[a.location.status_level] ?? 9) - (ORDER[b.location.status_level] ?? 9)
    if (u !== 0) return u
    if (a.distance != null && b.distance != null) return a.distance - b.distance
    return b.matched.length - a.matched.length
  })
  return results
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
