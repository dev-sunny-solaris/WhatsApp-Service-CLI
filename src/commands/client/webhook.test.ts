import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockSetWebhook = vi.fn()
vi.mock('../../api/device.js', () => ({ setWebhook: mockSetWebhook }))

function makeCtx(args: string[]) {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args,
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    writes,
  }
}

describe('/webhook set', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls setWebhook with url and writes success', async () => {
    mockSetWebhook.mockResolvedValue(undefined)
    const { webhookSetHandler } = await import('./webhook.js')
    const ctx = makeCtx(['https://my.server/hook'])

    await webhookSetHandler(ctx)

    expect(mockSetWebhook).toHaveBeenCalledWith('https://my.server/hook', undefined)
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('passes secret when provided', async () => {
    mockSetWebhook.mockResolvedValue(undefined)
    const { webhookSetHandler } = await import('./webhook.js')
    const ctx = makeCtx(['https://my.server/hook', 'my-secret'])

    await webhookSetHandler(ctx)

    expect(mockSetWebhook).toHaveBeenCalledWith('https://my.server/hook', 'my-secret')
  })

  it('writes error when url is missing', async () => {
    const { webhookSetHandler } = await import('./webhook.js')
    const ctx = makeCtx([])
    await webhookSetHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockSetWebhook).not.toHaveBeenCalled()
  })

  it('writes error on API failure', async () => {
    mockSetWebhook.mockRejectedValue(Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 400, data: { error: 'VALIDATION_ERROR', message: 'Invalid URL' } },
    }))
    const { webhookSetHandler } = await import('./webhook.js')
    const ctx = makeCtx(['not-a-url'])
    await webhookSetHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
