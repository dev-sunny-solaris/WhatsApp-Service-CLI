import { describe, expect, it } from 'vitest'
import { filterCommands, nextIndex, prevIndex } from './CommandDropdown.js'
import type { CommandDef } from '../commands/registry.js'

function makeCmd(name: string): CommandDef {
  return { name, description: `desc ${name}`, roles: ['admin'], handler: async () => {} }
}

const ALL = [
  makeCmd('devices list'),
  makeCmd('devices create'),
  makeCmd('devices delete'),
  makeCmd('quota apply'),
  makeCmd('quota remove'),
]

describe('filterCommands', () => {
  it('returns all commands when prefix empty', () => {
    expect(filterCommands(ALL, '')).toHaveLength(5)
  })

  it('filters by prefix match', () => {
    const result = filterCommands(ALL, 'devices')
    expect(result.map((c) => c.name)).toEqual(['devices list', 'devices create', 'devices delete'])
  })

  it('case-insensitive match', () => {
    expect(filterCommands(ALL, 'QUOTA')).toHaveLength(2)
  })

  it('returns empty when no match', () => {
    expect(filterCommands(ALL, 'xyz')).toHaveLength(0)
  })
})

describe('nextIndex / prevIndex', () => {
  it('nextIndex wraps around to 0', () => {
    expect(nextIndex(4, 5)).toBe(0)
    expect(nextIndex(2, 5)).toBe(3)
  })

  it('prevIndex wraps around to last', () => {
    expect(prevIndex(0, 5)).toBe(4)
    expect(prevIndex(3, 5)).toBe(2)
  })
})
