import { describe, expect, it } from 'vitest'
import { colors, symbols } from './theme.js'

describe('theme', () => {
  it('exports color strings for all output types', () => {
    expect(colors.info).toBeTypeOf('string')
    expect(colors.success).toBeTypeOf('string')
    expect(colors.error).toBeTypeOf('string')
    expect(colors.muted).toBeTypeOf('string')
    expect(colors.prompt).toBeTypeOf('string')
  })

  it('exports symbol strings', () => {
    expect(symbols.arrow).toBeTypeOf('string')
    expect(symbols.bullet).toBeTypeOf('string')
    expect(symbols.check).toBeTypeOf('string')
    expect(symbols.cross).toBeTypeOf('string')
  })
})
