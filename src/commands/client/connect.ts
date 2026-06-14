import { createElement } from 'react'
import type { Readable } from 'node:stream'
import axios from 'axios'
import { connect } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { getSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'
import QRDisplay, { generateQRText } from '../../ui/QRDisplay.js'

async function streamQR(
  url: string,
  headers: Record<string, string>,
  onEvent: (data: { type: string; qr?: string; status?: string }) => void,
  onError: (status: number | undefined) => void,
): Promise<() => void> {
  let stream: Readable | undefined

  try {
    const resp = await axios.get<Readable>(url, {
      headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache', ...headers },
      responseType: 'stream',
    })
    stream = resp.data
  } catch (e) {
    onError(axios.isAxiosError(e) ? e.response?.status : undefined)
    return () => {}
  }

  let buf = ''
  stream.on('data', (chunk: Buffer) => {
    buf += chunk.toString('utf8')
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))) } catch { /* skip malformed */ }
      }
    }
  })

  stream.on('error', () => onError(undefined))

  return () => { stream?.destroy() }
}

export async function connectHandler(ctx: CommandContext): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      await connect()
      ctx.write('Connection initiated. Waiting for QR...', 'info')
    } catch (e) {
      const err = normalizeError(e)
      ctx.write(`[${err.code}] ${err.message}`, 'error')
      resolve()
      return
    }

    const { baseUrl, credentials } = getSession()
    const authHeaders = {
      'X-Api-Key': credentials.deviceApiKey ?? '',
      'X-Device-Id': credentials.deviceId ?? '',
    }

    let qrReceived = false
    let stopStream: (() => void) | undefined

    const cancel = () => {
      stopStream?.()
      ctx.setCancel?.(null)
      ctx.write('Connection cancelled.', 'info')
      resolve()
    }

    stopStream = await streamQR(
      `${baseUrl}/me/qr`,
      authHeaders,
      async (data) => {
        if (data.type === 'qr' && data.qr) {
          qrReceived = true
          const qrText = await generateQRText(data.qr)
          ctx.setView?.(createElement(QRDisplay, { qr: qrText }))
          ctx.setCancel?.(cancel)
        } else if (data.type === 'status') {
          if (data.status === 'CONNECTED') {
            stopStream?.()
            ctx.setCancel?.(null)
            ctx.setView?.(null)
            ctx.write('WhatsApp connected!', 'success')
            resolve()
          } else if (!qrReceived) {
            ctx.write(`Status: ${data.status}`, 'info')
          }
        }
      },
      (status) => {
        if (qrReceived) return
        ctx.setCancel?.(null)
        ctx.setView?.(null)
        const detail = status ? ` [HTTP ${status}]` : ''
        ctx.write(`Connection error${detail}. Try /connect again.`, 'error')
        resolve()
      },
    )
  })
}

registerCommand({ name: 'connect', usage: '', description: 'Connect WhatsApp (scan QR)', roles: ['client'], handler: connectHandler })
