// Niveles de gravedad usados para colorear el mapa y las fichas.
export const STATUS_LEVELS = {
  critico: { label: 'Critico', color: '#dc2626' },
  alto: { label: 'Alto', color: '#ea580c' },
  medio: { label: 'Medio', color: '#d97706' },
  estable: { label: 'Estable', color: '#16a34a' },
  sin_datos: { label: 'Sin datos', color: '#94a3b8' },
}

export const STATUS_ORDER = ['critico', 'alto', 'medio', 'estable', 'sin_datos']

// Estado de verificacion del punto. Se muestra como insignia en la ficha.
export const VERIFICATION = {
  verificado: { label_es: 'Verificado', label_en: 'Verified', color: '#16a34a' },
  pendiente: { label_es: 'Pendiente de verificar', label_en: 'Pending verification', color: '#d97706' },
  sin_actualizar: { label_es: 'Sin actualizar', label_en: 'Not updated', color: '#94a3b8' },
}

// Tipos de actualizacion (entradas del timeline tipo bitacora).
export const UPDATE_KINDS = [
  { value: 'estado', label_es: 'Estado general', label_en: 'General status' },
  { value: 'suministros', label_es: 'Suministros', label_en: 'Supplies' },
  { value: 'sangre', label_es: 'Donacion de sangre', label_en: 'Blood donation' },
  { value: 'donacion', label_es: 'Donaciones', label_en: 'Donations' },
  { value: 'rescate', label_es: 'Rescate', label_en: 'Rescue' },
  { value: 'otro', label_es: 'Otro', label_en: 'Other' },
]

// Tipos de ubicacion. "otro" es un punto generico (refugio, centro de acopio,
// albergue, etc.) que se muestra con un punto azul.
export const KIND_META = {
  parroquia: { label: 'Parroquia', color: '#1d4ed8', icon: 'pin' },
  hospital: { label: 'Hospital', color: '#be185d', icon: 'hospital' },
  otro: { label: 'Otro punto', color: '#2563eb', icon: 'box' },
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

// Vocabulario compartido de suministros (formulario de reporte y flujo de donar).
export const SUPPLY_CHIPS = ['Agua', 'Comida', 'Medicinas', 'Sangre', 'Colchones', 'Generadores', 'Transporte', 'Pañales', 'Otro']

// Tipos de sangre estandar (selección estructurada en reportes de hospital).
export const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']

// Nivel de urgencia que el público puede sugerir al reportar una actualización.
export const URGENCY_OPTIONS = [
  { value: 'critico', label: 'Crítico' },
  { value: 'alto', label: 'Alto' },
  { value: 'medio', label: 'Medio' },
  { value: 'estable', label: 'Estable' },
]

// Estado inicial (vacio) de una ubicacion antes de cualquier actualizacion.
export function emptyStatus() {
  return {
    status_level: 'sin_datos',
    verification: 'sin_actualizar',
    summary: '',
    supplies_needed: '',
    donation_poc: '',
    donation_instructions: '',
    // Parroquia
    rescue_teams: '',
    buildings_searched: '',
    // Hospital
    people_aided: '',
    blood_needed: false,
    blood_types: '',
    // Perfil / contacto
    description: '',
    address: '',
    contact_phone: '',
    contact_whatsapp: '',
    contact_email: '',
    website: '',
    updated_at: null,
    updated_by: '',
  }
}
