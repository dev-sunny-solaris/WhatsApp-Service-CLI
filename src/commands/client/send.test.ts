import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockSendText = vi.fn()
const mockSendMedia = vi.fn()
const mockUploadFile = vi.fn()

vi.mock('../../api/device.js', () => ({ sendText: mockSendText, sendMedia: mockSendMedia }))
vi.mock('./upload.js', () => ({ uploadFile: mockUploadFile }))

type ShowFormFn = (title: string, fields: unknown, initial?: unknown) => Promise<Record<string, string> | undefined>

function makeCtx(args: string[], showForm?: ShowFormFn) {
  const writes: Array<{ text: string; type?: string }> = []
  return {
    args,
    write: (text: string, type?: string) => writes.push({ text, type }),
    writeLine: (line: { text: string; type: string }) => writes.push(line),
    setView: vi.fn(),
    showForm,
    writes,
  }
}

// ─── /send text — direct args ─────────────────────────────────────────────────

describe('/send text — direct args', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls sendText and writes success', async () => {
    mockSendText.mockResolvedValue({ message_id: 'msg-123' })
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', 'Hello', 'World'])

    await sendTextHandler(ctx)

    expect(mockSendText).toHaveBeenCalledWith('628123456789', 'Hello World')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('writes error on API failure', async () => {
    mockSendText.mockRejectedValue(Object.assign(new Error('fail'), {
      isAxiosError: true,
      response: { status: 429, data: { error: 'QUOTA_EXHAUSTED', message: 'Quota exhausted' } },
    }))
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', 'hi'])
    await sendTextHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
  })
})

// ─── /send text — interactive form ───────────────────────────────────────────

describe('/send text — interactive form', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('shows form when args missing and sends on submit', async () => {
    mockSendText.mockResolvedValue({ message_id: 'msg-1' })
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => ({ to: '628123456789', message: 'Hello World' }))

    await sendTextHandler(ctx)

    expect(mockSendText).toHaveBeenCalledWith('628123456789', 'Hello World')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('shows form pre-filled with to when message is missing', async () => {
    mockSendText.mockResolvedValue({ message_id: null })
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789'], async () => ({ to: '628123456789', message: 'Hi there' }))

    await sendTextHandler(ctx)

    expect(mockSendText).toHaveBeenCalledWith('628123456789', 'Hi there')
  })

  it('returns without sending when form is cancelled', async () => {
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => undefined)

    await sendTextHandler(ctx)

    expect(mockSendText).not.toHaveBeenCalled()
    expect(ctx.writes).toHaveLength(0)
  })
})

// ─── /send media — direct args ────────────────────────────────────────────────

describe('/send media — direct args', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('uploads file and sends media', async () => {
    mockUploadFile.mockResolvedValue('upload-id-123')
    mockSendMedia.mockResolvedValue({ message_id: 'msg-456' })

    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', '/tmp/photo.jpg', 'Nice', 'photo'])

    await sendMediaHandler(ctx)

    expect(mockUploadFile).toHaveBeenCalledWith('/tmp/photo.jpg', expect.any(Function))
    expect(mockSendMedia).toHaveBeenCalledWith('628123456789', 'upload-id-123', 'Nice photo', undefined)
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('sends media without caption when not provided', async () => {
    mockUploadFile.mockResolvedValue('upload-id-456')
    mockSendMedia.mockResolvedValue({ message_id: null })

    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', '/tmp/file.pdf'])

    await sendMediaHandler(ctx)

    expect(mockSendMedia).toHaveBeenCalledWith('628123456789', 'upload-id-456', undefined, undefined)
  })

  it('shows progress view during upload and clears it after', async () => {
    mockUploadFile.mockImplementation(async (_path: string, onProgress?: (pct: number) => void) => {
      onProgress?.(25)
      onProgress?.(75)
      return 'upload-id-prog'
    })
    mockSendMedia.mockResolvedValue({ message_id: 'msg-789' })
    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', '/tmp/video.mp4'])
    await sendMediaHandler(ctx)
    expect(ctx.setView).toHaveBeenCalledWith(expect.anything())
    expect(ctx.setView).toHaveBeenLastCalledWith(null)
  })
})

// ─── /send media — interactive form ──────────────────────────────────────────

describe('/send media — interactive form', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('shows form when args missing and sends on submit', async () => {
    mockUploadFile.mockResolvedValue('up-id')
    mockSendMedia.mockResolvedValue({ message_id: 'msg-1' })
    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => ({ to: '628123456789', file: '/tmp/img.jpg', caption: 'My caption' }))

    await sendMediaHandler(ctx)

    expect(mockUploadFile).toHaveBeenCalledWith('/tmp/img.jpg', expect.any(Function))
    expect(mockSendMedia).toHaveBeenCalledWith('628123456789', 'up-id', 'My caption', undefined)
  })

  it('sends without caption when form caption is empty', async () => {
    mockUploadFile.mockResolvedValue('up-id')
    mockSendMedia.mockResolvedValue({ message_id: null })
    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => ({ to: '628123456789', file: '/tmp/doc.pdf', caption: '' }))

    await sendMediaHandler(ctx)

    expect(mockSendMedia).toHaveBeenCalledWith('628123456789', 'up-id', undefined, undefined)
  })

  it('returns without sending when form is cancelled', async () => {
    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => undefined)

    await sendMediaHandler(ctx)

    expect(mockUploadFile).not.toHaveBeenCalled()
    expect(ctx.writes).toHaveLength(0)
  })
})

// ─── /send (guided) ───────────────────────────────────────────────────────────

describe('/send — guided flow', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('routes to text flow when text selected', async () => {
    mockSendText.mockResolvedValue({ message_id: 'msg-t' })
    const { sendHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => ({ type: 'text', to: '628123456789', message: 'Hello' }))

    await sendHandler(ctx)

    expect(mockSendText).toHaveBeenCalledWith('628123456789', 'Hello')
  })

  it('routes to media flow when media selected', async () => {
    mockUploadFile.mockResolvedValue('up-id')
    mockSendMedia.mockResolvedValue({ message_id: 'msg-m' })
    const { sendHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => ({ type: 'media', to: '628123456789', file: '/tmp/img.jpg', caption: '' }))

    await sendHandler(ctx)

    expect(mockUploadFile).toHaveBeenCalledWith('/tmp/img.jpg', expect.any(Function))
  })

  it('returns without sending when form is cancelled', async () => {
    const { sendHandler } = await import('./send.js')
    const ctx = makeCtx([], async () => undefined)

    await sendHandler(ctx)

    expect(mockSendText).not.toHaveBeenCalled()
    expect(mockSendMedia).not.toHaveBeenCalled()
  })
})
