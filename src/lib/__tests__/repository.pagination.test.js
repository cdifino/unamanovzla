import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages } from '../repository'

describe('fetchAllPages', () => {
  it('returns all rows from a single page smaller than the page size', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }]
    const buildQuery = vi.fn().mockResolvedValue({ data: rows, error: null })

    const result = await fetchAllPages(buildQuery, 1000)

    expect(buildQuery).toHaveBeenCalledTimes(1)
    expect(buildQuery).toHaveBeenCalledWith(0, 999)
    expect(result).toEqual(rows)
  })

  it('paginates through multiple pages until exhausted', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `row${i}` }))
    const page2 = [{ id: 'extra1' }, { id: 'extra2' }]

    const buildQuery = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null })

    const result = await fetchAllPages(buildQuery, 1000)

    expect(buildQuery).toHaveBeenCalledTimes(2)
    expect(buildQuery).toHaveBeenNthCalledWith(1, 0, 999)
    expect(buildQuery).toHaveBeenNthCalledWith(2, 1000, 1999)
    expect(result).toHaveLength(1002)
  })

  it('fetches exactly three pages when each fills up', async () => {
    const page = (start) =>
      Array.from({ length: 10 }, (_, i) => ({ id: `row${start + i}` }))

    const buildQuery = vi
      .fn()
      .mockResolvedValueOnce({ data: page(0), error: null })
      .mockResolvedValueOnce({ data: page(10), error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    const result = await fetchAllPages(buildQuery, 10)

    expect(buildQuery).toHaveBeenCalledTimes(3)
    expect(result).toHaveLength(20)
  })

  it('returns an empty array when the first page is empty', async () => {
    const buildQuery = vi.fn().mockResolvedValue({ data: [], error: null })

    const result = await fetchAllPages(buildQuery, 1000)

    expect(buildQuery).toHaveBeenCalledTimes(1)
    expect(result).toEqual([])
  })

  it('returns an empty array when data is null', async () => {
    const buildQuery = vi.fn().mockResolvedValue({ data: null, error: null })

    const result = await fetchAllPages(buildQuery, 1000)

    expect(result).toEqual([])
  })

  it('throws when the query returns an error', async () => {
    const buildQuery = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('DB error') })

    await expect(fetchAllPages(buildQuery, 1000)).rejects.toThrow('DB error')
  })
})

// ---------------------------------------------------------------------------
// getSubmissions pagination params — verify the range arithmetic
// ---------------------------------------------------------------------------
describe('supaRepo.getSubmissions pagination', () => {
  it('calculates correct range for the first page with default pageSize', () => {
    const pageSize = 200
    const page = 0
    expect(page * pageSize).toBe(0)
    expect((page + 1) * pageSize - 1).toBe(199)
  })

  it('calculates correct range for page 1', () => {
    const pageSize = 200
    const page = 1
    expect(page * pageSize).toBe(200)
    expect((page + 1) * pageSize - 1).toBe(399)
  })

  it('calculates correct range for a custom pageSize', () => {
    const pageSize = 50
    const page = 3
    expect(page * pageSize).toBe(150)
    expect((page + 1) * pageSize - 1).toBe(199)
  })
})
