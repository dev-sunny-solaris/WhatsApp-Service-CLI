import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockGetMe = vi.fn()
vi.mock('../../api/device.js', () => ({ getMe: mockGetMe }))

function makeCtx() {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args: [] as string[],
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    writes,
  }
}

const baseMe = {
  id: 'dev_abc',
  name: 'My Device',
  phone_number: '628123456789',
  is_connected: true,
  daily_used: 42,
  quota: null,
}

describe('buildMeRows', () => {
  it('includes id, name, phone, status, daily rows', async () => {
    const { buildMeRows } = await import('./me.js')
    const rows = buildMeRows(baseMe)
    expect(rows.some((r) => r[0] === 'ID'     && r[1] === 'dev_abc')).toBe(true)
    expect(rows.some((r) => r[0] === 'Name'   && r[1] === 'My Device')).toBe(true)
    expect(rows.some((r) => r[0] === 'Phone'  && r[1] === '628123456789')).toBe(true)
    expect(rows.some((r) => r[0] === 'Status' && r[1] === 'Connected')).toBe(true)
    expect(rows.some((r) => r[0] === 'Daily')).toBe(true)
  })

  it('shows Disconnected when not connected', async () => {
    const { buildMeRows } = await import('./me.js')
    const rows = buildMeRows({ ...baseMe, is_connected: false })
    expect(rows.some((r) => r[0] === 'Status' && r[1] === 'Disconnected')).toBe(true)
  })

  it('includes quota rows when quota present', async () => {
    const { buildMeRows } = await import('./me.js')
    const rows = buildMeRows({
      ...baseMe,
      quota: {
        package: 'small', total: 5000, used: 120, remaining: 4880,
        period_days: 30, expires_at: '2026-07-08T00:00:00.000Z',
        daily_limit: 200, status: 'active',
      },
    })
    expect(rows.some((r) => r[0] === 'Quota')).toBe(true)
    expect(rows.some((r) => r[0] === 'Expires')).toBe(true)
    expect(rows.some((r) => r[0] === 'Daily' && r[1].includes('200'))).toBe(true)
  })

  it('shows "no package" when quota is null', async () => {
    const { buildMeRows } = await import('./me.js')
    const rows = buildMeRows(baseMe)
    expect(rows.some((r) => r[0] === 'Quota' && r[1] === 'no package')).toBe(true)
  })

  it('shows dash for null phone_number', async () => {
    const { buildMeRows } = await import('./me.js')
    const rows = buildMeRows({ ...baseMe, phone_number: null })
    expect(rows.some((r) => r[0] === 'Phone' && r[1] === '—')).toBe(true)
  })
})

describe('/me handler', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls getMe and writes table output', async () => {
    mockGetMe.mockResolvedValue(baseMe)
    const { meHandler } = await import('./me.js')
    const ctx = makeCtx()
    await meHandler(ctx)
    expect(mockGetMe).toHaveBeenCalled()
    expect(ctx.writes.length).toBeGreaterThan(3)
    expect(ctx.writes.some((w) => w.text.includes('+'))).toBe(true)
    expect(ctx.writes.some((w) => w.text.includes('dev_abc'))).toBe(true)
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
