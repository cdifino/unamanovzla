import { useState } from 'react'
import { repo } from '../lib/repository'
import { STATUS_LEVELS, STATUS_ORDER, KIND_META, VERIFICATION } from '../data/constants'
import { useI18n } from '../lib/i18n'
import SubmissionForm from './SubmissionForm'
import LocationTimeline from './LocationTimeline'
import Icon from './Icons'

function Field({ label, icon, value }) {
  const { t } = useI18n()
  const empty = !value || (typeof value === 'string' && !value.trim())
  return (
    <div className="field">
      <div className="field__label">{icon && <span>{icon}</span>} {label}</div>
      <div className={'field__value' + (empty ? ' field__value--empty' : '')}>
        {empty ? t('profile.noInfo') : value}
      </div>
    </div>
  )
}

function VerificationBadge({ value }) {
  const { t } = useI18n()
  const v = VERIFICATION[value] || VERIFICATION.sin_actualizar
  const key = value && VERIFICATION[value] ? value : 'sin_actualizar'
  return (
    <span className="verif-badge" style={{ color: v.color, borderColor: v.color }}>
      <Icon name={key === 'verificado' ? 'check' : key === 'pendiente' ? 'clock' : 'info'} size={13} />
      {t('verif.' + key)}
    </span>
  )
}

