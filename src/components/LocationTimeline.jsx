import { useEffect, useState } from 'react'
import { repo } from '../lib/repository'
import { UPDATE_KINDS } from '../data/constants'
import { useI18n } from '../lib/i18n'
import Icon from './Icons'

const KIND_ICON = {
  estado: 'info',
  suministros: 'box',
  sangre: 'blood',
  donacion: 'gift',
  rescate: 'rescue',
  otro: 'pin',
}

function timeAgo(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'es', { numeric: 'auto' })
  if (mins < 1) return lang === 'en' ? 'just now' : 'ahora mismo'
  if (mins < 60) return rtf.format(-mins, 'minute')
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return rtf.format(-hrs, 'hour')
  const days = Math.floor(hrs / 24)
  if (days < 30) return rtf.format(-days, 'day')
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-VE')
}

export default function LocationTimeline({ locationId, isAdmin, onPosted }) {
  const { t, lang } = useI18n()
  const [updates, setUpdates] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [kind, setKind] = useState('estado')
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const data = await repo.getLocationUpdates(locationId)
      setUpdates(data)
    } catch (err) {
      setError(err.message || 'Error')
      setUpdates([])
    }
  }

  useEffect(() => {
    let active = true
    repo
      .getLocationUpdates(locationId)
      .then((data) => active && setUpdates(data))
      .catch((err) => {
        if (active) {
          setError(err.message || 'Error')
          setUpdates([])
        }
      })
    return () => {
      active = false
    }
  }, [locationId])

  async function post(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    try {
      await repo.createLocationUpdate(locationId, { kind, body: body.trim(), author: author.trim() })
      setBody('')
      setAuthor('')
      setKind('estado')
      setShowForm(false)
      await load()
      onPosted && onPosted()
    } catch (err) {
      setError(err.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    try {
      await repo.deleteLocationUpdate(locationId, id)
      await load()
    } catch (err) {
      setError(err.message || 'Error')
    }
  }

  function kindLabel(k) {
    const meta = UPDATE_KINDS.find((u) => u.value === k)
    if (!meta) return k
    return lang === 'en' ? meta.label_en : meta.label_es
  }

  return (
    <div className="timeline">
      <div className="timeline__head">
        <h3 className="timeline__title">{t('profile.timeline')}</h3>
        {isAdmin && (
          <button className="timeline__add" onClick={() => setShowForm((v) => !v)}>
            <Icon name={showForm ? 'close' : 'plus'} size={15} />
            <span>{showForm ? t('common.close') : t('profile.postUpdate')}</span>
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form className="timeline__form" onSubmit={post}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t('profile.postUpdate')}>
            {UPDATE_KINDS.map((u) => (
              <option key={u.value} value={u.value}>{lang === 'en' ? u.label_en : u.label_es}</option>
            ))}
          </select>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('profile.updateBody')}
            rows={3}
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={lang === 'en' ? 'Author (optional)' : 'Autor (opcional)'}
          />
          <button type="submit" className="btn btn--primary" disabled={saving || !body.trim()}>
            {saving ? t('common.loading') : t('profile.publish')}
          </button>
        </form>
      )}

      {error && <p className="timeline__error">{error}</p>}

      {updates === null && <p className="timeline__loading">{t('common.loading')}</p>}

      {updates && updates.length === 0 && (
        <p className="timeline__empty">{t('profile.noUpdates')}</p>
      )}

      {updates && updates.length > 0 && (
        <ol className="timeline__list">
          {updates.map((u) => (
            <li key={u.id} className="tl-item">
              <span className="tl-item__icon" aria-hidden>
                <Icon name={KIND_ICON[u.kind] || 'info'} size={15} />
              </span>
              <div className="tl-item__body">
                <div className="tl-item__meta">
                  <span className="tl-item__kind">{kindLabel(u.kind)}</span>
                  <span className="tl-item__time">{timeAgo(u.created_at, lang)}</span>
                </div>
                <p className="tl-item__text">{u.body}</p>
                {u.photo_url && (
                  <img className="tl-item__photo" src={u.photo_url || "/placeholder.svg"} alt="" loading="lazy" />
                )}
                {u.author && <span className="tl-item__author">{u.author}</span>}
                {isAdmin && (
                  <button className="tl-item__delete" onClick={() => remove(u.id)}>
                    <Icon name="close" size={13} /> {t('profile.delete')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
