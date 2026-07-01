import { useEffect, useMemo, useState } from 'react'
import { repo } from '../lib/repository'

const STATUS_META = {
  pending: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  approved: { label: 'Aprobado', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Rechazado', color: '#b91c1c', bg: '#fee2e2' },
}

export default function AdminManager({ locations = [], onClose }) {
  const [admins, setAdmins] = useState(null)
  const [assign, setAssign] = useState({}) // user_id -> { location_id, label }
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [locations],
  )
  const locName = (id) => locations.find((l) => l.id === id)?.name || null

  async function load() {
    setError('')
    try {
      const data = await repo.listAdminRequests()
      // Pendientes primero, luego por fecha de solicitud.
      data.sort((a, b) => {
        if ((a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1
        return new Date(a.requested_at || 0) - new Date(b.requested_at || 0)
      })
      setAdmins(data)
      const init = {}
      for (const a of data) init[a.user_id] = { location_id: a.assigned_location_id || '', label: a.assigned_label || '' }
      setAssign(init)
    } catch (e) {
      setError('No se pudieron cargar las solicitudes. ¿Tu cuenta es super-admin?')
      setAdmins([])
    }
  }

  useEffect(() => { load() }, [])

  const setField = (id, k, v) => setAssign((p) => ({ ...p, [id]: { ...p[id], [k]: v } }))

  async function review(a, action) {
    setBusyId(a.user_id)
    setError('')
    try {
      const f = assign[a.user_id] || {}
      const res = await repo.reviewAdmin(a.user_id, action, {
        assigned_location_id: f.location_id || null,
        assigned_label: f.label || null,
      })
      if (!res.ok) setError(res.error || 'No se pudo actualizar.')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = (admins || []).filter((a) => a.status === 'pending').length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Administradores {pendingCount > 0 && <span className="sub-card__type" style={{ background: '#fef3c7', color: '#b45309' }}>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>}</h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {error && <div className="notice notice--err">{error}</div>}
          {admins === null && <div className="empty-state">Cargando…</div>}
          {admins && admins.length === 0 && !error && (
            <div className="empty-state">Aún no hay solicitudes de administrador.</div>
          )}
          {admins && admins.map((a) => {
            const st = STATUS_META[a.status] || STATUS_META.pending
            const f = assign[a.user_id] || {}
            return (
              <div className="sub-card" key={a.user_id}>
                <div className="sub-card__head">
                  <span className="sub-card__loc">{a.full_name || a.email || 'Sin nombre'}</span>
                  <span className="sub-card__type" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div className="sub-card__meta">
                  {a.email}
                  {a.is_super ? ' · Super-admin' : ''}
                  {a.requested_at ? ` · solicitó ${new Date(a.requested_at).toLocaleString('es-VE')}` : ''}
                </div>
                {a.assigned_label && (
                  <div className="sub-card__msg">Centro indicado: <strong>{a.assigned_label}</strong></div>
                )}

                {!a.is_super && (
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 8 }}>
                    <div className="field__label">Asignar centro/hospital (informativo)</div>
                    <select
                      style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }}
                      value={f.location_id || ''}
                      onChange={(ev) => setField(a.user_id, 'location_id', ev.target.value)}
                    >
                      <option value="">— Sin ubicación del mapa —</option>
                      {sortedLocations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.state})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Nota o nombre del centro (opcional)"
                      style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 8, marginTop: 6 }}
                      value={f.label || ''}
                      onChange={(ev) => setField(a.user_id, 'label', ev.target.value)}
                    />
                    {a.assigned_location_id && (
                      <div className="sub-card__meta" style={{ marginTop: 4 }}>
                        Asignado actualmente: <strong>{locName(a.assigned_location_id) || a.assigned_location_id}</strong>
                      </div>
                    )}

                    <div className="sub-card__actions">
                      {a.status !== 'approved' && (
                        <button className="btn btn--sm btn--ok" disabled={busyId === a.user_id} onClick={() => review(a, 'approve')}>
                          Aprobar
                        </button>
                      )}
                      {a.status === 'approved' && (
                        <button className="btn btn--sm btn--ok" disabled={busyId === a.user_id} onClick={() => review(a, 'approve')}>
                          Guardar asignación
                        </button>
                      )}
                      {a.status !== 'rejected' && (
                        <button className="btn btn--sm btn--reject" disabled={busyId === a.user_id} onClick={() => review(a, 'reject')}>
                          {a.status === 'approved' ? 'Revocar acceso' : 'Rechazar'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
