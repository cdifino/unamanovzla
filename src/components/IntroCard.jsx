import { useState } from 'react'
import Icon from './Icons'
import { useI18n } from '../lib/i18n'

const KEY = 'una_mano_intro_seen_v1'

// Tarjeta flotante de bienvenida. Solo se muestra en la primera visita y la
// descartamos de forma persistente (localStorage con respaldo en memoria).
export default function IntroCard() {
  const { t } = useI18n()
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  if (hidden) return null

  function dismiss() {
    try { localStorage.setItem(KEY, '1') } catch {}
    setHidden(true)
  }

  return (
    <div className="intro-card" role="dialog" aria-label="Una Mano">
      <span className="intro-card__flag" aria-hidden><span /><span /><span /></span>
      <div className="intro-card__body">
        <strong className="intro-card__title">Una Mano</strong>
        <p className="intro-card__text">{t('intro.text')}</p>
      </div>
      <button className="intro-card__close" onClick={dismiss} aria-label={t('intro.dismiss')}>
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
