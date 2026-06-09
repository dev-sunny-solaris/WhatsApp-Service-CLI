import { describe, expect, it } from 'vitest'
import { formatSelectItem, nextSelectIndex, prevSelectIndex } from './selectHelpers.js'

describe('formatSelectItem', () => {
  it('shows > prefix when selected', () => {
    expect(formatSelectItem('Alpha', true)).toBe('> Alpha')
  })

  it('shows two-space indent when not selected', () => {
    expect(formatSelectItem('Beta', false)).toBe('  Beta')
  })
})

describe('nextSelectIndex', () => {
  it('increments within range', () => {
    expect(nextSelectIndex(0, 3)).toBe(1)
    expect(nextSelectIndex(1, 3)).toBe(2)
  })

  it('wraps around to 0 at end', () => {
    expect(nextSelectIndex(2, 3)).toBe(0)
  })
})

describe('prevSelectIndex', () => {
  it('decrements within range', () => {
    expect(prevSelectIndex(2, 3)).toBe(1)
    expect(prevSelectIndex(1, 3)).toBe(0)
  })

  it('wraps around to last at start', () => {
    expect(prevSelectIndex(0, 3)).toBe(2)
  })
})
