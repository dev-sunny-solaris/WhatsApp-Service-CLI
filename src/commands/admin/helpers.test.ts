import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListDevices = vi.fn()
const mockShowSelectPrompt = vi.fn()

vi.mock('../../api/admin.js', () => ({ listDevices: mockListDevices }))
vi.mock('../../ui/showPrompt.js', () => ({ showSelectPrompt: mockShowSelectPrompt }))

function makeCtx() {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args: [] as string[],
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    setView: vi.fn(),
    writes,
  }
}

describe('selectDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined and writes info when no devices exist', async () => {
    mockListDevices.mockResolvedValue([])
    const { selectDevice } = await import('./helpers.js')
    const ctx = makeCtx()
    const result = await selectDevice(ctx as never)
    expect(result).toBeUndefined()
    expect(ctx.writes.some((w) => w.type === 'info')).toBe(true)
    expect(mockShowSelectPrompt).not.toHaveBeenCalled()
  })

  it('calls showSelectPrompt with device items and returns selected id', async () => {
    mockListDevices.mockResolvedValue([
      { id: 'dev-1', name: 'Alpha', status: 'CONNECTED' },
      { id: 'dev-2', name: 'Beta',  status: 'DISCONNECTED' },
    ])
    mockShowSelectPrompt.mockResolvedValue('dev-1')
    const { selectDevice } = await import('./helpers.js')
    const ctx = makeCtx()
    const result = await selectDevice(ctx as never)
    expect(result).toBe('dev-1')
    expect(mockShowSelectPrompt).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        items: [
          { label: 'Alpha  [CONNECTED]',    value: 'dev-1' },
          { label: 'Beta  [DISCONNECTED]', value: 'dev-2' },
        ],
      }),
    )
  })

  it('returns undefined when user cancels SelectPrompt', async () => {
    mockListDevices.mockResolvedValue([{ id: 'dev-1', name: 'Alpha', status: 'CONNECTED' }])
    mockShowSelectPrompt.mockResolvedValue(undefined)
    const { selectDevice } = await import('./helpers.js')
    const ctx = makeCtx()
    const result = await selectDevice(ctx as never)
    expect(result).toBeUndefined()
  })

  it('returns undefined and writes error on API failure', async () => {
    mockListDevices.mockRejectedValue(
      Object.assign(new Error('fail'), {
        isAxiosError: true,
        response: { status: 500, data: { error: 'SERVER_ERROR', message: 'Server error' } },
      }),
    )
    const { selectDevice } = await import('./helpers.js')
    const ctx = makeCtx()
    const result = await selectDevice(ctx as never)
    expect(result).toBeUndefined()
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
