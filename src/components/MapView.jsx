import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, Pane, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { STATUS_LEVELS, KIND_META } from '../data/constants'

const REGION_CENTER = [10.49, -66.85]

function levelColor(level) {
  return (STATUS_LEVELS[level] || STATUS_LEVELS.sin_datos).color
}
function kindColor(kind) {
  return (KIND_META[kind] || KIND_META.otro).color
}

// Centra el mapa cuando el usuario elige un lugar desde el buscador.
function FlyTo({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lng)) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 13), { duration: 0.8 })
    }
  }, [focus, map])
  return null
}

// Captura clics en el mapa cuando se esta ubicando un nuevo punto.
function ClickCapture({ active, onPick }) {
  const map = useMap()
  useMapEvents({ click: (e) => active && onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  useEffect(() => {
    const el = map.getContainer()
    el.style.cursor = active ? 'crosshair' : ''
    return () => { el.style.cursor = '' }
  }, [active, map])
  return null
}

export default function MapView({ locations, version, focus, placing, placedPoint, onMapClick, onSelect }) {
  const [geo, setGeo] = useState(null)

  useEffect(() => {
    const url = (import.meta.env.BASE_URL || '/') + 'parroquias.geojson'
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.features) && data.features.length) setGeo(data)
      })
      .catch(() => {})
  }, [])

  const byId = useMemo(() => Object.fromEntries(locations.map((l) => [l.id, l])), [locations])
  const polygonIds = useMemo(() => {
    const s = new Set()
    if (geo) for (const f of geo.features) if (f?.properties?.id) s.add(f.properties.id)
    return s
  }, [geo])

  // Solo mostramos los poligonos de parroquias que estan en el conjunto filtrado
  // (asi al filtrar por estado o por "Hospitales" los demas poligonos desaparecen
  // y no interceptan los clics).
  const geoFiltered = useMemo(() => {
    if (!geo) return null
    const features = geo.features.filter((f) => byId[f?.properties?.id])
    return { type: 'FeatureCollection', features }
  }, [geo, byId])

  const geoKey = useMemo(
    () => 'geo-' + version + '-' + (geoFiltered ? geoFiltered.features.length : 0),
    [version, geoFiltered],
  )

  // Puntos: hospitales y otros puntos siempre como marcador; parroquias solo si
  // no tienen poligono.
  const markers = useMemo(
    () =>
      locations.filter(
        (l) =>
          Number.isFinite(l.lat) &&
          Number.isFinite(l.lng) &&
          (l.kind !== 'parroquia' || !polygonIds.has(l.id)),
      ),
    [locations, polygonIds],
  )

  const styleFor = (feature) => {
    const loc = byId[feature?.properties?.id]
    return {
      color: '#1e3a8a',
      weight: 1,
      fillColor: levelColor(loc?.status_level),
      fillOpacity: 0.55,
    }
  }

  const onEach = (feature, layer) => {
    const loc = byId[feature?.properties?.id]
    const name = loc?.name || feature?.properties?.name || 'Parroquia'
    layer.bindTooltip(name, { sticky: true })
    layer.on({
      click: () => loc && onSelect(loc),
      mouseover: () => layer.setStyle({ weight: 2.5, fillOpacity: 0.75 }),
      mouseout: () => layer.setStyle({ weight: 1, fillOpacity: 0.55 }),
    })
  }

  return (
    <MapContainer className="map" center={REGION_CENTER} zoom={10} scrollWheelZoom zoomControl={false}>
      <ZoomControl position="bottomright" />
      <FlyTo focus={focus} />
      <ClickCapture active={!!placing} onPick={onMapClick} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoFiltered && geoFiltered.features.length > 0 && (
        <GeoJSON key={geoKey} data={geoFiltered} style={styleFor} onEachFeature={onEach} />
      )}
      {/* Los puntos van en un pane superior para que siempre sean clicables
          por encima de los poligonos de parroquias. */}
      <Pane name="puntos" style={{ zIndex: 640 }}>
        {markers.map((l) => (
          <CircleMarker
            key={l.id}
            center={[l.lat, l.lng]}
            radius={l.kind === 'parroquia' ? 6 : 8}
            pane="puntos"
            bubblingMouseEvents={false}
            pathOptions={{
              color: kindColor(l.kind),
              weight: 2,
              fillColor: levelColor(l.status_level),
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onSelect(l),
              mouseover: (e) => {
                e.target.setStyle({ fillColor: '#dc2626', color: '#991b1b', weight: 3 })
                e.target.bringToFront()
              },
              mouseout: (e) =>
                e.target.setStyle({
                  fillColor: levelColor(l.status_level),
                  color: kindColor(l.kind),
                  weight: 2,
                }),
            }}
          >
            <Tooltip pane="tooltipPane" direction="top" offset={[0, -6]} sticky>
              {l.name}
            </Tooltip>
          </CircleMarker>
        ))}
        {/* Marcador temporal del nuevo punto que se esta ubicando. */}
        {placedPoint && (
          <CircleMarker
            center={[placedPoint.lat, placedPoint.lng]}
            radius={10}
            pane="puntos"
            pathOptions={{ color: '#16a34a', weight: 3, fillColor: '#22c55e', fillOpacity: 0.6 }}
          >
            <Tooltip pane="tooltipPane" permanent direction="top" offset={[0, -8]}>Nuevo punto</Tooltip>
          </CircleMarker>
        )}
      </Pane>
    </MapContainer>
  )
}
