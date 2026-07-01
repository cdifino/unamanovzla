import { useState } from 'react'
import { repo } from '../lib/repository'
import { UPDATE_TYPES, SUPPLY_CHIPS, BLOOD_TYPES, URGENCY_OPTIONS } from '../data/constants'

export default function SubmissionForm({ location, onClose, onSent }) {
  const isHospital = location.kind === 'hospital'
  const isParroquia = location.kind === 'parroquia'
  const [form, setForm] = useState({
    submitter_name: '',
    submitter_contact: '',
    update_type: 'estado',
    urgency: '',
    message: '',
    rescue_teams: '',
    buildings_searched: '',
    people_aided: '',
    blood_needed: false,
    blood_types: [],
    supplies: [],
    supplies_other: '',
    donation_poc: '',
  })
  const [hp, setHp] = useState('') // honeypot anti-spam: debe quedar vacio
  const [status, setStatus] = useState({ sending: false, ok: false, error: '' })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  // Alterna un valor dentro de un arreglo (chips multiseleccion).
  const toggleIn = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }))

  async function submit(e) {
    e.preventDefault()
    // Si el honeypot trae texto, es un bot: simulamos exito y descartamos.
    if (hp.trim()) {
      setStatus({ sending: false, ok: true, error: '' })
      return
    }
    if (!form.message.trim()) {
      setStatus({ sending: false, ok: false, error: 'Por favor describe la actualizacion.' })
      return
    }
    setStatus({ sending: true, ok: false, error: '' })

    const proposed = {}
    const maybe = (k) => {
      if (typeof form[k] === 'string' && form[k].trim()) proposed[k] = form[k].trim()
    }
    // Suministros estructurados (chips) + texto libre "Otro", unidos en un string
    // separado por comas para mantener compatibilidad con la cola admin y el matcher.
    const suppliesList = [
      ...form.supplies.filter((s) => s !== 'Otro'),
      ...(form.supplies_other.trim() ? [form.supplies_other.trim()] : []),
    ]
    const suppliesText = suppliesList.join(', ')
    // Urgencia sugerida (se usa como nivel por defecto en la revision admin).
    if (form.urgency) proposed.status_level = form.urgency

    if (isHospital) {
      maybe('people_aided'); maybe('donation_poc')
      if (suppliesText) proposed.supplies_needed = suppliesText
      if (form.blood_needed) {
        proposed.blood_needed = true
        if (form.blood_types.length) proposed.blood_types = form.blood_types.join(', ')
      }
    } else if (isParroquia) {
      maybe('rescue_teams'); maybe('buildings_searched'); maybe('donation_poc')
      if (suppliesText) proposed.supplies_needed = suppliesText
    } else {
      maybe('donation_poc')
      if (suppliesText) proposed.supplies_needed = suppliesText
    }

    try {
      await repo.createSubmission({
        location_id: location.id,
        location_name: location.name,
        kind: location.kind,
        submitter_name: form.submitter_name.trim() || null,
        submitter_contact: form.submitter_contact.trim() || null,
        update_type: form.update_type,
        message: form.message.trim(),
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
      <div className="form">
        <div className="notice notice--ok">
¡Gracias! Tu reporte fue enviado y sera revisado por un administrador antes de publicarse.
        </div>
        <button className="btn btn--ghost btn--block" onClick={onClose}>Cerrar</button>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={submit}>
      {/* Honeypot anti-spam: invisible para humanos, los bots lo rellenan. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        <label>No llenar este campo</label>
        <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Comparte informacion verificada sobre <strong>{location.name}</strong>. Un administrador la
        revisara antes de publicarla.
      </p>

      <label>Tipo de actualizacion</label>
      <select value={form.update_type} onChange={(e) => set('update_type', e.target.value)}>
        {UPDATE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label>Nivel de urgencia</label>
      <div className="chip-grid">
        {URGENCY_OPTIONS.map((u) => (
          <button
            key={u.value}
            type="button"
            className={'chip-select' + (form.urgency === u.value ? ' chip-select--active' : '')}
            onClick={() => set('urgency', form.urgency === u.value ? '' : u.value)}
          >
            {u.label}
          </button>
        ))}
      </div>

      <label>Descripcion *</label>
      <textarea
        value={form.message}
        onChange={(e) => set('message', e.target.value)}
        placeholder="Describe la situacion, lo que observaste o la fuente de la informacion..."
      />

      {isParroquia && (
        <>
          <label>Equipos de rescate / quien esta ayudando</label>
          <textarea value={form.rescue_teams} onChange={(e) => set('rescue_teams', e.target.value)} placeholder="Ej: Bomberos, Proteccion Civil, brigadas vecinales..." />
          <label>Edificaciones donde se busca personas</label>
          <textarea value={form.buildings_searched} onChange={(e) => set('buildings_searched', e.target.value)} placeholder="Ej: Edificio Las Acacias, colegio San Jose..." />
        </>
      )}
      {isHospital && (
        <>
          <label>Personas siendo atendidas por el desastre</label>
          <input value={form.people_aided} onChange={(e) => set('people_aided', e.target.value)} placeholder="Ej: 45 pacientes" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.blood_needed} onChange={(e) => set('blood_needed', e.target.checked)} />
            Se necesitan donaciones de sangre
          </label>
          {form.blood_needed && (
            <>
              <label>Tipos de sangre necesarios</label>
              <div className="chip-grid">
                {BLOOD_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    className={'chip-select' + (form.blood_types.includes(bt) ? ' chip-select--active' : '')}
                    onClick={() => toggleIn('blood_types', bt)}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <label>Suministros necesarios</label>
      <div className="chip-grid">
        {SUPPLY_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={'chip-select' + (form.supplies.includes(chip) ? ' chip-select--active' : '')}
            onClick={() => toggleIn('supplies', chip)}
          >
            {chip}
          </button>
        ))}
      </div>
      {form.supplies.includes('Otro') && (
        <input
          value={form.supplies_other}
          onChange={(e) => set('supplies_other', e.target.value)}
          placeholder="Especifica otros suministros (separa con comas)"
        />
      )}

      <label>Punto de entrega de donaciones (contacto)</label>
      <input value={form.donation_poc} onChange={(e) => set('donation_poc', e.target.value)} placeholder="Nombre, telefono o direccion de quien recibe" />

      <label>Tu nombre (opcional)</label>
      <input value={form.submitter_name} onChange={(e) => set('submitter_name', e.target.value)} />
      <label>Tu contacto (opcional)</label>
      <input value={form.submitter_contact} onChange={(e) => set('submitter_contact', e.target.value)} placeholder="Telefono o correo por si se requiere confirmar" />

      {status.error && <div className="notice notice--err">{status.error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={status.sending}>
          {status.sending ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </div>
    </form>
  )
}
