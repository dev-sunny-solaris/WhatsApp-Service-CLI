import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dispatch,
  getCommandsForRole,
  matchCommands,
  parseArgs,
  registerCommand,
  type CommandContext,
  type CommandDef,
} from './registry.js'

// Access private registry via re-import after reset
function makeCtx(writes: string[] = []): Omit<CommandContext, 'args'> {
  return {
    write: (text) => writes.push(text),
    writeLine: (line) => writes.push(line.text),
  }
}

describe('registry', () => {
  // Each test gets a fresh module to avoid state bleed
  beforeEach(() => {
    vi.resetModules()
  })

  describe('registerCommand + getCommandsForRole', () => {
    it('returns only commands matching role', async () => {
      const { registerCommand, getCommandsForRole } = await import('./registry.js')

      registerCommand({ name: 'login', description: 'Login', roles: ['unauthenticated'], handler: async () => {} })
      registerCommand({ name: 'logout', description: 'Logout', roles: ['admin', 'client'], handler: async () => {} })
      registerCommand({ name: 'devices list', description: 'List', roles: ['admin'], handler: async () => {} })

      expect(getCommandsForRole('unauthenticated').map((c) => c.name)).toEqual(['login'])
      expect(getCommandsForRole('admin').map((c) => c.name)).toContain('logout')
      expect(getCommandsForRole('admin').map((c) => c.name)).toContain('devices list')
      expect(getCommandsForRole('client').map((c) => c.name)).not.toContain('devices list')
    })
  })

  describe('matchCommands', () => {
    it('returns commands whose name starts with prefix', async () => {
      const { registerCommand, matchCommands } = await import('./registry.js')

      registerCommand({ name: 'devices list', description: '', roles: ['admin'], handler: async () => {} })
      registerCommand({ name: 'devices create', description: '', roles: ['admin'], handler: async () => {} })
      registerCommand({ name: 'quota apply', description: '', roles: ['admin'], handler: async () => {} })

      const results = matchCommands('devices', 'admin')
      expect(results.map((c) => c.name)).toEqual(['devices list', 'devices create'])
    })

    it('returns empty when no match', async () => {
      const { registerCommand, matchCommands } = await import('./registry.js')
      registerCommand({ name: 'me', description: '', roles: ['client'], handler: async () => {} })

      expect(matchCommands('xyz', 'client')).toHaveLength(0)
    })
  })

  describe('parseArgs', () => {
    it('splits by whitespace', () => {
      expect(parseArgs('hello world foo')).toEqual(['hello', 'world', 'foo'])
    })

    it('preserves spaces inside double quotes', () => {
      expect(parseArgs('"hello world" foo')).toEqual(['hello world', 'foo'])
    })

    it('preserves spaces inside single quotes', () => {
      expect(parseArgs("'hello world' foo")).toEqual(['hello world', 'foo'])
    })

    it('handles multiple quoted tokens', () => {
      expect(parseArgs('"foo bar" "baz qux"')).toEqual(['foo bar', 'baz qux'])
    })

    it('strips quotes without altering content', () => {
      expect(parseArgs('"my service key"')).toEqual(['my service key'])
    })

    it('handles empty string', () => {
      expect(parseArgs('')).toEqual([])
    })

    it('handles extra whitespace between tokens', () => {
      expect(parseArgs('  a   b  ')).toEqual(['a', 'b'])
    })
  })

  describe('dispatch', () => {
    it('calls handler for exact command match', async () => {
      const { registerCommand, dispatch } = await import('./registry.js')
      const handler = vi.fn(async () => {})

      registerCommand({ name: 'me', description: '', roles: ['client'], handler })

      const ctx = makeCtx()
      const matched = await dispatch('/me', 'client', ctx)

      expect(matched).toBe(true)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ args: [] }))
    })

    it('parses args from input', async () => {
      const { registerCommand, dispatch } = await import('./registry.js')
      let receivedArgs: string[] = []

      registerCommand({
        name: 'devices delete',
        description: '',
        roles: ['admin'],
        handler: async (ctx) => { receivedArgs = ctx.args },
      })

      const ctx = makeCtx()
      await dispatch('/devices delete dev-abc123', 'admin', ctx)

      expect(receivedArgs).toEqual(['dev-abc123'])
    })

    it('prefers longest match', async () => {
      const { registerCommand, dispatch } = await import('./registry.js')
      const shortHandler = vi.fn(async () => {})
      const longHandler = vi.fn(async () => {})

      registerCommand({ name: 'devices', description: '', roles: ['admin'], handler: shortHandler })
      registerCommand({ name: 'devices list', description: '', roles: ['admin'], handler: longHandler })

      const ctx = makeCtx()
      await dispatch('/devices list', 'admin', ctx)

      expect(longHandler).toHaveBeenCalled()
      expect(shortHandler).not.toHaveBeenCalled()
    })

    it('returns false when command not found', async () => {
      const { dispatch } = await import('./registry.js')
      const ctx = makeCtx()
      expect(await dispatch('/unknown', 'admin', ctx)).toBe(false)
    })

    it('returns false for empty input', async () => {
      const { dispatch } = await import('./registry.js')
      const ctx = makeCtx()
      expect(await dispatch('', 'admin', ctx)).toBe(false)
    })

    it('strips leading slash before matching', async () => {
      const { registerCommand, dispatch } = await import('./registry.js')
      const handler = vi.fn(async () => {})

      registerCommand({ name: 'logout', description: '', roles: ['admin'], handler })

      const ctx = makeCtx()
      await dispatch('logout', 'admin', ctx)

      expect(handler).toHaveBeenCalled()
    })
  })
})
