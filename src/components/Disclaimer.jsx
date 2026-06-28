import { useState } from 'react'

const KEY = 'mapa_ayuda_disclaimer_dismissed_v1'

export default function Disclaimer() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  if (hidden) return null
  function dismiss() {
    try { localStorage.setItem(KEY, '1') } catch {}
    setHidden(true)
  }
  return (
    <div className="disclaimer" role="note">
      <span className="disclaimer__icon" aria-hidden>⚠️</span>
      <span className="disclaimer__text">
        Información <strong>colaborativa</strong>, aportada por la comunidad y revisada por
        administradores. Puede no estar verificada en tiempo real: <strong>confirma con el contacto del lugar</strong> antes
        de movilizar recursos o donaciones.
      </span>
      <button className="disclaimer__close" onClick={dismiss} aria-label="Cerrar aviso">×</button>
    </div>
  )
}
