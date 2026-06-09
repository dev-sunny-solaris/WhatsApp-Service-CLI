import { describe, expect, it } from 'vitest'
import { getSpinnerFrame, SPINNER_FRAMES } from './spinnerHelpers.js'

describe('SPINNER_FRAMES', () => {
  it('is a non-empty array of strings', () => {
    expect(Array.isArray(SPINNER_FRAMES)).toBe(true)
    expect(SPINNER_FRAMES.length).toBeGreaterThan(0)
    expect(typeof SPINNER_FRAMES[0]).toBe('string')
  })
})

describe('getSpinnerFrame', () => {
  const frames = ['A', 'B', 'C']

  it('returns frame at tick index', () => {
    expect(getSpinnerFrame(frames, 0)).toBe('A')
    expect(getSpinnerFrame(frames, 1)).toBe('B')
    expect(getSpinnerFrame(frames, 2)).toBe('C')
  })

  it('wraps around when tick exceeds frames.length', () => {
    expect(getSpinnerFrame(frames, 3)).toBe('A')
    expect(getSpinnerFrame(frames, 4)).toBe('B')
    expect(getSpinnerFrame(frames, 6)).toBe('A')
  })
})
