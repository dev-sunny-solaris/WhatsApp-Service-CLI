import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, getRole, getSession } from '../../state/session.js'

const mockAdminLogin = vi.fn()
const mockSaveCredentials = vi.fn()
const mockSetBaseUrl = vi.fn()

vi.mock('../../api/admin.js', () => ({ adminLogin: mockAdminLogin }))
vi.mock('../../config/credentials.js', () => ({ saveCredentials: mockSaveCredentials }))
vi.mock('../../config/store.js', () => ({ setBaseUrl: mockSetBaseUrl }))

describe('/login-admin command', () => {
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

  it('sets role to admin on successful login', async () => {
    mockAdminLogin.mockResolvedValue({ access_token: 'at-test-123' })
    const { loginAdminHandler } = await import('./login-admin.js')
    const ctx = makeCtx(['http://api.test', 'sk-secret', '123456'])

    await loginAdminHandler(ctx)

    expect(getRole()).toBe('admin')
    expect(getSession().baseUrl).toBe('http://api.test')
    expect(mockSaveCredentials).toHaveBeenCalledWith({
      serviceKey: 'sk-secret',
      accessToken: 'at-test-123',
    })
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('writes error on 401 invalid credentials', async () => {
    const err = Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 401, data: { error: 'UNAUTHORIZED', message: 'Invalid service key' } },
    })
    mockAdminLogin.mockRejectedValue(err)

    const { loginAdminHandler } = await import('./login-admin.js')
    const ctx = makeCtx(['http://api.test', 'wrong-key', '000000'])

    await loginAdminHandler(ctx)

    expect(getRole()).toBe('unauthenticated')
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })

  it('writes specific message on 423 locked', async () => {
    const err = Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 423, data: { error: 'ADMIN_LOCKED', message: 'Locked for 60s' } },
    })
    mockAdminLogin.mockRejectedValue(err)

    const { loginAdminHandler } = await import('./login-admin.js')
    const ctx = makeCtx(['http://api.test', 'sk', '111111'])

    await loginAdminHandler(ctx)

    const errorMsg = ctx.writes.find((w) => w.type === 'error')?.text ?? ''
    expect(errorMsg).toContain('locked')
  })

  it('writes error when args are missing', async () => {
    const { loginAdminHandler } = await import('./login-admin.js')
    const ctx = makeCtx(['http://api.test', 'sk-only'])

    await loginAdminHandler(ctx)

    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockAdminLogin).not.toHaveBeenCalled()
  })
})
