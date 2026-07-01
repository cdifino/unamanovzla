import { useState } from 'react'
import { STATUS_LEVELS, STATUS_ORDER, KIND_META } from '../data/constants'
import { useI18n } from '../lib/i18n'
import Icon from './Icons'

// Leyenda colapsable anclada a una esquina del mapa. Colapsada por defecto en
// mobile para no tapar el mapa ni la barra de controles.
export default function Legend() {
  const { t } = useI18n()
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth > 720
  })

  return (
    <div className={'legend' + (open ? ' legend--open' : '')}>
      <button
        className="legend__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon name="info" size={15} />
        <span>{t('legend.toggle')}</span>
        <Icon name="chevron" size={15} className={'legend__chev' + (open ? ' legend__chev--open' : '')} />
      </button>

      {open && (
        <div className="legend__panel">
          <h4>{t('legend.title')}</h4>
          {STATUS_ORDER.map((k) => (
            <div className="legend__row" key={k}>
              <span className="swatch" style={{ background: STATUS_LEVELS[k].color }} />
              {STATUS_LEVELS[k].label}
            </div>
          ))}
          <h4 style={{ marginTop: 10 }}>{t('legend.kindTitle')}</h4>
          <div className="legend__row">
            <span className="dot" style={{ background: KIND_META.parroquia.color }} /> {t('legend.parroquia')}
          </div>
          <div className="legend__row">
            <span className="dot" style={{ background: KIND_META.hospital.color }} /> {t('legend.hospital')}
          </div>
          <div className="legend__row">
            <span className="dot" style={{ background: KIND_META.otro.color }} /> {t('legend.otro')}
          </div>
        </div>
      )}
    </div>
  )
}
