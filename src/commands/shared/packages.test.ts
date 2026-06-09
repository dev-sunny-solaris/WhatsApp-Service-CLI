import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockListPackages = vi.fn()

vi.mock('../../api/admin.js', () => ({ listPackages: mockListPackages }))
vi.mock('../../api/device.js', () => ({ listPackages: mockListPackages }))

function makeCtx() {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args: [] as string[],
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    writes,
  }
}

describe('/packages', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('writes package list', async () => {
    mockListPackages.mockResolvedValue({
      starter: { quota_total: 1000, period_days: 30, daily_limit: 50 },
      small:   { quota_total: 5000, period_days: 30, daily_limit: 200 },
      custom:  { quota_total: null, period_days: null },
    })
    const { packagesHandler } = await import('./packages.js')
    const ctx = makeCtx()
    await packagesHandler(ctx)
    expect(ctx.writes.length).toBeGreaterThan(0)
    expect(ctx.writes.some((w) => w.text?.includes('starter'))).toBe(true)
  })

  it('writes error on API failure', async () => {
    mockListPackages.mockRejectedValue(new Error('network'))
    const { packagesHandler } = await import('./packages.js')
    const ctx = makeCtx()
    await packagesHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
