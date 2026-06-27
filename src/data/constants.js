// Niveles de gravedad usados para colorear el mapa y las fichas.
export const STATUS_LEVELS = {
  critico: { label: 'Critico', color: '#dc2626' },
  alto: { label: 'Alto', color: '#ea580c' },
  medio: { label: 'Medio', color: '#d97706' },
  estable: { label: 'Estable', color: '#16a34a' },
  sin_datos: { label: 'Sin datos', color: '#94a3b8' },
}

export const STATUS_ORDER = ['critico', 'alto', 'medio', 'estable', 'sin_datos']

// Tipos de ubicacion. "otro" es un punto generico (refugio, centro de acopio,
// albergue, etc.) que se muestra con un punto azul.
export const KIND_META = {
  parroquia: { label: 'Parroquia', color: '#1d4ed8', icon: '📍' },
  hospital: { label: 'Hospital', color: '#be185d', icon: '🏥' },
  otro: { label: 'Otro punto', color: '#2563eb', icon: '🔵' },
}

// Tipos de punto que el publico puede proponer como NUEVA ubicacion.
export const NEW_KINDS = [
  { value: 'hospital', label: 'Hospital / centro de salud' },
  { value: 'otro', label: 'Otro punto (refugio, centro de acopio, albergue…)' },
]

// Tipos de actualizacion que puede enviar el publico.
export const UPDATE_TYPES = [
  { value: 'estado', label: 'Estado general / rescate' },
  { value: 'suministros', label: 'Suministros necesarios' },
  { value: 'sangre', label: 'Donacion de sangre' },
  { value: 'punto_donacion', label: 'Punto de entrega de donaciones' },
  { value: 'otro', label: 'Otro' },
]

export const STATES = ['Distrito Capital', 'Miranda', 'La Guaira']

// Estado inicial (vacio) de una ubicacion antes de cualquier actualizacion.
export function emptyStatus() {
  return {
    status_level: 'sin_datos',
    summary: '',
    supplies_needed: '',
    donation_poc: '',
    // Parroquia
    rescue_teams: '',
    buildings_searched: '',
    // Hospital
    people_aided: '',
    blood_needed: false,
    blood_types: '',
    updated_at: null,
    updated_by: '',
  }
}
