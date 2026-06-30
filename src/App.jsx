import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import MapView from './components/MapView'
import Legend from './components/Legend'
import LocationPanel from './components/LocationPanel'
import SearchBox from './components/SearchBox'
import Disclaimer from './components/Disclaimer'
import { repo } from './lib/repository'
import { STATES } from './data/constants'
import { matchLocation, normalize } from './lib/search'

// Admin screens and auxiliary modals are not needed on initial paint — load
// them lazily so Vite creates separate chunks and the initial bundle stays
// well under the 500 KB warning threshold.
const AdminLogin = lazy(() => import('./components/AdminLogin'))
const AdminQueue = lazy(() => import('./components/AdminQueue'))
const AdminManager = lazy(() => import('./components/AdminManager'))
const NewLocationForm = lazy(() => import('./components/NewLocationForm'))
const DonateMatcher = lazy(() => import('./components/DonateMatcher'))
const UpdatesFeed = lazy(() => import('./components/UpdatesFeed'))
const ResetPassword = lazy(() => import('./components/ResetPassword'))

export default function App() {
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
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placedPoint, setPlacedPoint] = useState(null)
  const [showDonate, setShowDonate] = useState(false)
  const [showFeed, setShowFeed] = useState(false)
  const [showReset, setShowReset] = useState(false)

  async function loadLocations() {
    const data = await repo.getLocations()
    setLocations(data)
    setVersion((v) => v + 1)
    setLoading(false)
  }

  useEffect(() => {
    loadLocations()
    repo.getSession().then(setSession).catch(() => {})
    // Detecta el regreso desde el correo de recuperacion de clave.
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

  function openNewForm() {
    setSelectedId(null)
    setPlacedPoint(null)
    setPlacing(true)
    setShowNewForm(true)
  }
  function closeNewForm() {
    setShowNewForm(false)
    setPlacing(false)
    setPlacedPoint(null)
  }
  function handleMapClick(pt) {
    setPlacedPoint(pt)
    setPlacing(false)
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
        session={session}
        onAdminClick={handleAdminClick}
        onSignOut={handleSignOut}
        onManageAdmins={() => setShowAdmins(true)}
        onNewPoint={openNewForm}
        onDonate={() => setShowDonate(true)}
        onToggleFeed={() => setShowFeed((v) => !v)}
        feedOpen={showFeed}
      />

      <Disclaimer />

      <div className="main">
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
          <div className="filters">
            <button className={'chip' + (filterState === 'all' ? ' chip--active' : '')} onClick={() => setFilterState('all')}>
              Todos los estados
            </button>
            {STATES.map((s) => (
              <button key={s} className={'chip' + (filterState === s ? ' chip--active' : '')} onClick={() => setFilterState(s)}>
                {s}
              </button>
            ))}
            <span style={{ width: 8 }} />
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

        <Legend />

        {showFeed && (
          <Suspense fallback={null}>
            <UpdatesFeed
              locations={locations}
              onClose={() => setShowFeed(false)}
              onPickLocation={handlePickLocation}
            />
          </Suspense>
        )}

        {loading && (
          <div className="legend" style={{ bottom: 'auto', top: 70, left: '50%', transform: 'translateX(-50%)' }}>
            Cargando ubicaciones…
          </div>
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
          <Suspense fallback={null}>
            <NewLocationForm
              placedPoint={placedPoint}
              onRemark={() => { setPlacedPoint(null); setPlacing(true) }}
              onClose={closeNewForm}
              onSent={() => { setPlacing(false); loadLocations() }}
            />
          </Suspense>
        )}
      </div>

      {showDonate && (
        <Suspense fallback={null}>
          <DonateMatcher
            locations={locations}
            onClose={() => setShowDonate(false)}
            onPickLocation={handlePickLocation}
          />
        </Suspense>
      )}

      {showLogin && (
        <Suspense fallback={null}>
          <AdminLogin
            onClose={() => setShowLogin(false)}
            onLoggedIn={() => {
              setShowLogin(false)
              repo.getSession().then(setSession)
              setShowQueue(true)
            }}
          />
        </Suspense>
      )}

      {showQueue && session.isAdmin && (
        <Suspense fallback={null}>
          <AdminQueue locations={locations} onClose={() => setShowQueue(false)} onApplied={loadLocations} />
        </Suspense>
      )}

      {showAdmins && session.isSuper && (
        <Suspense fallback={null}>
          <AdminManager locations={locations} onClose={() => setShowAdmins(false)} />
        </Suspense>
      )}

      {showReset && (
        <Suspense fallback={null}>
          <ResetPassword
            onClose={() => {
              setShowReset(false)
              if (typeof window !== 'undefined' && window.history?.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
              }
            }}
            onDone={() => repo.getSession().then(setSession).catch(() => {})}
          />
        </Suspense>
      )}
    </div>
  )
}
