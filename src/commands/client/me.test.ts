import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'
import type { MeInfo } from '../../api/device.js'

const mockGetMe = vi.fn()

vi.mock('../../api/device.js', () => ({ getMe: mockGetMe }))

const ME: MeInfo = {
  id: 'dev-abc',
  name: 'Test Device',
  phone_number: '628123456789',
  is_connected: true,
  daily_used: 12,
  quota: {
    package: 'small',
    total: 5000,
    used: 100,
    remaining: 4900,
    period_days: 30,
    expires_at: '2024-02-01',
    daily_limit: 200,
    status: 'active',
  },
}

describe('formatMeInfo', () => {
  it('includes id, name, phone, connection status', async () => {
    const { formatMeInfo } = await import('./me.js')
    const lines = formatMeInfo(ME)
    const joined = lines.join('\n')
    expect(joined).toContain('dev-abc')
    expect(joined).toContain('Test Device')
    expect(joined).toContain('628123456789')
    expect(joined).toContain('Connected')
  })

  it('shows disconnected when not connected', async () => {
    const { formatMeInfo } = await import('./me.js')
    const lines = formatMeInfo({ ...ME, is_connected: false })
    expect(lines.join('\n')).toContain('Disconnected')
  })

  it('shows quota info when present', async () => {
    const { formatMeInfo } = await import('./me.js')
    const lines = formatMeInfo(ME)
    expect(lines.join('\n')).toContain('small')
  })

  it('handles null phone_number', async () => {
    const { formatMeInfo } = await import('./me.js')
    const lines = formatMeInfo({ ...ME, phone_number: null })
    expect(lines.join('\n')).toContain('not set')
  })
})

describe('/me handler', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  function makeCtx() {
    const writes: Array<{ text: string; type?: string }> = []
    return {
      args: [] as string[],
      write: (text: string, type?: string) => writes.push({ text, type }),
      writeLine: (line: { text: string; type: string }) => writes.push(line),
      writes,
    }
  }

  it('calls getMe and writes info lines', async () => {
    mockGetMe.mockResolvedValue(ME)
    const { meHandler } = await import('./me.js')
    const ctx = makeCtx()
    await meHandler(ctx)
    expect(mockGetMe).toHaveBeenCalled()
    expect(ctx.writes.length).toBeGreaterThan(0)
  })

  it('writes error on API failure', async () => {
    mockGetMe.mockRejectedValue(Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 503, data: { error: 'DEVICE_NOT_CONNECTED', message: 'Not connected' } },
    }))
    const { meHandler } = await import('./me.js')
    const ctx = makeCtx()
    await meHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
