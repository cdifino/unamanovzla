import { useEffect, useState } from 'react'
import { repo } from '../lib/repository'
import { STATUS_LEVELS, STATUS_ORDER, UPDATE_TYPES, KIND_META } from '../data/constants'

const FIELD_LABELS = {
  summary: 'Resumen de la situacion',
  rescue_teams: 'Equipos de rescate / quien ayuda',
  buildings_searched: 'Edificaciones en busqueda de personas',
  people_aided: 'Personas atendidas',
  blood_types: 'Tipos de sangre necesarios',
  supplies_needed: 'Suministros necesarios',
  donation_poc: 'Punto de entrega de donaciones',
}

function typeLabel(v) {
  return UPDATE_TYPES.find((t) => t.value === v)?.label || v
}

export default function AdminQueue({ locations = [], onClose, onApplied }) {
  const [subs, setSubs] = useState(null)
  const [edits, setEdits] = useState({}) // id -> { fields..., status_level }
  const [busyId, setBusyId] = useState(null)

  const byId = Object.fromEntries(locations.map((l) => [l.id, l]))

  async function load() {
    const data = await repo.getSubmissions('pending')
    setSubs(data)
    const init = {}
    for (const s of data) {
      const current = byId[s.location_id]
      // Prioridad: urgencia sugerida por quien reporta > estado actual > 'alto'.
      const suggested = s.proposed?.status_level
      const defaultLevel =
        suggested && suggested in STATUS_LEVELS && suggested !== 'sin_datos'
          ? suggested
          : current?.status_level && current.status_level !== 'sin_datos'
            ? current.status_level
            : 'alto'
      init[s.id] = {
        status_level: defaultLevel,
        blood_needed: !!s.proposed?.blood_needed,
        ...Object.fromEntries(
          Object.entries(s.proposed || {}).filter(([k]) => k in FIELD_LABELS),
        ),
      }
    }
    setEdits(init)
  }

  useEffect(() => { load() }, [])

  const setEdit = (id, k, v) => setEdits((p) => ({ ...p, [id]: { ...p[id], [k]: v } }))

  async function review(sub, action) {
    setBusyId(sub.id)
    try {
      let patch = null
      if (action === 'approve') {
        const e = edits[sub.id] || {}
        patch = { status_level: e.status_level, updated_by: sub.submitter_name || 'Anonimo' }
        for (const k of Object.keys(FIELD_LABELS)) if (e[k] != null && e[k] !== '') patch[k] = e[k]
        if (e.blood_needed) patch.blood_needed = true
      }
      await repo.reviewSubmission(sub.id, action, patch)
      await load()
      if (action === 'approve') onApplied && onApplied()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Reportes pendientes de revision</h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {subs === null && <div className="empty-state">Cargando…</div>}
          {subs && subs.length === 0 && (
            <div className="empty-state">No hay reportes pendientes.</div>
          )}
          {subs && subs.map((s) => {
            const e = edits[s.id] || {}
            const proposedKeys = Object.keys(s.proposed || {}).filter((k) => k in FIELD_LABELS)
            const cur = byId[s.location_id]
            const curLevel = STATUS_LEVELS[cur?.status_level] || STATUS_LEVELS.sin_datos
            const curFields = cur
              ? [
                  ['summary', cur.summary],
                  ...(s.kind === 'hospital'
                    ? [
                        ['people_aided', cur.people_aided],
                        ['blood', cur.blood_needed ? `Si${cur.blood_types ? ' (' + cur.blood_types + ')' : ''}` : ''],
                      ]
                    : [
                        ['rescue_teams', cur.rescue_teams],
                        ['buildings_searched', cur.buildings_searched],
                      ]),
                  ['supplies_needed', cur.supplies_needed],
                  ['donation_poc', cur.donation_poc],
                ]
              : []
            const CUR_LABELS = { ...FIELD_LABELS, blood: 'Donacion de sangre' }
            return (
              <div className="sub-card" key={s.id}>
                <div className="sub-card__head">
                  <span className="sub-card__loc">{s.location_name}</span>
                  {s.new_location
                    ? <span className="sub-card__type" style={{ background: '#dbeafe', color: '#1e40af' }}>Nuevo punto</span>
                    : <span className="sub-card__type">{typeLabel(s.update_type)}</span>}
                </div>
                {s.new_location && s.proposed && (
                  <div className="sub-card__meta" style={{ marginTop: 2 }}>
                    {(KIND_META[s.proposed.kind] || KIND_META.otro).label}
                    {s.proposed.municipio ? ` · ${s.proposed.municipio}` : ''}
                    {s.proposed.state ? ` · ${s.proposed.state}` : ''}
                    {Number.isFinite(s.proposed.lat) ? ` · ${Number(s.proposed.lat).toFixed(4)}, ${Number(s.proposed.lng).toFixed(4)}` : ''}
                  </div>
                )}
                <div className="sub-card__meta">
                  Reportado por <strong>{s.submitter_name || 'Anonimo'}</strong>
                  {s.submitter_contact ? ` · ${s.submitter_contact}` : ''}
                  {' · '}{new Date(s.created_at).toLocaleString('es-VE')}
                </div>
                <div className="sub-card__msg">{s.message}</div>

                {cur && (
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', margin: '8px 0' }}>
                    <div className="field__label" style={{ marginBottom: 4 }}>
                      Estado actual del lugar
                      <span className="status-pill" style={{ background: curLevel.color, marginTop: 0, marginLeft: 6, fontSize: 11 }}>{curLevel.label}</span>
                    </div>
                    {cur.updated_at && (
                      <div className="sub-card__meta" style={{ marginBottom: 4 }}>
                        Ultima actualizacion: {new Date(cur.updated_at).toLocaleString('es-VE')}
                        {cur.updated_by ? ` · por ${cur.updated_by}` : ''}
                      </div>
                    )}
                    {curFields.map(([k, v]) => (
                      <div key={k} style={{ fontSize: 13, margin: '3px 0' }}>
                        <span className="muted">{CUR_LABELS[k]}: </span>
                        {v && String(v).trim() ? v : <span className="muted" style={{ fontStyle: 'italic' }}>sin datos</span>}
                      </div>
                    ))}
                  </div>
                )}

                {(proposedKeys.length > 0 || s.proposed?.blood_needed) && (
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                    <div className="field__label">Cambios propuestos (editables antes de publicar)</div>
                    {proposedKeys.map((k) => (
                      <div key={k} style={{ marginTop: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>{FIELD_LABELS[k]}</label>
                        <textarea
                          style={{ width: '100%', minHeight: 44, padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}
                          value={e[k] ?? ''}
                          onChange={(ev) => setEdit(s.id, k, ev.target.value)}
                        />
                      </div>
                    ))}
                    {s.kind === 'hospital' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13 }}>
                        <input type="checkbox" checked={!!e.blood_needed} onChange={(ev) => setEdit(s.id, 'blood_needed', ev.target.checked)} />
                        Marcar necesidad de donacion de sangre
                      </label>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Nivel de gravedad a publicar</label>
                  <select
                    style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}
                    value={e.status_level || 'alto'}
                    onChange={(ev) => setEdit(s.id, 'status_level', ev.target.value)}
                  >
                    {STATUS_ORDER.map((k) => (
                      <option key={k} value={k}>{STATUS_LEVELS[k].label}</option>
                    ))}
                  </select>
                </div>

                <div className="sub-card__actions">
                  <button className="btn btn--sm btn--ok" disabled={busyId === s.id} onClick={() => review(s, 'approve')}>
                    Aprobar y publicar
                  </button>
                  <button className="btn btn--sm btn--reject" disabled={busyId === s.id} onClick={() => review(s, 'reject')}>
                    Rechazar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
