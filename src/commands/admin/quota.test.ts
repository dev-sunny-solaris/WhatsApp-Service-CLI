import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockApplyQuota       = vi.fn()
const mockRemoveQuota      = vi.fn()
const mockListPackages     = vi.fn()
const mockSelectDevice     = vi.fn()
const mockShowSelectPrompt = vi.fn()

vi.mock('../../api/admin.js', () => ({
  applyQuota:   mockApplyQuota,
  removeQuota:  mockRemoveQuota,
  listPackages: mockListPackages,
}))

vi.mock('./helpers.js',            () => ({ selectDevice:     mockSelectDevice }))
vi.mock('../../ui/showPrompt.js', () => ({ showSelectPrompt: mockShowSelectPrompt }))

const PACKAGES = {
  starter: { quota_total: 1000, period_days: 30, daily_limit: 50 },
  pro:     { quota_total: 5000, period_days: 30, daily_limit: 200 },
}

const QUOTA_RESULT = {
  id: 'dev-abc',
  name: 'Test',
  quota: { package: 'starter', total: 1000, used: 0, remaining: 1000, period_days: 30, expires_at: '2024-02-01', daily_limit: 50, status: 'active' },
}

function makeCtx(args: string[]) {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args,
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    setView: vi.fn(),
    writes,
  }
}

describe('/quota apply', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('applies named package directly when both args provided', async () => {
    mockApplyQuota.mockResolvedValue(QUOTA_RESULT)
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc', 'starter'])
    await quotaApplyHandler(ctx)
    expect(mockApplyQuota).toHaveBeenCalledWith('dev-abc', { package: 'starter' })
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
    expect(mockSelectDevice).not.toHaveBeenCalled()
    expect(mockShowSelectPrompt).not.toHaveBeenCalled()
  })

  it('applies custom quota directly when all custom params provided', async () => {
    mockApplyQuota.mockResolvedValue({ ...QUOTA_RESULT, quota: { ...QUOTA_RESULT.quota, package: 'custom' } })
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc', 'custom', '2000', '30', '100'])
    await quotaApplyHandler(ctx)
    expect(mockApplyQuota).toHaveBeenCalledWith('dev-abc', {
      package: 'custom',
      quota_total: 2000,
      period_days: 30,
      daily_limit: 100,
    })
  })

  it('writes error when custom package missing required numeric params', async () => {
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc', 'custom'])
    await quotaApplyHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockApplyQuota).not.toHaveBeenCalled()
  })

  it('uses SelectPrompt for device when no device_id provided', async () => {
    mockSelectDevice.mockResolvedValue('dev-abc')
    mockListPackages.mockResolvedValue(PACKAGES)
    mockShowSelectPrompt.mockResolvedValue('starter')
    mockApplyQuota.mockResolvedValue(QUOTA_RESULT)
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx([])
    await quotaApplyHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(mockApplyQuota).toHaveBeenCalledWith('dev-abc', expect.objectContaining({ package: 'starter' }))
  })

  it('returns early when device SelectPrompt cancelled', async () => {
    mockSelectDevice.mockResolvedValue(undefined)
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx([])
    await quotaApplyHandler(ctx)
    expect(mockApplyQuota).not.toHaveBeenCalled()
  })

  it('uses SelectPrompt for package when device_id provided but package omitted', async () => {
    mockListPackages.mockResolvedValue(PACKAGES)
    mockShowSelectPrompt.mockResolvedValue('pro')
    mockApplyQuota.mockResolvedValue(QUOTA_RESULT)
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc'])
    await quotaApplyHandler(ctx)
    expect(mockSelectDevice).not.toHaveBeenCalled()
    expect(mockShowSelectPrompt).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        items: expect.arrayContaining([
          { label: 'starter', value: 'starter' },
          { label: 'pro',     value: 'pro' },
          { label: 'custom',  value: 'custom' },
        ]),
      }),
    )
    expect(mockApplyQuota).toHaveBeenCalledWith('dev-abc', expect.objectContaining({ package: 'pro' }))
  })

  it('returns early when package SelectPrompt cancelled', async () => {
    mockListPackages.mockResolvedValue(PACKAGES)
    mockShowSelectPrompt.mockResolvedValue(undefined)
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc'])
    await quotaApplyHandler(ctx)
    expect(mockApplyQuota).not.toHaveBeenCalled()
  })

  it('writes error on API failure', async () => {
    mockApplyQuota.mockRejectedValue(Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 404, data: { error: 'NOT_FOUND', message: 'Device not found' } },
    }))
    const { quotaApplyHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc', 'starter'])
    await quotaApplyHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})

describe('/quota remove', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('removes quota directly when device_id provided', async () => {
    mockRemoveQuota.mockResolvedValue({ id: 'dev-abc', name: 'Test', quota: null })
    const { quotaRemoveHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc'])
    await quotaRemoveHandler(ctx)
    expect(mockRemoveQuota).toHaveBeenCalledWith('dev-abc')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
    expect(mockSelectDevice).not.toHaveBeenCalled()
  })

  it('uses SelectPrompt for device when no device_id provided', async () => {
    mockSelectDevice.mockResolvedValue('dev-abc')
    mockRemoveQuota.mockResolvedValue({ id: 'dev-abc', name: 'Test', quota: null })
    const { quotaRemoveHandler } = await import('./quota.js')
    const ctx = makeCtx([])
    await quotaRemoveHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(mockRemoveQuota).toHaveBeenCalledWith('dev-abc')
  })

  it('returns early when SelectPrompt cancelled', async () => {
    mockSelectDevice.mockResolvedValue(undefined)
    const { quotaRemoveHandler } = await import('./quota.js')
    const ctx = makeCtx([])
    await quotaRemoveHandler(ctx)
    expect(mockRemoveQuota).not.toHaveBeenCalled()
  })

  it('writes error on API failure', async () => {
    mockRemoveQuota.mockRejectedValue(Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 404, data: { error: 'NOT_FOUND', message: 'Device not found' } },
    }))
    const { quotaRemoveHandler } = await import('./quota.js')
    const ctx = makeCtx(['dev-abc'])
    await quotaRemoveHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
