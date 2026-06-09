import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockSendText = vi.fn()
const mockSendMedia = vi.fn()
const mockUploadFile = vi.fn()

vi.mock('../../api/device.js', () => ({ sendText: mockSendText, sendMedia: mockSendMedia }))
vi.mock('./upload.js', () => ({ uploadFile: mockUploadFile }))

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

describe('/send text', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('calls sendText and writes success', async () => {
    mockSendText.mockResolvedValue({ message_id: 'msg-123' })
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', 'Hello', 'World'])

    await sendTextHandler(ctx)

    expect(mockSendText).toHaveBeenCalledWith('628123456789', 'Hello World')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('writes error when to is missing', async () => {
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx([])
    await sendTextHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockSendText).not.toHaveBeenCalled()
  })

  it('writes error when message is missing', async () => {
    const { sendTextHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789'])
    await sendTextHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
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

describe('/send media', () => {
  beforeEach(() => { clearSession(); vi.clearAllMocks() })

  it('uploads file and sends media', async () => {
    mockUploadFile.mockResolvedValue('upload-id-123')
    mockSendMedia.mockResolvedValue({ message_id: 'msg-456' })

    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', '/tmp/photo.jpg', 'Nice', 'photo'])

    await sendMediaHandler(ctx)

    expect(mockUploadFile).toHaveBeenCalledWith('/tmp/photo.jpg', expect.any(Function))
    expect(mockSendMedia).toHaveBeenCalledWith('628123456789', 'upload-id-123', 'Nice photo')
    expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
  })

  it('sends media without caption when not provided', async () => {
    mockUploadFile.mockResolvedValue('upload-id-456')
    mockSendMedia.mockResolvedValue({ message_id: null })

    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789', '/tmp/file.pdf'])

    await sendMediaHandler(ctx)

    expect(mockSendMedia).toHaveBeenCalledWith('628123456789', 'upload-id-456', undefined)
  })

  it('writes error when to is missing', async () => {
    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx([])
    await sendMediaHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
    expect(mockUploadFile).not.toHaveBeenCalled()
  })

  it('writes error when file path is missing', async () => {
    const { sendMediaHandler } = await import('./send.js')
    const ctx = makeCtx(['628123456789'])
    await sendMediaHandler(ctx)
    expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
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
