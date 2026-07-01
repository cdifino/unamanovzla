const WEEK = 7 * 24 * 60 * 60 * 1000

// Calcula las metricas resumidas que se muestran en el mapa y en "Acerca de".
export function computeStats(locations = []) {
  const now = Date.now()
  let registered = locations.length
  let verified = 0
  let recent = 0
  let active = 0
  for (const l of locations) {
    if (l.verification === 'verificado') verified += 1
    if (l.updated_at && now - new Date(l.updated_at).getTime() <= WEEK) recent += 1
    if (l.status_level && l.status_level !== 'sin_datos') active += 1
  }
  return { registered, verified, recent, active }
}