function ContactSection({ location }) {
  const { t } = useI18n()
  const rows = [
    { key: 'address', icon: 'pin', value: location.address, href: null },
    { key: 'phone', icon: 'bell', value: location.contact_phone, href: location.contact_phone ? `tel:${location.contact_phone}` : null },
    { key: 'whatsapp', icon: 'whatsapp', value: location.contact_whatsapp, href: location.contact_whatsapp ? `https://wa.me/${location.contact_whatsapp.replace(/[^0-9]/g, '')}` : null },
    { key: 'email', icon: 'info', value: location.contact_email, href: location.contact_email ? `mailto:${location.contact_email}` : null },
    { key: 'website', icon: 'globe', value: location.website, href: location.website || null },
  ].filter((r) => r.value && r.value.trim())

  if (rows.length === 0) return null
  return (
    <div className="contact">
      <div className="section-title">{t('profile.contact')}</div>
      <ul className="contact__list">
        {rows.map((r) => (
          <li key={r.key} className="contact__row">
            <Icon name={r.icon} size={15} />
            {r.href ? (
              <a href={r.href} target="_blank" rel="noopener noreferrer">{r.value}</a>
            ) : (
              <span>{r.value}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AdminEdit({ location, onSaved, onCancel }) {
  const { t } = useI18n()
  const isHospital = location.kind === 'hospital'
  const isParroquia = location.kind === 'parroquia'
  const [f, setF] = useState({
    status_level: location.status_level || 'sin_datos',
    verification: location.verification || 'sin_actualizar',
    summary: location.summary || '',
    supplies_needed: location.supplies_needed || '',
    donation_poc: location.donation_poc || '',
    rescue_teams: location.rescue_teams || '',
    buildings_searched: location.buildings_searched || '',
    people_aided: location.people_aided || '',
    blood_needed: !!location.blood_needed,
    blood_types: location.blood_types || '',
    address: location.address || '',
    contact_phone: location.contact_phone || '',
    contact_whatsapp: location.contact_whatsapp || '',
    contact_email: location.contact_email || '',
    website: location.website || '',
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
        {t('profile.adminNotice')}
      </div>
      <label>{t('profile.severity')}</label>
      <select value={f.status_level} onChange={(e) => set('status_level', e.target.value)}>
        {STATUS_ORDER.map((k) => (
          <option key={k} value={k}>{STATUS_LEVELS[k].label}</option>
        ))}
      </select>
      <label>{t('profile.verification')}</label>
      <select value={f.verification} onChange={(e) => set('verification', e.target.value)}>
        {Object.keys(VERIFICATION).map((k) => (
          <option key={k} value={k}>{t('verif.' + k)}</option>
        ))}
      </select>
      <label>{t('profile.situation')}</label>
      <textarea value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      {isParroquia && (
        <>
          <label>{t('profile.rescue')}</label>
          <textarea value={f.rescue_teams} onChange={(e) => set('rescue_teams', e.target.value)} />
          <label>{t('profile.buildings')}</label>
          <textarea value={f.buildings_searched} onChange={(e) => set('buildings_searched', e.target.value)} />
        </>
      )}
      {isHospital && (
        <>
          <label>{t('profile.peopleAided')}</label>
          <input value={f.people_aided} onChange={(e) => set('people_aided', e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={f.blood_needed} onChange={(e) => set('blood_needed', e.target.checked)} />
            {t('profile.bloodNeeded')}
          </label>
          <label>{t('profile.bloodTypes')}</label>
          <input value={f.blood_types} onChange={(e) => set('blood_types', e.target.value)} />
        </>
      )}
      <label>{t('profile.supplies')}</label>
      <textarea value={f.supplies_needed} onChange={(e) => set('supplies_needed', e.target.value)} />
      <label>{t('profile.donationPoc')}</label>
      <input value={f.donation_poc} onChange={(e) => set('donation_poc', e.target.value)} />

      <div className="section-title" style={{ marginTop: 12 }}>{t('profile.contact')}</div>
      <label>{t('profile.address')}</label>
      <input value={f.address} onChange={(e) => set('address', e.target.value)} />
      <label>{t('profile.phone')}</label>
      <input value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
      <label>{t('profile.whatsapp')}</label>
      <input value={f.contact_whatsapp} onChange={(e) => set('contact_whatsapp', e.target.value)} />
      <label>{t('profile.email')}</label>
      <input value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
      <label>{t('profile.website')}</label>
      <input value={f.website} onChange={(e) => set('website', e.target.value)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('profile.cancel')}</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? t('common.loading') : t('profile.publishChanges')}
        </button>
      </div>
    </form>
  )
}

export default function LocationPanel({ location, isAdmin, onClose, onUpdated }) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState('view')
  const isHospital = location.kind === 'hospital'
  const isParroquia = location.kind === 'parroquia'
  const kindLabel = (KIND_META[location.kind] || KIND_META.otro).label
  const level = STATUS_LEVELS[location.status_level] || STATUS_LEVELS.sin_datos

  return (
    <aside className="panel">
      <div className="panel__head">
        <button className="panel__close" onClick={onClose} aria-label={t('common.close')}>×</button>
        <span className={'panel__kind panel__kind--' + location.kind}>
          {kindLabel}
        </span>
        <h2 className="panel__title">{location.name}</h2>
        <div className="panel__sub">
          {location.municipio ? location.municipio + ' · ' : ''}{location.state}
        </div>
        <div className="panel__badges">
          <span className="status-pill" style={{ background: level.color }}>{level.label}</span>
          <VerificationBadge value={location.verification} />
        </div>
      </div>

      <div className="panel__body">
        {mode === 'view' && (
          <>
            {location.updated_at && (
              <div className="updated">
                {t('profile.updatedAt')}: {new Date(location.updated_at).toLocaleString(lang === 'en' ? 'en-US' : 'es-VE')}
                {location.updated_by ? ` · ${location.updated_by}` : ''}
              </div>
            )}

            {location.description?.trim() && (
              <p className="panel__desc">{location.description}</p>
            )}

            <Field label={t('profile.situation')} icon={<Icon name="clipboard" size={14} />} value={location.summary} />

            {isHospital && (
              <>
                <Field label={t('profile.peopleAided')} icon={<Icon name="medical" size={14} />} value={location.people_aided} />
                {location.blood_needed && (
                  <div className="alert-blood">
                    <Icon name="blood" size={15} /> {t('profile.bloodNeeded')}{location.blood_types ? `: ${location.blood_types}` : ''}
                  </div>
                )}
              </>
            )}
            {isParroquia && (
              <>
                <Field label={t('profile.rescue')} icon={<Icon name="rescue" size={14} />} value={location.rescue_teams} />
                <Field label={t('profile.buildings')} icon={<Icon name="building" size={14} />} value={location.buildings_searched} />
              </>
            )}

            <Field label={t('profile.supplies')} icon={<Icon name="box" size={14} />} value={location.supplies_needed} />

            <div className="section-title">{t('profile.donations')}</div>
            <div className="poc-box">
              {location.donation_poc?.trim() ? location.donation_poc : t('profile.noDonationPoc')}
            </div>

            <ContactSection location={location} />

            <LocationTimeline
              locationId={location.id}
              isAdmin={isAdmin}
              onPosted={() => onUpdated && onUpdated(location.id, { verification: 'verificado' })}
            />

            <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={() => setMode('submit')}>
              <Icon name="edit" size={15} /> {t('profile.sendUpdate')}
            </button>
            {isAdmin && (
              <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => setMode('edit')}>
                <Icon name="tool" size={15} /> {t('profile.adminEdit')}
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
