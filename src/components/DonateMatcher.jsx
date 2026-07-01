import { useMemo, useState } from 'react'
import { STATUS_LEVELS, SUPPLY_CHIPS } from '../data/constants'
import { matchDonationChips, normalize } from '../lib/search'
import { useI18n } from '../lib/i18n'
import Icon from './Icons'

// Tarjeta de un lugar sugerido. Reutilizada por ambos modos del flujo de donar.
function PlaceCard({ location: l, matched, distance, otherNeeds, onPick, t }) {
  const level = STATUS_LEVELS[l.status_level] || STATUS_LEVELS.sin_datos
  return (
    <div className="donate__card">
      <div className="donate__cardhead">
        <span className="donate__name">{l.name}</span>
        <span className="status-pill" style={{ background: level.color, marginTop: 0, fontSize: 11 }}>
          {level.label}
        </span>
      </div>
      <div className="donate__meta">
        <span>{l.municipio ? l.municipio + ' · ' : ''}{l.state}</span>
        {distance != null && (
          <span className="donate__distance">
            <Icon name="navigation" size={12} /> {t('donate.distance').replace('{d}', distance)}
          </span>
        )}
      </div>

      {matched?.length > 0 && (
        <div className="donate__match">
          <span className="donate__match-label">{t('donate.youCanFill')}</span>
          {matched.map((m) => <span className="donate__tag donate__tag--fill" key={m}>{m}</span>)}
        </div>
      )}

      {otherNeeds?.length > 0 && (
        <div className="donate__match">
          <span className="donate__match-label">{t('donate.otherNeeds')}</span>
          {otherNeeds.map((m) => <span className="donate__tag" key={m}>{m}</span>)}
        </div>
      )}

      {l.blood_needed && (
        <div className="alert-blood" style={{ margin: '8px 0' }}>
          <Icon name="blood" size={14} /> {l.blood_types ? l.blood_types : 'Sangre'}
        </div>
      )}

      <div className="donate__how">
        <span className="donate__how-label"><Icon name="gift" size={13} /> {t('donate.howToDonate')}</span>
        <span>{l.donation_poc?.trim() || t('donate.noContact')}</span>
      </div>

      <button className="btn btn--primary btn--block btn--sm" style={{ marginTop: 10 }} onClick={onPick}>
        <Icon name="pin" size={14} /> {t('donate.donateHere')}
      </button>
    </div>
  )
}

// Calcula los suministros que un lugar necesita pero que el donante no cubrió.
function otherNeedsFor(location, matched) {
  if (!location.supplies_needed) return []
  const matchedN = new Set(matched.map((m) => normalize(m)))
  return location.supplies_needed
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s && ![...matchedN].some((m) => normalize(s).includes(m) || m.includes(normalize(s))))
    .slice(0, 4)
}

export default function DonateMatcher({ locations = [], onClose, onPickLocation }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(null) // null | 'have' | 'help'

  // Modo "Tengo algo para donar"
  const [selected, setSelected] = useState([])
  const [otherText, setOtherText] = useState('')
  const [origin, setOrigin] = useState(null)
  const [locating, setLocating] = useState(false)

  // Modo "Quiero ayudar a un lugar"
  const [query, setQuery] = useState('')

  const toggleChip = (chip) =>
    setSelected((s) => (s.includes(chip) ? s.filter((c) => c !== chip) : [...s, chip]))

  const matches = useMemo(
    () => matchDonationChips(locations, selected, otherText, origin),
    [locations, selected, otherText, origin],
  )

  const browseResults = useMemo(() => {
    const nq = normalize(query)
    const list = nq
      ? locations.filter((l) =>
          [l.name, l.state, l.municipio].some((f) => f && normalize(f).includes(nq)),
        )
      : locations
    const order = { critico: 0, alto: 1, medio: 2, estable: 3, sin_datos: 4 }
    return [...list].sort(
      (a, b) => (order[a.status_level] ?? 9) - (order[b.status_level] ?? 9),
    )
  }, [locations, query])

  function useMyLocation() {
    if (!('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>
            {mode && (
              <button className="donate__back" onClick={() => setMode(null)} aria-label={t('donate.back')}>
                <Icon name="chevron" size={18} style={{ transform: 'rotate(90deg)' }} />
              </button>
            )}
            {t('donate.title')}
          </h2>
          <button className="panel__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body">
          {/* ----- Selector de modo ----- */}
          {!mode && (
            <div className="donate__modes">
              <button className="donate__mode" onClick={() => setMode('have')}>
                <span className="donate__mode-icon"><Icon name="gift" size={24} /></span>
                <span className="donate__mode-text">{t('donate.mode1')}</span>
                <Icon name="chevron" size={18} className="donate__mode-chev" style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <button className="donate__mode" onClick={() => setMode('help')}>
                <span className="donate__mode-icon"><Icon name="pin" size={24} /></span>
                <span className="donate__mode-text">{t('donate.mode2')}</span>
                <Icon name="chevron" size={18} className="donate__mode-chev" style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          )}

          {/* ----- Modo: tengo algo para donar ----- */}
          {mode === 'have' && (
            <>
              <label className="field__label" style={{ margin: '0 0 8px' }}>{t('donate.haveLabel')}</label>
              <div className="chip-grid">
                {SUPPLY_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    className={'chip-select' + (selected.includes(chip) ? ' chip-select--active' : '')}
                    onClick={() => toggleChip(chip)}
                    aria-pressed={selected.includes(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {selected.includes('Otro') && (
                <input
                  style={{ marginTop: 8 }}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder={t('donate.otherPlaceholder')}
                />
              )}

              <button
                type="button"
                className={'donate__geo' + (origin ? ' donate__geo--on' : '')}
                onClick={useMyLocation}
                disabled={locating}
              >
                <Icon name="navigation" size={15} /> {t('donate.useLocation')}
              </button>

              {selected.length === 0 && (
                <div className="empty-state">{t('donate.emptyHave')}</div>
              )}
              {selected.length > 0 && matches.length === 0 && (
                <div className="empty-state">{t('donate.noMatches')}</div>
              )}
              {matches.length > 0 && (
                <>
                  <div className="field__label" style={{ margin: '14px 0 6px' }}>
                    {matches.length} {matches.length === 1 ? t('donate.resultsCount1') : t('donate.resultsCount')}
                  </div>
                  {matches.map(({ location, matched, distance }) => (
                    <PlaceCard
                      key={location.id}
                      location={location}
                      matched={matched}
                      distance={distance}
                      otherNeeds={otherNeedsFor(location, matched)}
                      onPick={() => { onPickLocation && onPickLocation(location); onClose() }}
                      t={t}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* ----- Modo: quiero ayudar a un lugar ----- */}
          {mode === 'help' && (
            <>
              <label className="field__label" style={{ margin: '0 0 8px' }}>{t('donate.searchLabel')}</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('donate.searchPlaceholder')}
              />
              {browseResults.length === 0 ? (
                <div className="empty-state">{t('donate.browseEmpty')}</div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {browseResults.map((location) => (
                    <PlaceCard
                      key={location.id}
                      location={location}
                      matched={[]}
                      otherNeeds={otherNeedsFor(location, [])}
                      onPick={() => { onPickLocation && onPickLocation(location); onClose() }}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
