import { useEffect, useState } from 'react'
import { repo } from '../lib/repository'
import { STATES, SUPPLY_CHIPS, URGENCY_OPTIONS } from '../data/constants'
import Icon from './Icons'

const STEPS = ['Ubicación', 'Tipo', 'Necesidades', 'Detalles']

// Tarjetas de tipo de punto. Cada una se asigna a un "kind" del modelo de datos
// (hospital u otro), conservando la estructura existente.
const TYPE_CARDS = [
  { id: 'hospital', label: 'Hospital', kind: 'hospital', icon: 'hospital' },
  { id: 'acopio', label: 'Centro de acopio', kind: 'otro', icon: 'box' },
  { id: 'refugio', label: 'Refugio', kind: 'otro', icon: 'home' },
  { id: 'organizacion', label: 'Organización comunitaria', kind: 'otro', icon: 'users' },
  { id: 'rescate', label: 'Equipo de rescate', kind: 'otro', icon: 'shield' },
  { id: 'medico', label: 'Centro médico', kind: 'hospital', icon: 'plus' },
  { id: 'otro', label: 'Otro', kind: 'otro', icon: 'pin' },
]

const PEOPLE_RANGES = ['1-10', '10-50', '50-100', '100+']

// Desglose de la poblacion atendida (presencia con toggles).
const POP_GROUPS = [
  { key: 'ninos', label: 'Niños' },
  { key: 'adultos', label: 'Adultos' },
  { key: 'mayores', label: 'Adultos mayores' },
  { key: 'discapacidad', label: 'Discapacidad / movilidad reducida' },
]

// Tipo de apoyo necesario (seleccion multiple).
const SUPPORT_TYPES = ['Donaciones físicas', 'Voluntarios', 'Transporte', 'Servicios médicos', 'Rescate', 'Otro']

// Toggle accesible para indicar presencia de un grupo.
function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      className={'toggle-row' + (checked ? ' toggle-row--on' : '')}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-row__label">{label}</span>
      <span className="toggle-row__switch" aria-hidden>
        <span className="toggle-row__knob" />
      </span>
    </button>
  )
}

// Geocodificacion inversa best-effort con Nominatim para sugerir estado y
// municipio a partir del pin. Nunca bloquea el flujo si falla.
async function reverseGeocode(lat, lng) {
  try {
    // zoom=14 da el nivel de municipio/ciudad sin caer en nombres de calle.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const a = data.address || {}
    const rawState = a.state || a.region || ''
    let state = ''
    for (const s of STATES) {
      if (rawState.toLowerCase().includes(s.toLowerCase())) state = s
    }
    if (!state && /vargas/i.test(rawState)) state = 'La Guaira'
    // En el OSM de Venezuela el municipio administrativo está en "county"
    // (ej. "Municipio Baruta"). El campo "municipality" engañosamente trae la
    // PARROQUIA (ej. "Parroquia El Cafetal"), por eso "county" va primero.
    const rawMuni =
      a.county || a.municipality || a.city || a.town || a.city_district || ''
    const municipio = rawMuni
      .replace(/^Municipio\s+(Aut[óo]nomo\s+)?/i, '')
      .replace(/^Parroquia\s+/i, '')
      .trim()
    return { state, municipio }
  } catch {
    return null
  }
}

