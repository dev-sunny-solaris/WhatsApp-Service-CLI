import { describe, expect, it } from 'vitest'
import { formatProgress } from './progressHelpers.js'

describe('formatProgress', () => {
  it('includes percentage in output', () => {
    expect(formatProgress(50)).toContain('50%')
    expect(formatProgress(0)).toContain('0%')
    expect(formatProgress(100)).toContain('100%')
  })

  it('shows more fill at higher percentage', () => {
    const low  = formatProgress(10)
    const high = formatProgress(90)
    const countFill = (s: string) => (s.match(/█/g) ?? []).length
    expect(countFill(high)).toBeGreaterThan(countFill(low))
  })

  it('clamps values below 0 to 0%', () => {
    expect(formatProgress(-10)).toContain('0%')
  })

  it('clamps values above 100 to 100%', () => {
    expect(formatProgress(110)).toContain('100%')
  })
})
