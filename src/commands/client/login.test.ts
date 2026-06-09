import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getRole, getSession } from '../../state/session.js'

const mockSaveCredentials = vi.fn()
const mockSetBaseUrl = vi.fn()

vi.mock('../../config/credentials.js', () => ({ saveCredentials: mockSaveCredentials }))
vi.mock('../../config/store.js', () => ({ setBaseUrl: mockSetBaseUrl }))

describe('/login command', () => {
  beforeEach(() => {
    clearSession()
    vi.clearAllMocks()
  })

  function makeCtx(args: string[]) {
    const writes: Array<{ text: string; type?: string }> = []
    return {
      args,
      write: (text: string, type?: string) => writes.push({ text, type }),
      writeLine: (line: { text: string; type: string }) => writes.push(line),
      writes,
    }
  }

  it('sets role to client and saves credentials on valid args', async () => {
    const { loginHandler } = await import('./login.js')
    const ctx = makeCtx(['http://localhost:3000', 'dev-abc', 'key-xyz'])

    await loginHandler(ctx)

    expect(getRole()).toBe('client')
    expect(getSession().baseUrl).toBe('http://localhost:3000')
    expect(mockSaveCredentials).toHaveBeenCalledWith({ deviceId: 'dev-abc', deviceApiKey: 'key-xyz' })
    expect(mockSetBaseUrl).toHaveBeenCalledWith('http://localhost:3000')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('writes error when args are missing', async () => {
    const { loginHandler } = await import('./login.js')
    const ctx = makeCtx(['http://localhost:3000'])

    await loginHandler(ctx)

    expect(getRole()).toBe('unauthenticated')
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })

  it('writes error when no args provided', async () => {
    const { loginHandler } = await import('./login.js')
    const ctx = makeCtx([])

    await loginHandler(ctx)

    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockSaveCredentials).not.toHaveBeenCalled()
  })
})
