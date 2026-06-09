import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, setSession } from '../../state/session.js'

const mockListTokens = vi.fn()
const mockRevokeToken = vi.fn()
const mockRevokeAllTokens = vi.fn()

vi.mock('../../api/admin.js', () => ({
  listTokens: mockListTokens,
  revokeToken: mockRevokeToken,
  revokeAllTokens: mockRevokeAllTokens,
}))

function makeCtx(args: string[] = []) {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args,
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    writes,
  }
}

describe('/tokens list', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls listTokens and writes entries', async () => {
    mockListTokens.mockResolvedValue([
      { name: 'laptop', created_at: '2024-01-01T00:00:00.000Z', token_prefix: 'abc12345...' },
    ])
    const { tokensListHandler } = await import('./tokens.js')
    const ctx = makeCtx()
    await tokensListHandler(ctx)
    expect(mockListTokens).toHaveBeenCalled()
    expect(ctx.writes.some((w) => w.text?.includes('laptop'))).toBe(true)
  })

  it('writes message when list is empty', async () => {
    mockListTokens.mockResolvedValue([])
    const { tokensListHandler } = await import('./tokens.js')
    const ctx = makeCtx()
    await tokensListHandler(ctx)
    expect(ctx.writes.length).toBeGreaterThan(0)
  })
})

describe('/tokens revoke', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('revokes current session token and clears session', async () => {
    setSession({ role: 'admin', baseUrl: 'http://x', credentials: { serviceKey: 'sk', accessToken: 'at-current-token' } })
    mockRevokeToken.mockResolvedValue(undefined)
    const { tokensRevokeHandler } = await import('./tokens.js')
    const ctx = makeCtx()
    await tokensRevokeHandler(ctx)
    expect(mockRevokeToken).toHaveBeenCalledWith('at-current-token')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('writes error when no access token in session', async () => {
    setSession({ role: 'admin', baseUrl: 'http://x', credentials: { serviceKey: 'sk' } })
    const { tokensRevokeHandler } = await import('./tokens.js')
    const ctx = makeCtx()
    await tokensRevokeHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockRevokeToken).not.toHaveBeenCalled()
  })
})

describe('/tokens revoke-all', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls revokeAllTokens and clears session', async () => {
    mockRevokeAllTokens.mockResolvedValue(undefined)
    const { tokensRevokeAllHandler } = await import('./tokens.js')
    const ctx = makeCtx()
    await tokensRevokeAllHandler(ctx)
    expect(mockRevokeAllTokens).toHaveBeenCalled()
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })
})
