import { describe, it, expect } from 'vitest'
import {
  normalize,
  matchLocation,
  buildKeywords,
  parseDonationItems,
  matchDonations,
} from './search.js'

describe('normalize', () => {
  it('elimina acentos y pasa a minusculas', () => {
    expect(normalize('Médico Á É Í Ó Ú Ñ')).toBe('medico a e i o u n')
  })

  it('recorta espacios al inicio y al final', () => {
    expect(normalize('  Hola Mundo  ')).toBe('hola mundo')
  })

  it('maneja valores nulos o indefinidos sin fallar', () => {
    expect(normalize(null)).toBe('')
    expect(normalize(undefined)).toBe('')
    // 0 es falsy, por lo que la funcion lo trata como cadena vacia.
    expect(normalize(0)).toBe('')
    expect(normalize(42)).toBe('42')
  })
})

describe('matchLocation', () => {
  const loc = {
    name: 'Hospital Vargas',
    state: 'La Guaira',
    supplies_needed: 'Agua y medicinas',
  }

  it('coincide sin importar acentos ni mayusculas', () => {
    expect(matchLocation(loc, normalize('médicinas'))).toBe(true)
    expect(matchLocation(loc, normalize('VARGAS'))).toBe(true)
  })

  it('devuelve true cuando la consulta esta vacia', () => {
    expect(matchLocation(loc, '')).toBe(true)
  })

  it('devuelve false cuando no hay coincidencia', () => {
    expect(matchLocation(loc, normalize('zapatos'))).toBe(false)
  })

  it('ignora campos ausentes', () => {
    expect(matchLocation({ name: 'Centro' }, normalize('agua'))).toBe(false)
  })
})

describe('buildKeywords', () => {
  it('cuenta y ordena palabras por frecuencia', () => {
    const locations = [
      { supplies_needed: 'agua agua medicinas' },
      { rescue_teams: 'agua brigadas' },
    ]
    const kw = buildKeywords(locations)
    expect(kw[0]).toEqual({ word: 'agua', count: 3 })
    const words = kw.map((k) => k.word)
    expect(words).toContain('medicinas')
    expect(words).toContain('brigadas')
  })

  it('descarta stopwords, numeros y palabras cortas', () => {
    const kw = buildKeywords([{ supplies_needed: 'de la 123 ab agua' }])
    const words = kw.map((k) => k.word)
    expect(words).toEqual(['agua'])
  })

  it('devuelve un arreglo vacio cuando no hay texto', () => {
    expect(buildKeywords([{ name: 'Solo nombre' }])).toEqual([])
    expect(buildKeywords([])).toEqual([])
  })
})

describe('parseDonationItems', () => {
  it('separa por coma, punto y coma y saltos de linea', () => {
    expect(parseDonationItems('agua, arroz; pan\nleche')).toEqual([
      'agua',
      'arroz',
      'pan',
      'leche',
    ])
  })

  it('elimina duplicados y entradas vacias', () => {
    expect(parseDonationItems('agua, agua, , pan')).toEqual(['agua', 'pan'])
  })

  it('maneja entradas vacias o nulas', () => {
    expect(parseDonationItems('')).toEqual([])
    expect(parseDonationItems(null)).toEqual([])
  })
})

describe('matchDonations', () => {
  const locations = [
    {
      id: 'a',
      status_level: 'critico',
      supplies_needed: 'agua potable, arroz',
    },
    {
      id: 'b',
      status_level: 'estable',
      supplies_needed: 'agua',
    },
    {
      id: 'c',
      status_level: 'medio',
      blood_needed: true,
      blood_types: 'O+',
      supplies_needed: '',
    },
    {
      id: 'd',
      status_level: 'medio',
      supplies_needed: '',
    },
  ]

  it('sugiere ubicaciones que necesitan lo que la persona puede donar', () => {
    const res = matchDonations(locations, ['agua'])
    const ids = res.map((r) => r.location.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
    expect(ids).not.toContain('d')
  })

  it('ordena por cantidad de coincidencias y luego por gravedad', () => {
    const res = matchDonations(locations, ['agua', 'arroz'])
    // "a" coincide con dos items (agua + arroz); debe ir primero.
    expect(res[0].location.id).toBe('a')
  })

  it('reconoce donaciones de sangre', () => {
    const res = matchDonations(locations, ['sangre'])
    expect(res.map((r) => r.location.id)).toContain('c')
  })

  it('no sugiere ubicaciones sin necesidades registradas', () => {
    const res = matchDonations(locations, ['agua'])
    expect(res.map((r) => r.location.id)).not.toContain('d')
  })

  it('devuelve un arreglo vacio cuando los items son demasiado cortos o vacios', () => {
    expect(matchDonations(locations, ['a'])).toEqual([])
    expect(matchDonations(locations, [])).toEqual([])
  })
})
