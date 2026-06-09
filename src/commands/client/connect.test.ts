import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, setSession } from '../../state/session.js'

const mockConnect = vi.fn()
vi.mock('../../api/device.js', () => ({ connect: mockConnect }))
vi.mock('qrcode', () => ({ default: { toString: vi.fn().mockResolvedValue('MOCK_QR_ART') } }))

class FakeStream extends EventEmitter {
  destroyed = false
  destroy() { this.destroyed = true }
  push(chunk: string) { this.emit('data', Buffer.from(chunk)) }
}

const mockAxiosGet = vi.fn()
vi.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
    isAxiosError: (e: unknown) => Boolean((e as any)?.isAxiosError),
  },
}))

function makeCtx() {
  const writes: Array<{ text: string; type?: string }> = []
  const setView = vi.fn()
  const setCancel = vi.fn()
  return {
    args: [] as string[],
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    setView,
    setCancel,
    writes,
  }
}

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n`
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('/connect handler', () => {
  let stream: FakeStream

  beforeEach(() => {
    clearSession()
    mockConnect.mockReset()
    mockAxiosGet.mockReset()
    stream = new FakeStream()
    mockAxiosGet.mockResolvedValue({ data: stream })
    setSession({
      role: 'client',
      baseUrl: 'http://api.test',
      credentials: { deviceId: 'dev-123', deviceApiKey: 'key-abc' },
    })
  })

  it('opens axios stream with correct URL and auth headers', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    expect(mockAxiosGet).toHaveBeenCalledWith(
      'http://api.test/me/qr',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Api-Key': 'key-abc',
          'X-Device-Id': 'dev-123',
        }),
        responseType: 'stream',
      }),
    )

    stream.push(sseEvent({ type: 'status', status: 'CONNECTED' }))
    await promise
  })

  it('calls setView when QR event received', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    stream.push(sseEvent({ type: 'qr', qr: 'qr-raw-string' }))
    await tick()

    expect(ctx.setView).toHaveBeenCalledWith(expect.anything())

    stream.push(sseEvent({ type: 'status', status: 'CONNECTED' }))
    await promise
  })

  it('destroys stream and writes success on CONNECTED', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    stream.push(sseEvent({ type: 'status', status: 'CONNECTED' }))
    await promise

    expect(stream.destroyed).toBe(true)
    expect(ctx.setView).toHaveBeenCalledWith(null)
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('writes error and resolves when connect API fails', async () => {
    mockConnect.mockRejectedValue(Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 503, data: { error: 'DEVICE_NOT_CONNECTED', message: 'Device offline' } },
    }))
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    await connectHandler(ctx)

    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockAxiosGet).not.toHaveBeenCalled()
  })

  it('writes error and resolves on stream error', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    stream.emit('error', new Error('SSE error'))
    await promise

    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