export default function NewLocationForm({ placedPoint, onRemark, onClose, onSent, onSetPoint }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    typeId: 'hospital',
    helpMode: 'needs', // 'needs' | 'offers'
    name: '',
    state: STATES[0],
    municipio: '',
    summary: '',
    gravedad: '', // nivel de gravedad sugerido (mapea a status_level)
    supplies: [],
    suppliesOther: '',
    // Poblacion atendida (estructurada)
    peopleRange: '',
    peopleExact: '',
    breakdown: { ninos: false, adultos: false, mayores: false, discapacidad: false },
    // Tipo de apoyo
    supportTypes: [],
    // Sangre (hospitales)
    blood_needed: false,
    blood_types: '',
    // Entrega de donaciones (obligatorio)
    deliveryAddress: '',
    deliveryRecipient: '',
    deliveryPhone: '',
    deliveryHours: '',
    // Capacidad (refugios)
    canReceiveMore: '', // '' | 'si' | 'no'
    // Quien reporta
    isOnSiteContact: 'si', // 'si' | 'no'
    submitter_name: '',
    submitter_contact: '',
  })
  const [stateConfirmed, setStateConfirmed] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoMsg, setGeoMsg] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [stepError, setStepError] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [status, setStatus] = useState({ sending: false, ok: false, error: '' })
  const [hp, setHp] = useState('') // honeypot anti-spam

  // Foto (captura local con vista previa).
  const [photo, setPhoto] = useState(null) // { url, name }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setBreakdown = (key, v) => setForm((f) => ({ ...f, breakdown: { ...f.breakdown, [key]: v } }))
  const selectedCard = TYPE_CARDS.find((c) => c.id === form.typeId) || TYPE_CARDS[0]
  const isHospital = selectedCard.kind === 'hospital'
  const isShelter = form.typeId === 'refugio' || form.typeId === 'acopio'

  // Validacion de los campos obligatorios de entrega.
  const deliveryComplete =
    form.deliveryAddress.trim() && form.deliveryRecipient.trim() && form.deliveryPhone.trim()
  const canSubmit = Boolean(form.name.trim() && placedPoint && deliveryComplete)

  // Cuando llega un punto nuevo (GPS o toque en el mapa), intenta derivar
  // estado/municipio automaticamente.
  useEffect(() => {
    if (!placedPoint) return
    // Al marcar un punto se limpia cualquier error previo de "marca la ubicación".
    setStepError('')
    let alive = true
    setGeoMsg('Detectando estado y municipio…')
    reverseGeocode(placedPoint.lat, placedPoint.lng).then((r) => {
      if (!alive) return
      if (r) {
        setForm((f) => ({
          ...f,
          state: r.state || f.state,
          municipio: r.municipio || f.municipio,
        }))
        setStateConfirmed(false)
        setGeoMsg(r.state ? '' : 'No pudimos detectar el estado. Confírmalo abajo.')
      } else {
        setGeoMsg('')
      }
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedPoint?.lat, placedPoint?.lng])

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setStepError('Tu dispositivo no permite ubicación automática. Toca el mapa para marcar el lugar.')
      return
    }
    setLocating(true)
    setStepError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        onSetPoint && onSetPoint(pt)
      },
      () => {
        setLocating(false)
        setStepError('No pudimos obtener tu ubicación. Toca el mapa para marcar el lugar.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function toggleSupply(chip) {
    setForm((f) => ({
      ...f,
      supplies: f.supplies.includes(chip) ? f.supplies.filter((s) => s !== chip) : [...f.supplies, chip],
    }))
  }

  function toggleSupport(chip) {
    setForm((f) => ({
      ...f,
      supportTypes: f.supportTypes.includes(chip) ? f.supportTypes.filter((s) => s !== chip) : [...f.supportTypes, chip],
    }))
  }

  function onPhoto(e) {
    const file = e.target.files?.[0]
    if (file) setPhoto({ url: URL.createObjectURL(file), name: file.name })
  }

  function next() {
    setStepError('')
    if (step === 1 && !placedPoint) {
      setStepError('Marca la ubicación: usa tu ubicación o toca el mapa.')
      return
    }
    if (step === 3 && !form.name.trim()) {
      setStepError('Indica el nombre del lugar.')
      return
    }
    setStep((s) => Math.min(4, s + 1))
  }
  function back() {
    setStepError('')
    setStep((s) => Math.max(1, s - 1))
  }

  async function submit(e) {
    e.preventDefault()
    if (hp.trim()) { setStatus({ sending: false, ok: true, error: '' }); return }
    if (!form.name.trim()) { setStep(3); return setStepError('Indica el nombre del lugar.') }
    if (!placedPoint) { setStep(1); return setStepError('Marca la ubicación en el mapa.') }
    if (!deliveryComplete) {
      setTriedSubmit(true)
      setStepError('Completa los datos obligatorios de entrega de donaciones.')
      return
    }
    setStatus({ sending: true, ok: false, error: '' })

    const supplies = [...form.supplies.filter((s) => s !== 'Otro')]
    if (form.supplies.includes('Otro') && form.suppliesOther.trim()) supplies.push(form.suppliesOther.trim())
    const suppliesText = supplies.join(', ')

    // Poblacion atendida estructurada: total + desglose.
    const totalText = form.peopleExact.trim() || form.peopleRange
    const breakdownText = POP_GROUPS
      .filter((g) => form.breakdown[g.key])
      .map((g) => g.label)
      .join(', ')
    const peopleText = [totalText, breakdownText && `incluye: ${breakdownText}`].filter(Boolean).join(' — ')

    // Entrega de donaciones (obligatorio).
    const deliveryParts = [form.deliveryRecipient.trim(), form.deliveryPhone.trim(), form.deliveryAddress.trim()]
    if (form.deliveryHours.trim()) deliveryParts.push('Horario: ' + form.deliveryHours.trim())
    const donationPoc = deliveryParts.filter(Boolean).join(' · ')

    const proposed = {
      name: form.name.trim(),
      kind: selectedCard.kind,
      state: form.state,
      municipio: form.municipio.trim() || null,
      lat: placedPoint.lat,
      lng: placedPoint.lng,
      donation_poc: donationPoc,
    }
    if (form.summary.trim()) proposed.summary = form.summary.trim()
    if (form.gravedad) proposed.status_level = form.gravedad
    if (suppliesText) proposed.supplies_needed = suppliesText
    if (peopleText) proposed.people_aided = peopleText
    if (isHospital) {
      if (form.blood_needed) proposed.blood_needed = true
      if (form.blood_types.trim()) proposed.blood_types = form.blood_types.trim()
    }

    // Conserva subtipo, modo, apoyo y capacidad en la descripcion.
    const modeLabel = form.helpMode === 'offers' ? 'Ofrece ayuda' : 'Necesita ayuda'
    let description = `${selectedCard.label} · ${modeLabel}`
    if (form.supportTypes.length) description += ` · Apoyo: ${form.supportTypes.join(', ')}`
    if (isShelter && form.canReceiveMore) {
      description += ` · Puede recibir más personas: ${form.canReceiveMore === 'si' ? 'Sí' : 'No'}`
    }
    proposed.description = description

    // Quien reporta (solo si NO es la persona de contacto del lugar).
    const reporterName = form.isOnSiteContact === 'no' ? form.submitter_name.trim() : ''
    const reporterContact = form.isOnSiteContact === 'no' ? form.submitter_contact.trim() : ''

    const mediaNote = photo ? ' (incluye foto)' : ''
    const message =
      `[${selectedCard.label} · ${modeLabel}] ` +
      (form.summary.trim() || `Propuesta de nuevo punto: ${form.name.trim()}`) +
      (suppliesText ? ` — Necesita: ${suppliesText}` : '') +
      (form.supportTypes.length ? ` — Apoyo: ${form.supportTypes.join(', ')}` : '') +
      ` — Entrega: ${donationPoc}` +
      mediaNote

    try {
      await repo.createSubmission({
        location_id: null,
        location_name: form.name.trim(),
        kind: selectedCard.kind,
        new_location: true,
        update_type: 'nuevo_punto',
        message,
        submitter_name: reporterName || null,
        submitter_contact: reporterContact || null,
        proposed,
      })
      setStatus({ sending: false, ok: true, error: '' })
      onSent && onSent()
    } catch {
      setStatus({ sending: false, ok: false, error: 'No se pudo enviar. Intenta de nuevo.' })
    }
  }

  if (status.ok) {
    return (
      <aside className="panel">
        <div className="panel__head">
          <button className="panel__close" onClick={onClose} aria-label="Cerrar">×</button>
          <h2 className="panel__title">Nuevo punto</h2>
        </div>
        <div className="panel__body">
          <div className="notice notice--ok">
            ¡Gracias! Tu nuevo punto fue enviado y un administrador lo revisará antes de publicarlo en el mapa.
          </div>
          <button className="btn btn--ghost btn--block" onClick={onClose}>Cerrar</button>
        </div>
      </aside>
    )
  }

  return (
    <aside className={'panel' + (step === 1 && !placedPoint ? ' panel--pick' : '')}>
      <div className="panel__head">
        <button className="panel__close" onClick={onClose} aria-label="Cerrar">×</button>
        <h2 className="panel__title">Reportar nuevo punto</h2>
        <div className="panel__sub">Será revisado por un administrador antes de publicarse.</div>

        <div className="wizard__progress" role="list" aria-label="Progreso del formulario">
          {STEPS.map((label, i) => {
            const n = i + 1
            const state = n < step ? 'done' : n === step ? 'current' : 'todo'
            return (
              <div key={label} className={'wizard__step wizard__step--' + state} role="listitem">
                <span className="wizard__dot">{n < step ? <Icon name="check" size={13} /> : n}</span>
                <span className="wizard__label">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel__body wizard__body">
        {/* Honeypot anti-spam: invisible para humanos. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
          <label>No llenar este campo</label>
          <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>

        {/* ----- Paso 1: Ubicacion ----- */}
        {step === 1 && (
          <div className="wizard__pane">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={useMyLocation} disabled={locating}>
              <Icon name="navigation" size={18} /> {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
            </button>
            <p className="wizard__or">o</p>
            <div className={'locbox' + (placedPoint ? ' locbox--ok' : '')}>
              <Icon name="pin" size={18} />
              {placedPoint ? (
                <span>
                  Ubicación marcada: {placedPoint.lat.toFixed(4)}, {placedPoint.lng.toFixed(4)}.{' '}
                  <button type="button" className="linkbtn" onClick={onRemark}>Volver a marcar</button>
                </span>
              ) : (
                <span>Toca el mapa para marcar el lugar.</span>
              )}
            </div>

            {geoMsg && <p className="wizard__hint">{geoMsg}</p>}

            <label className="wizard__flabel">Estado</label>
            <select value={form.state} onChange={(e) => { set('state', e.target.value); setStateConfirmed(true) }}>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="wizard__flabel">Municipio (puedes confirmarlo)</label>
            <input value={form.municipio} onChange={(e) => set('municipio', e.target.value)} placeholder="Ej: Libertador, Chacao…" />
          </div>
        )}

        {/* ----- Paso 2: Tipo de punto ----- */}
        {step === 2 && (
          <div className="wizard__pane">
            <div className="seg-toggle" role="group" aria-label="Modo de ayuda">
              <button
                type="button"
                className={'seg-toggle__btn' + (form.helpMode === 'needs' ? ' seg-toggle__btn--active' : '')}
                onClick={() => set('helpMode', 'needs')}
              >
                Necesita ayuda
              </button>
              <button
                type="button"
                className={'seg-toggle__btn' + (form.helpMode === 'offers' ? ' seg-toggle__btn--active' : '')}
                onClick={() => set('helpMode', 'offers')}
              >
                Ofrece ayuda
              </button>
            </div>

            <label className="wizard__flabel">Tipo de punto</label>
            <div className="type-grid">
              {TYPE_CARDS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={'type-card' + (form.typeId === c.id ? ' type-card--active' : '')}
                  onClick={() => set('typeId', c.id)}
                  aria-pressed={form.typeId === c.id}
                >
                  <Icon name={c.icon} size={22} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----- Paso 3: Nombre y necesidades ----- */}
        {step === 3 && (
          <div className="wizard__pane">
            <label className="wizard__flabel">Nombre del lugar *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Hospital de Los Teques, Refugio Escuela Bolívar…"
            />

            <label className="wizard__flabel">Nivel de gravedad</label>
            <div className="chip-grid">
              {URGENCY_OPTIONS.map((u) => (
                <button
                  type="button"
                  key={u.value}
                  className={'chip-select' + (form.gravedad === u.value ? ' chip-select--active' : '')}
                  onClick={() => set('gravedad', form.gravedad === u.value ? '' : u.value)}
                  aria-pressed={form.gravedad === u.value}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <label className="wizard__flabel">{form.helpMode === 'offers' ? 'Recursos disponibles' : 'Suministros necesarios'}</label>
            <div className="chip-grid">
              {SUPPLY_CHIPS.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  className={'chip-select' + (form.supplies.includes(chip) ? ' chip-select--active' : '')}
                  onClick={() => toggleSupply(chip)}
                  aria-pressed={form.supplies.includes(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            {form.supplies.includes('Otro') && (
              <input
                style={{ marginTop: 8 }}
                value={form.suppliesOther}
                onChange={(e) => set('suppliesOther', e.target.value)}
                placeholder="Especifica otro suministro…"
              />
            )}

            {isHospital && (
              <>
                <label className="wizard__check">
                  <input type="checkbox" checked={form.blood_needed} onChange={(e) => set('blood_needed', e.target.checked)} />
                  <span>Se necesitan donaciones de sangre</span>
                </label>
                {form.blood_needed && (
                  <input value={form.blood_types} onChange={(e) => set('blood_types', e.target.value)} placeholder="Tipos de sangre (ej: O-, A+)" />
                )}
              </>
            )}
          </div>
        )}

        {/* ----- Paso 4: Detalles ----- */}
        {step === 4 && (
          <div className="wizard__pane">
            {/* Poblacion atendida */}
            <section className="fsection">
              <h3 className="fsection__title">Población atendida</h3>
              <label className="wizard__flabel">Total de personas</label>
              <div className="range-row">
                {PEOPLE_RANGES.map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={'range-btn' + (form.peopleRange === r && !form.peopleExact ? ' range-btn--active' : '')}
                    onClick={() => { set('peopleRange', r); set('peopleExact', '') }}
                    aria-pressed={form.peopleRange === r && !form.peopleExact}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                style={{ marginTop: 8 }}
                value={form.peopleExact}
                onChange={(e) => { set('peopleExact', e.target.value); set('peopleRange', '') }}
                placeholder="O ingresa un número exacto"
              />

              <label className="wizard__flabel">¿Quiénes están presentes? (opcional)</label>
              <div className="toggle-grid">
                {POP_GROUPS.map((g) => (
                  <Toggle key={g.key} label={g.label} checked={form.breakdown[g.key]} onChange={(v) => setBreakdown(g.key, v)} />
                ))}
              </div>
            </section>

            {/* Tipo de apoyo necesario */}
            <section className="fsection">
              <h3 className="fsection__title">Tipo de apoyo necesario</h3>
              <div className="chip-grid">
                {SUPPORT_TYPES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={'chip-select' + (form.supportTypes.includes(s) ? ' chip-select--active' : '')}
                    onClick={() => toggleSupport(s)}
                    aria-pressed={form.supportTypes.includes(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            {/* Entrega de donaciones (OBLIGATORIO) */}
            <section className="fsection fsection--req">
              <h3 className="fsection__title">
                Entrega de donaciones
                <span className="req-badge">Obligatorio</span>
              </h3>
              <p className="fsection__hint">¿A dónde y a quién deben llegar las donaciones?</p>

              <label className="wizard__flabel">Dirección o punto de entrega *</label>
              <input
                className={triedSubmit && !form.deliveryAddress.trim() ? 'input--err' : ''}
                value={form.deliveryAddress}
                onChange={(e) => set('deliveryAddress', e.target.value)}
                placeholder="Ej: Av. Bolívar, frente a la plaza"
              />
              {triedSubmit && !form.deliveryAddress.trim() && <span className="field-err">Indica el punto de entrega.</span>}

              <label className="wizard__flabel">Nombre de quién recibe / a quién buscar *</label>
              <input
                className={triedSubmit && !form.deliveryRecipient.trim() ? 'input--err' : ''}
                value={form.deliveryRecipient}
                onChange={(e) => set('deliveryRecipient', e.target.value)}
                placeholder="Ej: Sra. María, coordinadora del refugio"
              />
              {triedSubmit && !form.deliveryRecipient.trim() && <span className="field-err">Indica a quién buscar.</span>}

              <label className="wizard__flabel">Teléfono de contacto *</label>
              <input
                type="tel"
                inputMode="tel"
                className={triedSubmit && !form.deliveryPhone.trim() ? 'input--err' : ''}
                value={form.deliveryPhone}
                onChange={(e) => set('deliveryPhone', e.target.value)}
                placeholder="Ej: 0412-1234567"
              />
              {triedSubmit && !form.deliveryPhone.trim() && <span className="field-err">Indica un teléfono de contacto.</span>}

              <label className="wizard__flabel">Horario de recepción</label>
              <input
                value={form.deliveryHours}
                onChange={(e) => set('deliveryHours', e.target.value)}
                placeholder="Ej: 8am - 5pm"
              />
            </section>

            {/* Capacidad (refugios y centros de acopio) */}
            {isShelter && (
              <section className="fsection">
                <h3 className="fsection__title">Capacidad</h3>
                <label className="wizard__flabel">¿Pueden recibir más personas?</label>
                <div className="seg-toggle" role="group" aria-label="Capacidad para recibir más personas">
                  <button
                    type="button"
                    className={'seg-toggle__btn' + (form.canReceiveMore === 'si' ? ' seg-toggle__btn--active' : '')}
                    onClick={() => set('canReceiveMore', 'si')}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={'seg-toggle__btn' + (form.canReceiveMore === 'no' ? ' seg-toggle__btn--active' : '')}
                    onClick={() => set('canReceiveMore', 'no')}
                  >
                    No
                  </button>
                </div>
              </section>
            )}

            {/* Detalles opcionales (resumen, foto, quien reporta) */}
            <button type="button" className="more-toggle" onClick={() => setShowOptional((v) => !v)} aria-expanded={showOptional}>
              <Icon name="chevron" size={16} className={showOptional ? 'more-toggle__chev more-toggle__chev--open' : 'more-toggle__chev'} />
              Detalles opcionales
            </button>
            {showOptional && (
              <div className="more-section">
                <label className="wizard__flabel">Resumen de la situación</label>
                <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Describe qué está pasando en este punto…" />

                <div className="media-actions">
                  <label className="media-btn">
                    <Icon name="camera" size={18} /> {photo ? 'Cambiar foto' : 'Agregar foto'}
                    <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
                  </label>
                  {photo && (
                    <div className="media-preview">
                      <img src={photo.url || "/placeholder.svg"} alt="Vista previa" className="photo-thumb" />
                      <button type="button" className="iconbtn" onClick={() => setPhoto(null)} aria-label="Eliminar foto">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <label className="wizard__flabel">¿Eres la persona de contacto en el lugar?</label>
                <div className="seg-toggle" role="group" aria-label="¿Eres la persona de contacto?">
                  <button
                    type="button"
                    className={'seg-toggle__btn' + (form.isOnSiteContact === 'si' ? ' seg-toggle__btn--active' : '')}
                    onClick={() => set('isOnSiteContact', 'si')}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={'seg-toggle__btn' + (form.isOnSiteContact === 'no' ? ' seg-toggle__btn--active' : '')}
                    onClick={() => set('isOnSiteContact', 'no')}
                  >
                    No
                  </button>
                </div>
                {form.isOnSiteContact === 'no' && (
                  <>
                    <label className="wizard__flabel">Tu nombre</label>
                    <input value={form.submitter_name} onChange={(e) => set('submitter_name', e.target.value)} />
                    <label className="wizard__flabel">Tu contacto</label>
                    <input value={form.submitter_contact} onChange={(e) => set('submitter_contact', e.target.value)} placeholder="Teléfono o correo" />
                  </>
                )}
              </div>
            )}

            <p className="wizard__disclaimer">
              <Icon name="info" size={14} /> Será revisado por un administrador antes de publicarse.
            </p>
          </div>
        )}

        {stepError && <div className="notice notice--err">{stepError}</div>}
        {status.error && <div className="notice notice--err">{status.error}</div>}
      </div>

      <div className="wizard__footer">
        {step > 1 ? (
          <button type="button" className="btn btn--ghost" onClick={back}>
            <Icon name="arrowLeft" size={16} /> Atrás
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        )}
        {step < 4 ? (
          <button type="button" className="btn btn--primary wizard__next" onClick={next}>
            Siguiente <Icon name="arrowRight" size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn--primary wizard__next" onClick={submit} disabled={status.sending || !canSubmit}>
            {status.sending ? 'Enviando…' : 'Enviar punto'}
          </button>
        )}
      </div>
    </aside>
  )
}
