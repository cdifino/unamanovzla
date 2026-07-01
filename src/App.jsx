import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import MapView from './components/MapView'
import Legend from './components/Legend'
import LocationPanel from './components/LocationPanel'
import AdminLogin from './components/AdminLogin'
import AdminQueue from './components/AdminQueue'
import AdminManager from './components/AdminManager'
import SearchBox from './components/SearchBox'
import NewLocationForm from './components/NewLocationForm'
import DonateMatcher from './components/DonateMatcher'
import UpdatesFeed from './components/UpdatesFeed'
import ResetPassword from './components/ResetPassword'
import IntroCard from './components/IntroCard'
import MapStats from './components/MapStats'
import DirectoryPage from './components/DirectoryPage'
import AboutPage from './components/AboutPage'
import Icon from './components/Icons'
import { useI18n } from './lib/i18n'
import { repo } from './lib/repository'
import { STATES } from './data/constants'
import { matchLocation, normalize } from './lib/search'

export default function App() {
  const { t } = useI18n()
  const [locations, setLocations] = useState([])
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [session, setSession] = useState({ isAdmin: false })
  const [showLogin, setShowLogin] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showAdmins, setShowAdmins] = useState(false)
  const [filterState, setFilterState] = useState('all')
  const [filterKind, setFilterKind] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(null)
  const [placedPoint, setPlacedPoint] = useState(null)
  const [showReset, setShowReset] = useState(false)

  // Vista activa: map | directory | donate | updates | report | about
  const [view, setView] = useState('map')

  const placing = view === 'report' && !placedPoint
  const showNewForm = view === 'report'
  // El mapa permanece montado (conserva el estado de Leaflet) salvo en las
  // vistas de pagina completa, que se renderizan en su lugar.
  const showMap = view !== 'directory' && view !== 'about'

  async function loadLocations() {
    const data = await repo.getLocations()
    setLocations(data)
    setVersion((v) => v + 1)
    setLoading(false)
  }

  useEffect(() => {
    loadLocations()
    repo.getSession().then(setSession).catch(() => {})
    const unsub = repo.onAuthEvent((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowReset(true)
    })
    return unsub
  }, [])

  const filtered = useMemo(() => {
    const nq = normalize(query)
    return locations.filter(
      (l) =>
        (filterState === 'all' || l.state === filterState) &&
        (filterKind === 'all' || l.kind === filterKind) &&
        matchLocation(l, nq),
    )
  }, [locations, filterState, filterKind, query])

  function handlePickLocation(l) {
    setSelectedId(l.id)
    if (Number.isFinite(l.lat) && Number.isFinite(l.lng)) {
      setFocus({ lat: l.lat, lng: l.lng, ts: Date.now() })
    }
  }

  function navigate(next) {
    if (next === 'report') {
      setSelectedId(null)
      setPlacedPoint(null)
    }
    setView(next)
  }

  function pickFromDirectory(l) {
    setView('map')
    handlePickLocation(l)
  }

  function closeReport() {
    setPlacedPoint(null)
    setView('map')
  }
  function handleMapClick(pt) {
    if (view !== 'report') return
    setPlacedPoint(pt)
  }

  const selected = useMemo(
    () => locations.find((l) => l.id === selectedId) || null,
    [locations, selectedId],
  )

  function applyPatch(id, patch) {
    setLocations((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    setVersion((v) => v + 1)
  }

  async function handleAdminClick() {
    if (session.isAdmin) setShowQueue(true)
    else setShowLogin(true)
  }

  async function handleSignOut() {
    await repo.signOut()
    setSession({ isAdmin: false })
  }

  return (
    <div className="app">
      <Header
        view={view}
        onNavigate={navigate}
        session={session}
        onAdminClick={handleAdminClick}
        onSignOut={handleSignOut}
        onManageAdmins={() => setShowAdmins(true)}
      />

      <div className="main">
        <div className="map-wrap" style={{ display: showMap ? 'block' : 'none' }}>
          <MapView
            locations={filtered}
            version={version}
            focus={focus}
            placing={placing}
            placedPoint={placedPoint}
            onMapClick={handleMapClick}
            onSelect={(l) => setSelectedId(l.id)}
          />

          <div className="toolbar">
            <SearchBox value={query} onChange={setQuery} locations={locations} onPickLocation={handlePickLocation} />
            <button
              type="button"
              className={'filters__toggle' + (filtersOpen ? ' filters__toggle--open' : '')}
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
            >
              <Icon name="list" size={16} />
              <span>Filtros</span>
              {(filterState !== 'all' || filterKind !== 'all') && (
                <span className="filters__count">{(filterState !== 'all' ? 1 : 0) + (filterKind !== 'all' ? 1 : 0)}</span>
              )}
              <Icon name="chevron" size={16} className="filters__toggle-caret" />
            </button>
            <div className={'filters' + (filtersOpen ? ' filters--open' : '')}>
              <div className="filters__group">
                <span className="filters__label">Lugar</span>
                <div className="filters__chips">
                  <button className={'chip' + (filterState === 'all' ? ' chip--active' : '')} onClick={() => setFilterState('all')}>
                    Todos los estados
                  </button>
                  {STATES.map((s) => (
                    <button key={s} className={'chip' + (filterState === s ? ' chip--active' : '')} onClick={() => setFilterState(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filters__group">
                <span className="filters__label">Tipo de punto de ayuda</span>
                <div className="filters__chips">
                  <button className={'chip' + (filterKind === 'all' ? ' chip--active' : '')} onClick={() => setFilterKind('all')}>
                    Todo
                  </button>
                  <button className={'chip' + (filterKind === 'parroquia' ? ' chip--active' : '')} onClick={() => setFilterKind('parroquia')}>
                    Parroquias
                  </button>
                  <button className={'chip' + (filterKind === 'hospital' ? ' chip--active' : '')} onClick={() => setFilterKind('hospital')}>
                    Hospitales
                  </button>
                  <button className={'chip' + (filterKind === 'otro' ? ' chip--active' : '')} onClick={() => setFilterKind('otro')}>
                    Otros puntos
                  </button>
                </div>
              </div>
            </div>
          </div>

          {view === 'map' && <IntroCard />}
          {view === 'map' && <MapStats locations={locations} />}

          <Legend />

          {loading && (
            <div className="legend" style={{ bottom: 'auto', top: 70, left: '50%', transform: 'translateX(-50%)' }}>
              Cargando ubicaciones…
            </div>
          )}

          {view === 'map' && !selected && (
            <button className="fab-report" onClick={() => navigate('report')}>
              <Icon name="plus" size={20} />
              <span>{t('map.report')}</span>
            </button>
          )}

          {selected && !showNewForm && (
            <LocationPanel
              location={selected}
              isAdmin={session.isAdmin}
              onClose={() => setSelectedId(null)}
              onUpdated={applyPatch}
            />
          )}

          {showNewForm && (
            <NewLocationForm
              placedPoint={placedPoint}
              onRemark={() => setPlacedPoint(null)}
              onClose={closeReport}
              onSetPoint={(pt) => { setPlacedPoint(pt); setFocus({ lat: pt.lat, lng: pt.lng, ts: Date.now() }) }}
              onSent={() => { setPlacedPoint(null); loadLocations() }}
            />
          )}
        </div>

        {view === 'directory' && (
          <DirectoryPage locations={locations} onPick={pickFromDirectory} />
        )}

        {view === 'about' && (
          <AboutPage onReport={() => navigate('report')} />
        )}

        {view === 'updates' && (
          <UpdatesFeed
            locations={locations}
            onClose={() => setView('map')}
            onPickLocation={(l) => { setView('map'); handlePickLocation(l) }}
          />
        )}
      </div>

      {view === 'donate' && (
        <DonateMatcher
          locations={locations}
          onClose={() => setView('map')}
          onPickLocation={(l) => { setView('map'); handlePickLocation(l) }}
        />
      )}

      {showLogin && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onLoggedIn={() => {
            setShowLogin(false)
            repo.getSession().then(setSession)
            setShowQueue(true)
          }}
        />
      )}

      {showQueue && session.isAdmin && (
        <AdminQueue locations={locations} onClose={() => setShowQueue(false)} onApplied={loadLocations} />
      )}

      {showAdmins && session.isSuper && (
        <AdminManager locations={locations} onClose={() => setShowAdmins(false)} />
      )}

      {showReset && (
        <ResetPassword
          onClose={() => {
            setShowReset(false)
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search)
            }
          }}
          onDone={() => repo.getSession().then(setSession).catch(() => {})}
        />
      )}
    </div>
  )
}
