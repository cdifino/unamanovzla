import { useState } from 'react'
import { repo } from '../lib/repository'
import { NEW_KINDS, STATES, KIND_META } from '../data/constants'

export default function NewLocationForm({ placedPoint, onRemark, onClose, onSent }) {
  const [form, setForm] = useState({
    kind: 'hospital',
    name: '',
    state: STATES[0],
    municipio: '',
    summary: '',
    people_aided: '',
    blood_needed: false,
    blood_types: '',
    supplies_needed: '',
    donation_poc: '',
    submitter_name: '',
    submitter_contact: '',
  })
  const [status, setStatus] = useState({ sending: false, ok: false, error: '' })
  const [hp, setHp] = useState('') // honeypot anti-spam
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isHospital = form.kind === 'hospital'

  async function submit(e) {
    e.preventDefault()
    if (hp.trim()) { setStatus({ sending: false, ok: true, error: '' }); return }
    if (!form.name.trim()) return setStatus({ sending: false, ok: false, error: 'Indica el nombre del lugar.' })
    if (!placedPoint) return setStatus({ sending: false, ok: false, error: 'Marca la ubicacion en el mapa.' })
    setStatus({ sending: true, ok: false, error: '' })

    const proposed = {
      name: form.name.trim(),
      kind: form.kind,
      state: form.state,
      municipio: form.municipio.trim() || null,
      lat: placedPoint.lat,
      lng: placedPoint.lng,
    }
    const maybe = (k) => { if (form[k] && form[k].toString().trim()) proposed[k] = form[k].toString().trim() }
    maybe('summary'); maybe('supplies_needed'); maybe('donation_poc')
    if (isHospital) {
      maybe('people_aided'); maybe('blood_types')
      if (form.blood_needed) proposed.blood_needed = true
    }

    try {
      await repo.createSubmission({
        location_id: null,
        location_name: form.name.trim(),
        kind: form.kind,
        new_location: true,
        update_type: 'nuevo_punto',
        message: form.summary.trim() || `Propuesta de nuevo punto: ${form.name.trim()}`,
        submitter_name: form.submitter_name.trim() || null,
        submitter_contact: form.submitter_contact.trim() || null,
        proposed,
      })
      setStatus({ sending: false, ok: true, error: '' })
      onSent && onSent()
    } catch (err) {
      setStatus({ sending: false, ok: false, error: 'No se pudo enviar. Intenta de nuevo.' })
    }
  }

  if (status.ok) {
    return (
      <aside className="panel">
        <div className="panel__head">
          <button className="panel__close" onClick={onClose}>×</button>
          <h2 className="panel__title">Nuevo punto</h2>
        </div>
        <div className="panel__body">
          <div className="notice notice--ok">
            ✅ ¡Gracias! Tu nuevo punto fue enviado y un administrador lo revisara antes de publicarlo en el mapa.
          </div>
          <button className="btn btn--ghost btn--block" onClick={onClose}>Cerrar</button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="panel">
      <div className="panel__head">
        <button className="panel__close" onClick={onClose} aria-label="Cerrar">×</button>
        <span className={'panel__kind panel__kind--' + form.kind}>{(KIND_META[form.kind] || KIND_META.otro).label}</span>
        <h2 className="panel__title">Reportar nuevo punto</h2>
        <div className="panel__sub">Sera revisado por un administrador antes de publicarse.</div>
      </div>
      <div className="panel__body">
        <form className="form" onSubmit={submit}>
          {/* Honeypot anti-spam: invisible para humanos. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
            <label>No llenar este campo</label>
            <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <div className={'notice' + (placedPoint ? ' notice--ok' : '')} style={!placedPoint ? { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' } : undefined}>
            {placedPoint
              ? <>📍 Ubicacion marcada: {placedPoint.lat.toFixed(4)}, {placedPoint.lng.toFixed(4)}. <button type="button" className="linkbtn" onClick={onRemark}>Volver a marcar</button></>
              : <>👉 Haz clic en el mapa para marcar donde esta el lugar.</>}
          </div>

          <label>Tipo de punto</label>
          <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            {NEW_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>

          <label>Nombre del lugar *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Hospital de Los Teques, Refugio Escuela Bolivar..." />

          <label>Estado</label>
          <select value={form.state} onChange={(e) => set('state', e.target.value)}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label>Municipio / parroquia (opcional)</label>
          <input value={form.municipio} onChange={(e) => set('municipio', e.target.value)} />

          <label>Resumen de la situacion</label>
          <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Describe que esta pasando en este punto..." />

          {isHospital && (
            <>
              <label>Personas siendo atendidas</label>
              <input value={form.people_aided} onChange={(e) => set('people_aided', e.target.value)} placeholder="Ej: 30 pacientes" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={form.blood_needed} onChange={(e) => set('blood_needed', e.target.checked)} />
                Se necesitan donaciones de sangre
              </label>
              {form.blood_needed && (
                <input value={form.blood_types} onChange={(e) => set('blood_types', e.target.value)} placeholder="Tipos de sangre (ej: O-, A+)" />
              )}
            </>
          )}

          <label>Suministros necesarios</label>
          <textarea value={form.supplies_needed} onChange={(e) => set('supplies_needed', e.target.value)} placeholder="Ej: agua, medicinas, alimentos..." />

          <label>Punto de entrega de donaciones (contacto)</label>
          <input value={form.donation_poc} onChange={(e) => set('donation_poc', e.target.value)} placeholder="Nombre, telefono o direccion de quien recibe" />

          <label>Tu nombre (opcional)</label>
          <input value={form.submitter_name} onChange={(e) => set('submitter_name', e.target.value)} />
          <label>Tu contacto (opcional)</label>
          <input value={form.submitter_contact} onChange={(e) => set('submitter_contact', e.target.value)} />

          {status.error && <div className="notice notice--err">{status.error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={status.sending}>
              {status.sending ? 'Enviando…' : 'Enviar nuevo punto'}
            </button>
          </div>
        </form>
      </div>
    </aside>
  )
}
