import { useEffect, useMemo, useRef, useState } from 'react'
import { buildKeywords, matchLocation, normalize } from '../lib/search'

export default function SearchBox({ value, onChange, locations, onPickLocation }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  const keywords = useMemo(() => buildKeywords(locations), [locations])
  const nq = normalize(value)

  const placeMatches = useMemo(() => {
    if (!nq) return []
    return locations
      .filter((l) => normalize(l.name).includes(nq) || normalize(l.municipio).includes(nq))
      .slice(0, 6)
  }, [locations, nq])

  const keywordMatches = useMemo(() => {
    if (!nq) return keywords.slice(0, 8) // populares cuando no hay texto
    return keywords.filter((k) => k.word.includes(nq) && k.word !== nq).slice(0, 8)
  }, [keywords, nq])

  // Conteo de lugares que coinciden con el texto (para mostrar feedback).
  const totalMatches = useMemo(
    () => (nq ? locations.filter((l) => matchLocation(l, nq)).length : 0),
    [locations, nq],
  )

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pickPlace(l) {
    onChange(l.name)
    onPickLocation(l)
    setOpen(false)
  }
  function pickKeyword(w) {
    onChange(w)
    setOpen(true)
  }
  function onKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter' && placeMatches.length) { e.preventDefault(); pickPlace(placeMatches[0]) }
  }

  const showDropdown = open && (placeMatches.length > 0 || keywordMatches.length > 0)

  return (
    <div className="search" ref={boxRef}>
      <div className="search__inputwrap">
        <span className="search__icon" aria-hidden>🔎</span>
        <input
          className="search__input"
          type="text"
          value={value}
          placeholder="Buscar parroquia, hospital, suministro o rescate…"
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Buscar"
        />
        {value && (
          <button className="search__clear" onClick={() => { onChange(''); setOpen(false) }} aria-label="Limpiar">×</button>
        )}
      </div>

      {nq && (
        <div className="search__count">{totalMatches} resultado{totalMatches === 1 ? '' : 's'} en el mapa</div>
      )}

      {showDropdown && (
        <div className="search__menu">
          {placeMatches.length > 0 && (
            <div className="search__group">
              <div className="search__grouptitle">Lugares</div>
              {placeMatches.map((l) => (
                <button key={l.id} className="search__item" onMouseDown={(e) => e.preventDefault()} onClick={() => pickPlace(l)}>
                  <span>{l.kind === 'hospital' ? '🏥' : '📍'}</span>
                  <span className="search__itemname">{l.name}</span>
                  <span className="search__itemmeta">{l.municipio ? l.municipio + ' · ' : ''}{l.state}</span>
                </button>
              ))}
            </div>
          )}
          {keywordMatches.length > 0 && (
            <div className="search__group">
              <div className="search__grouptitle">{nq ? 'Palabras clave' : 'Sugerencias frecuentes'}</div>
              <div className="search__chips">
                {keywordMatches.map((k) => (
                  <button key={k.word} className="search__chip" onMouseDown={(e) => e.preventDefault()} onClick={() => pickKeyword(k.word)}>
                    {k.word} <span className="search__chipcount">{k.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
