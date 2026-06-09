import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockListDevices    = vi.fn()
const mockCreateDevice   = vi.fn()
const mockGetDevice      = vi.fn()
const mockDeleteDevice   = vi.fn()
const mockRevokeDeviceKey = vi.fn()
const mockUnlockDevice   = vi.fn()
const mockSelectDevice   = vi.fn()

vi.mock('../../api/admin.js', () => ({
  listDevices:     mockListDevices,
  createDevice:    mockCreateDevice,
  getDevice:       mockGetDevice,
  deleteDevice:    mockDeleteDevice,
  revokeDeviceKey: mockRevokeDeviceKey,
  unlockDevice:    mockUnlockDevice,
}))

vi.mock('./helpers.js', () => ({ selectDevice: mockSelectDevice }))

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

const DEVICE = {
  id: 'dev-abc123',
  name: 'Test Device',
  status: 'CONNECTED',
  quota: null,
  rate_limit: null,
  created_at: '2024-01-01T00:00:00.000Z',
}

describe('formatDeviceRow', () => {
  it('includes id, name and status', async () => {
    const { formatDeviceRow } = await import('./devices.js')
    const row = formatDeviceRow(DEVICE)
    expect(row).toContain('dev-abc123')
    expect(row).toContain('Test Device')
    expect(row).toContain('CONNECTED')
  })
})

describe('formatDeviceDetail', () => {
  it('returns lines with id, name, status, created_at', async () => {
    const { formatDeviceDetail } = await import('./devices.js')
    const lines = formatDeviceDetail(DEVICE)
    expect(lines.join('\n')).toContain('dev-abc123')
    expect(lines.join('\n')).toContain('Test Device')
    expect(lines.join('\n')).toContain('CONNECTED')
  })

  it('includes quota info when present', async () => {
    const { formatDeviceDetail } = await import('./devices.js')
    const device = {
      ...DEVICE,
      quota: { package: 'starter', total: 1000, used: 200, remaining: 800, period_days: 30, expires_at: '2024-02-01', daily_limit: 50, status: 'active' },
    }
    const lines = formatDeviceDetail(device)
    expect(lines.join('\n')).toContain('starter')
  })
})

describe('/devices list', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls listDevices and writes rows', async () => {
    mockListDevices.mockResolvedValue([DEVICE])
    const { devicesListHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesListHandler(ctx)
    expect(mockListDevices).toHaveBeenCalled()
    expect(ctx.writes.length).toBeGreaterThan(0)
  })

  it('writes message when list is empty', async () => {
    mockListDevices.mockResolvedValue([])
    const { devicesListHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesListHandler(ctx)
    expect(ctx.writes.length).toBeGreaterThan(0)
  })

  it('writes error on API failure', async () => {
    mockListDevices.mockRejectedValue(Object.assign(new Error('fail'), { isAxiosError: true, response: { status: 401, data: { error: 'UNAUTHORIZED', message: 'Unauthorized' } } }))
    const { devicesListHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesListHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})

describe('/devices create', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls createDevice and shows api_key', async () => {
    mockCreateDevice.mockResolvedValue({ id: 'dev-new', name: 'New', api_key: 'key-secret', created_at: '2024-01-01' })
    const { devicesCreateHandler } = await import('./devices.js')
    const ctx = makeCtx(['New Device'])
    await devicesCreateHandler(ctx)
    expect(mockCreateDevice).toHaveBeenCalledWith('New Device')
    expect(ctx.writes.some((w) => w.text?.includes('key-secret'))).toBe(true)
  })

  it('writes error when name is missing', async () => {
    const { devicesCreateHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesCreateHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockCreateDevice).not.toHaveBeenCalled()
  })
})

