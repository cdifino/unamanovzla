import { STATUS_LEVELS, STATUS_ORDER, KIND_META } from '../data/constants'

export default function Legend() {
  return (
    <div className="legend">
      <h4>Nivel de gravedad</h4>
      {STATUS_ORDER.map((k) => (
        <div className="legend__row" key={k}>
          <span className="swatch" style={{ background: STATUS_LEVELS[k].color }} />
          {STATUS_LEVELS[k].label}
        </div>
      ))}
      <h4 style={{ marginTop: 10 }}>Tipo de punto</h4>
      <div className="legend__row">
        <span className="dot" style={{ background: KIND_META.parroquia.color }} /> Parroquia
      </div>
      <div className="legend__row">
        <span className="dot" style={{ background: KIND_META.hospital.color }} /> Hospital
      </div>
      <div className="legend__row">
        <span className="dot" style={{ background: KIND_META.otro.color }} /> Otro punto
      </div>
    </div>
  )
}
