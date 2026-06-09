import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, setSession } from '../../state/session.js'

const mockConnect = vi.fn()
vi.mock('../../api/device.js', () => ({ connect: mockConnect }))
vi.mock('qrcode', () => ({ default: { toString: vi.fn().mockResolvedValue('MOCK_QR_ART') } }))

// Class-based mock — avoids vi.clearAllMocks resetting implementation
type FakeES = {
  url: string
  opts: unknown
  onmessage: ((e: { data: string }) => void) | null
  onerror: ((e: unknown) => void) | null
  close: () => void
  _closed: boolean
}

let capturedES: FakeES | null = null

vi.mock('eventsource', () => {
  class FakeEventSource {
    url: string
    opts: unknown
    onmessage: ((e: { data: string }) => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    _closed = false
    close() { this._closed = true }

    constructor(url: string, opts: unknown) {
      this.url = url
      this.opts = opts
      capturedES = this as unknown as FakeES
    }
  }
  return { EventSource: FakeEventSource }
})

function makeCtx() {
  const writes: Array<{ text: string; type?: string }> = []
  const setView = vi.fn()
  return {
    args: [] as string[],
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    setView,
    writes,
  }
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('/connect handler', () => {
  beforeEach(() => {
    clearSession()
    mockConnect.mockReset()
    capturedES = null
    setSession({
      role: 'client',
      baseUrl: 'http://api.test',
      credentials: { deviceId: 'dev-123', deviceApiKey: 'key-abc' },
    })
  })

  it('opens EventSource with correct URL and auth headers', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    expect(capturedES).not.toBeNull()
    expect(capturedES!.url).toBe('http://api.test/me/qr')
    expect((capturedES!.opts as Record<string, unknown>).headers).toMatchObject({
      'X-Api-Key': 'key-abc',
      'X-Device-Id': 'dev-123',
    })

    capturedES!.onmessage?.({ data: JSON.stringify({ type: 'status', status: 'CONNECTED' }) })
    await promise
  })

  it('calls setView when QR event received', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    capturedES!.onmessage?.({ data: JSON.stringify({ type: 'qr', qr: 'qr-raw-string' }) })
    await tick()  // allow generateQRText (mocked) to resolve

    expect(ctx.setView).toHaveBeenCalledWith(expect.anything())

    capturedES!.onmessage?.({ data: JSON.stringify({ type: 'status', status: 'CONNECTED' }) })
    await promise
  })

  it('closes EventSource and writes success on CONNECTED', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    capturedES!.onmessage?.({ data: JSON.stringify({ type: 'status', status: 'CONNECTED' }) })
    await promise

    expect(capturedES!._closed).toBe(true)
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
    expect(capturedES).toBeNull()
  })

  it('writes error and resolves on EventSource error', async () => {
    mockConnect.mockResolvedValue(undefined)
    const { connectHandler } = await import('./connect.js')
    const ctx = makeCtx()

    const promise = connectHandler(ctx)
    await tick()

    capturedES!.onerror?.(new Error('SSE error'))
    await promise

    expect(capturedES!._closed).toBe(true)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})
