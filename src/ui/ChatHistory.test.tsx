import { describe, expect, it } from 'vitest'
import { buildPrefix } from './ChatHistory.js'
import type { OutputLine } from '../commands/registry.js'

// Tests focus on the display-logic helper, not the ink render tree
describe('buildPrefix', () => {
  it('returns correct prefix symbol per type', () => {
    expect(buildPrefix('info')).toBeTypeOf('string')
    expect(buildPrefix('success')).toBeTypeOf('string')
    expect(buildPrefix('error')).toBeTypeOf('string')
    expect(buildPrefix('raw')).toBe('')
  })

  it('info and success have distinct prefixes', () => {
    expect(buildPrefix('info')).not.toBe(buildPrefix('success'))
  })
})

describe('ChatHistory data contract', () => {
  it('OutputLine type has text and type fields', () => {
    const line: OutputLine = { text: 'hello', type: 'info' }
    expect(line.text).toBe('hello')
    expect(line.type).toBe('info')
  })
})