describe('/devices get', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls getDevice with id from arg', async () => {
    mockGetDevice.mockResolvedValue(DEVICE)
    const { devicesGetHandler } = await import('./devices.js')
    const ctx = makeCtx(['dev-abc123'])
    await devicesGetHandler(ctx)
    expect(mockGetDevice).toHaveBeenCalledWith('dev-abc123')
    expect(ctx.writes.length).toBeGreaterThan(0)
    expect(mockSelectDevice).not.toHaveBeenCalled()
  })

  it('calls getDevice with id from SelectPrompt when no arg', async () => {
    mockSelectDevice.mockResolvedValue('dev-from-select')
    mockGetDevice.mockResolvedValue(DEVICE)
    const { devicesGetHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesGetHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(mockGetDevice).toHaveBeenCalledWith('dev-from-select')
  })

  it('returns early when SelectPrompt cancelled', async () => {
    mockSelectDevice.mockResolvedValue(undefined)
    const { devicesGetHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesGetHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(mockGetDevice).not.toHaveBeenCalled()
  })
})

describe('/devices delete', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls deleteDevice with id from arg', async () => {
    mockDeleteDevice.mockResolvedValue(undefined)
    const { devicesDeleteHandler } = await import('./devices.js')
    const ctx = makeCtx(['dev-abc123'])
    await devicesDeleteHandler(ctx)
    expect(mockDeleteDevice).toHaveBeenCalledWith('dev-abc123')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
    expect(mockSelectDevice).not.toHaveBeenCalled()
  })

  it('calls deleteDevice with id from SelectPrompt when no arg', async () => {
    mockSelectDevice.mockResolvedValue('dev-sel')
    mockDeleteDevice.mockResolvedValue(undefined)
    const { devicesDeleteHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesDeleteHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(mockDeleteDevice).toHaveBeenCalledWith('dev-sel')
  })

  it('returns early when SelectPrompt cancelled', async () => {
    mockSelectDevice.mockResolvedValue(undefined)
    const { devicesDeleteHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesDeleteHandler(ctx)
    expect(mockDeleteDevice).not.toHaveBeenCalled()
  })
})

describe('/devices revoke-key', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls revokeDeviceKey with id from arg', async () => {
    mockRevokeDeviceKey.mockResolvedValue({ id: 'dev-abc123', name: 'Test', api_key: 'new-key-789' })
    const { devicesRevokeKeyHandler } = await import('./devices.js')
    const ctx = makeCtx(['dev-abc123'])
    await devicesRevokeKeyHandler(ctx)
    expect(ctx.writes.some((w) => w.text?.includes('new-key-789'))).toBe(true)
    expect(mockSelectDevice).not.toHaveBeenCalled()
  })

  it('calls revokeDeviceKey with id from SelectPrompt when no arg', async () => {
    mockSelectDevice.mockResolvedValue('dev-sel')
    mockRevokeDeviceKey.mockResolvedValue({ id: 'dev-sel', name: 'Test', api_key: 'rotated-key' })
    const { devicesRevokeKeyHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesRevokeKeyHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(ctx.writes.some((w) => w.text?.includes('rotated-key'))).toBe(true)
  })
})

describe('/devices unlock', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls unlockDevice with id from arg', async () => {
    mockUnlockDevice.mockResolvedValue({ id: 'dev-abc123', name: 'Test', api_key: 'unlocked-key' })
    const { devicesUnlockHandler } = await import('./devices.js')
    const ctx = makeCtx(['dev-abc123'])
    await devicesUnlockHandler(ctx)
    expect(ctx.writes.some((w) => w.text?.includes('unlocked-key'))).toBe(true)
    expect(mockSelectDevice).not.toHaveBeenCalled()
  })

  it('calls unlockDevice with id from SelectPrompt when no arg', async () => {
    mockSelectDevice.mockResolvedValue('dev-sel')
    mockUnlockDevice.mockResolvedValue({ id: 'dev-sel', name: 'Test', api_key: 'new-unlock-key' })
    const { devicesUnlockHandler } = await import('./devices.js')
    const ctx = makeCtx([])
    await devicesUnlockHandler(ctx)
    expect(mockSelectDevice).toHaveBeenCalled()
    expect(ctx.writes.some((w) => w.text?.includes('new-unlock-key'))).toBe(true)
  })
})
