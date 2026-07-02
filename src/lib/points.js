// Determina si un punto tiene datos util que mostrar en el mapa.
// Un punto se considera "vacio" (Sin datos) cuando no tiene gravedad/estado y
// tampoco necesidades, poblacion atendida, recursos ni actualizaciones. Los
// puntos vacios generan ruido visual, asi que se ocultan del mapa por defecto.
// No se borra ningun dato: solo se filtra la vista.

// Campos de texto que, si tienen contenido, indican que el punto fue trabajado.
const DATA_TEXT_FIELDS = [
  'summary',
  'supplies_needed',
  'donation_poc',
  'donation_instructions',
  'rescue_teams',
  'buildings_searched',
  'people_aided',
  'blood_types',
  'description',
  'address',
  'contact_phone',
  'contact_whatsapp',
  'contact_email',
  'website',
]

export function hasPointData(l) {
  if (!l) return false
  // Gravedad/estado reportado (cualquier nivel distinto de "sin_datos").
  if (l.status_level && l.status_level !== 'sin_datos') return true
  // Necesidad de sangre (bandera booleana).
  if (l.blood_needed) return true
  // Alguna actualizacion registrada en la bitacora.
  if (l.updated_at) return true
  // Verificacion mas alla del estado inicial.
  if (l.verification && l.verification !== 'sin_actualizar') return true
  // Cualquier campo de texto con contenido (necesidades, recursos, contacto…).
  for (const f of DATA_TEXT_FIELDS) {
    const v = l[f]
    if (v != null && String(v).trim() !== '') return true
  }
  return false
}

export function isEmptyPoint(l) {
  return !hasPointData(l)
}
