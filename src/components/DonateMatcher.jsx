import { useMemo, useState } from 'react'
import { STATUS_LEVELS, KIND_META } from '../data/constants'
import { parseDonationItems, matchDonations } from '../lib/search'

export default function DonateMatcher({ locations = [], onClose, onPickLocation }) {
  const [text, setText] = useState('')

  const items = useMemo(() => parseDonationItems(text), [text])
  const results = useMemo(() => matchDonations(locations, items), [locations, items])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>🎁 Quiero donar</h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Escribe lo que puedes donar (uno por linea o separado por comas) y te
            sugerimos lugares que lo necesitan. Por ejemplo: agua, pañales, medicinas, sangre O-.
          </p>
          <textarea
            className="donate__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'agua potable\npañales\nmedicinas\nsangre O-'}
          />

          {items.length === 0 && (
            <div className="empty-state">Ingresa lo que puedes donar para ver sugerencias.</div>
          )}

          {items.length > 0 && results.length === 0 && (
            <div className="empty-state">
              No encontramos lugares que hayan registrado necesidad de eso por ahora.
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="field__label" style={{ margin: '6px 0' }}>
                {results.length} lugar{results.length === 1 ? '' : 'es'} donde tu donacion ayuda
              </div>
              {results.map(({ location: l, matched }) => {
                const level = STATUS_LEVELS[l.status_level] || STATUS_LEVELS.sin_datos
                return (
                  <div className="donate__card" key={l.id}>
                    <div className="donate__cardhead">
                      <span className="donate__name">
                        {(KIND_META[l.kind] || KIND_META.otro).icon} {l.name}
                      </span>
                      <span className="status-pill" style={{ background: level.color, marginTop: 0, fontSize: 11 }}>
                        {level.label}
                      </span>
                    </div>
                    <div className="sub-card__meta">
                      {l.municipio ? l.municipio + ' · ' : ''}{l.state}
                    </div>
                    <div className="donate__match">
                      Coincide con: {matched.map((m) => <span className="donate__tag" key={m}>{m}</span>)}
                    </div>
                    {l.supplies_needed?.trim() && (
                      <div style={{ fontSize: 13, margin: '4px 0' }}>
                        <span className="muted">Necesita: </span>{l.supplies_needed}
                      </div>
                    )}
                    {l.blood_needed && (
                      <div className="alert-blood" style={{ margin: '6px 0' }}>
                        🩸 Sangre{l.blood_types ? `: ${l.blood_types}` : ''}
                      </div>
                    )}
                    <div className="poc-box" style={{ margin: '6px 0' }}>
                      <strong>¿Donde entregar?</strong>{' '}
                      {l.donation_poc?.trim() || 'Sin punto de entrega registrado aun.'}
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => { onPickLocation && onPickLocation(l); onClose() }}
                    >
                      Ver en el mapa
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
