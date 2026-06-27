import { useMemo, useState } from 'react'
import { STATUS_LEVELS, KIND_META, STATES } from '../data/constants'

function timeAgo(iso) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const s = Math.floor((Date.now() - then) / 1000)
  if (s < 60) return 'hace instantes'
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-VE')
}

// Deriva las etiquetas de tipo de informacion presente en el punto.
function tagsFor(l) {
  const t = []
  if (l.rescue_teams?.trim() || l.buildings_searched?.trim()) t.push({ key: 'rescate', label: 'Rescate', icon: '🚒', cls: 'tag--rescate' })
  if (l.people_aided?.trim()) t.push({ key: 'atencion', label: 'Atencion', icon: '🧑‍⚕️', cls: 'tag--atencion' })
  if (l.blood_needed) t.push({ key: 'sangre', label: 'Sangre', icon: '🩸', cls: 'tag--sangre' })
  if (l.supplies_needed?.trim()) t.push({ key: 'suministros', label: 'Suministros', icon: '📦', cls: 'tag--suministros' })
  if (l.donation_poc?.trim()) t.push({ key: 'donacion', label: 'Donaciones', icon: '🎁', cls: 'tag--donacion' })
  return t
}

const KIND_FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'parroquia', label: 'Parroquias' },
  { value: 'hospital', label: 'Hospitales' },
  { value: 'otro', label: 'Otros' },
]

const TYPE_FILTERS = [
  { value: 'all', label: 'Todo tipo' },
  { value: 'rescate', label: '🚒 Rescate' },
  { value: 'atencion', label: '🧑‍⚕️ Atencion' },
  { value: 'sangre', label: '🩸 Sangre' },
  { value: 'suministros', label: '📦 Suministros' },
  { value: 'donacion', label: '🎁 Donaciones' },
]

export default function UpdatesFeed({ locations = [], onClose, onPickLocation }) {
  const [fState, setFState] = useState('all')
  const [fKind, setFKind] = useState('all')
  const [fType, setFType] = useState('all')

  const items = useMemo(() => {
    return locations
      .filter((l) => l.updated_at)
      .map((l) => ({ l, tags: tagsFor(l) }))
      .filter(({ l, tags }) =>
        (fState === 'all' || l.state === fState) &&
        (fKind === 'all' || l.kind === fKind) &&
        (fType === 'all' || tags.some((t) => t.key === fType)),
      )
      .sort((a, b) => new Date(b.l.updated_at) - new Date(a.l.updated_at))
  }, [locations, fState, fKind, fType])

  return (
    <aside className="feed">
      <div className="feed__head">
        <h2>🕒 Actualizaciones</h2>
        <button className="panel__close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <div className="feed__filters">
        <div className="feed__filterrow">
          <button className={'chip' + (fState === 'all' ? ' chip--active' : '')} onClick={() => setFState('all')}>Todos</button>
          {STATES.map((s) => (
            <button key={s} className={'chip' + (fState === s ? ' chip--active' : '')} onClick={() => setFState(s)}>{s}</button>
          ))}
        </div>
        <div className="feed__filterrow">
          {KIND_FILTERS.map((k) => (
            <button key={k.value} className={'chip' + (fKind === k.value ? ' chip--active' : '')} onClick={() => setFKind(k.value)}>{k.label}</button>
          ))}
        </div>
        <div className="feed__filterrow">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} className={'chip' + (fType === t.value ? ' chip--active' : '')} onClick={() => setFType(t.value)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="feed__body">
        {items.length === 0 && (
          <div className="empty-state">No hay actualizaciones que coincidan con el filtro.</div>
        )}
        {items.map(({ l, tags }) => {
          const level = STATUS_LEVELS[l.status_level] || STATUS_LEVELS.sin_datos
          const meta = KIND_META[l.kind] || KIND_META.otro
          return (
            <button className="feeditem" key={l.id + '-' + l.updated_at} onClick={() => onPickLocation(l)}>
              <div className="feeditem__top">
                <span className="feeditem__name">{meta.icon} {l.name}</span>
                <span className="feeditem__time">{timeAgo(l.updated_at)}</span>
              </div>
              <div className="feeditem__meta">
                <span className="status-dot" style={{ background: level.color }} />
                {level.label}
                {' · '}{l.municipio ? l.municipio + ' · ' : ''}{l.state}
              </div>
              {tags.length > 0 && (
                <div className="feeditem__tags">
                  {tags.map((t) => (
                    <span key={t.key} className={'tag ' + t.cls}>{t.icon} {t.label}</span>
                  ))}
                </div>
              )}
              {l.summary?.trim() && <div className="feeditem__summary">{l.summary}</div>}
              {l.updated_by && <div className="feeditem__by">👤 {l.updated_by}</div>}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
