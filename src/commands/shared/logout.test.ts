import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getRole, setSession } from '../../state/session.js'

const mockClearCredentials = vi.fn()

vi.mock('../../config/credentials.js', () => ({ clearCredentials: mockClearCredentials }))

describe('/logout command', () => {
  beforeEach(() => {
    clearSession()
    vi.clearAllMocks()
  })

  function makeCtx() {
    const writes: Array<{ text: string; type?: string }> = []
    return {
      args: [] as string[],
      write: (text: string, type?: string) => writes.push({ text, type }),
      writeLine: (line: { text: string; type: string }) => writes.push(line),
      writes,
    }
  }

  it('clears session and credentials when logged in as admin', async () => {
    setSession({ role: 'admin', baseUrl: 'http://x', credentials: { serviceKey: 'sk' } })
    const { logoutHandler } = await import('./logout.js')

    await logoutHandler(makeCtx())

    expect(getRole()).toBe('unauthenticated')
    expect(mockClearCredentials).toHaveBeenCalled()
  })

  it('clears session when logged in as client', async () => {
    setSession({ role: 'client', baseUrl: 'http://x', credentials: { deviceId: 'dev' } })
    const { logoutHandler } = await import('./logout.js')

    await logoutHandler(makeCtx())

    expect(getRole()).toBe('unauthenticated')
    expect(mockClearCredentials).toHaveBeenCalled()
  })

  it('writes success message', async () => {
    setSession({ role: 'admin', baseUrl: 'http://x', credentials: {} })
    const { logoutHandler } = await import('./logout.js')
    const ctx = makeCtx()

    await logoutHandler(ctx)

    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('still clears even when already unauthenticated', async () => {
    const { logoutHandler } = await import('./logout.js')

    await logoutHandler(makeCtx())

    expect(getRole()).toBe('unauthenticated')
    expect(mockClearCredentials).toHaveBeenCalled()
  })
})
