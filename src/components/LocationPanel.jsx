import { useState } from 'react'
import { repo } from '../lib/repository'
import { STATUS_LEVELS, STATUS_ORDER, KIND_META } from '../data/constants'
import SubmissionForm from './SubmissionForm'

function Field({ label, icon, value }) {
  const empty = !value || (typeof value === 'string' && !value.trim())
  return (
    <div className="field">
      <div className="field__label">{icon && <span>{icon}</span>} {label}</div>
      <div className={'field__value' + (empty ? ' field__value--empty' : '')}>
        {empty ? 'Sin informacion aun' : value}
      </div>
    </div>
  )
}

function AdminEdit({ location, onSaved, onCancel }) {
  const isHospital = location.kind === 'hospital'
  const isParroquia = location.kind === 'parroquia'
  const [f, setF] = useState({
    status_level: location.status_level || 'sin_datos',
    summary: location.summary || '',
    supplies_needed: location.supplies_needed || '',
    donation_poc: location.donation_poc || '',
    rescue_teams: location.rescue_teams || '',
    buildings_searched: location.buildings_searched || '',
    people_aided: location.people_aided || '',
    blood_needed: !!location.blood_needed,
    blood_types: location.blood_types || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await repo.updateLocationStatus(location.id, f)
      onSaved(f)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={save}>
      <div className="notice" style={{ background: '#eef2ff', color: '#3730a3' }}>
        Edicion directa de administrador. Los cambios se publican de inmediato.
      </div>
      <label>Nivel de gravedad</label>
      <select value={f.status_level} onChange={(e) => set('status_level', e.target.value)}>
        {STATUS_ORDER.map((k) => (
          <option key={k} value={k}>{STATUS_LEVELS[k].label}</option>
        ))}
      </select>
      <label>Resumen de la situacion</label>
      <textarea value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      {isParroquia && (
        <>
          <label>Equipos de rescate / quien ayuda</label>
          <textarea value={f.rescue_teams} onChange={(e) => set('rescue_teams', e.target.value)} />
          <label>Edificaciones en busqueda de personas</label>
          <textarea value={f.buildings_searched} onChange={(e) => set('buildings_searched', e.target.value)} />
        </>
      )}
      {isHospital && (
        <>
          <label>Personas siendo atendidas</label>
          <input value={f.people_aided} onChange={(e) => set('people_aided', e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={f.blood_needed} onChange={(e) => set('blood_needed', e.target.checked)} />
            Se necesitan donaciones de sangre
          </label>
          <label>Tipos de sangre necesarios</label>
          <input value={f.blood_types} onChange={(e) => set('blood_types', e.target.value)} />
        </>
      )}
      <label>Suministros necesarios</label>
      <textarea value={f.supplies_needed} onChange={(e) => set('supplies_needed', e.target.value)} />
      <label>Punto de entrega de donaciones</label>
      <input value={f.donation_poc} onChange={(e) => set('donation_poc', e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Publicar cambios'}
        </button>
      </div>
    </form>
  )
}

export default function LocationPanel({ location, isAdmin, onClose, onUpdated }) {
  const [mode, setMode] = useState('view')
  const isHospital = location.kind === 'hospital'
  const isParroquia = location.kind === 'parroquia'
  const kindLabel = (KIND_META[location.kind] || KIND_META.otro).label
  const level = STATUS_LEVELS[location.status_level] || STATUS_LEVELS.sin_datos

  return (
    <aside className="panel">
      <div className="panel__head">
        <button className="panel__close" onClick={onClose} aria-label="Cerrar">×</button>
        <span className={'panel__kind panel__kind--' + location.kind}>
          {kindLabel}
        </span>
        <h2 className="panel__title">{location.name}</h2>
        <div className="panel__sub">
          {location.municipio ? location.municipio + ' · ' : ''}{location.state}
        </div>
        <span className="status-pill" style={{ background: level.color }}>{level.label}</span>
      </div>

      <div className="panel__body">
        {mode === 'view' && (
          <>
            {location.updated_at && (
              <div className="updated">
                Actualizado: {new Date(location.updated_at).toLocaleString('es-VE')}
                {location.updated_by ? ` · por ${location.updated_by}` : ''}
              </div>
            )}

            <Field label="Situacion" icon="📋" value={location.summary} />

            {isHospital && (
              <>
                <Field label="Personas atendidas por el desastre" icon="🧑‍⚕️" value={location.people_aided} />
                {location.blood_needed && (
                  <div className="alert-blood">
                    🩸 Se necesitan donaciones de sangre{location.blood_types ? `: ${location.blood_types}` : ''}
                  </div>
                )}
              </>
            )}
            {isParroquia && (
              <>
                <Field label="Equipos de rescate / quien ayuda" icon="🚒" value={location.rescue_teams} />
                <Field label="Edificaciones en busqueda de personas" icon="🏚️" value={location.buildings_searched} />
              </>
            )}

            <Field label="Suministros necesarios" icon="📦" value={location.supplies_needed} />

            <div className="section-title">¿Donde enviar donaciones?</div>
            <div className="poc-box">
              {location.donation_poc?.trim()
                ? location.donation_poc
                : 'Aun no se ha registrado un punto de entrega para esta ubicacion.'}
            </div>

            <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={() => setMode('submit')}>
              ✍️ Enviar una actualizacion
            </button>
            {isAdmin && (
              <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => setMode('edit')}>
                🛠️ Editar y publicar (admin)
              </button>
            )}
          </>
        )}

        {mode === 'submit' && (
          <SubmissionForm location={location} onClose={() => setMode('view')} />
        )}

        {mode === 'edit' && isAdmin && (
          <AdminEdit
            location={location}
            onCancel={() => setMode('view')}
            onSaved={(patch) => {
              setMode('view')
              onUpdated && onUpdated(location.id, patch)
            }}
          />
        )}
      </div>
    </aside>
  )
}
