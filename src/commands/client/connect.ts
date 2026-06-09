import { EventSource } from 'eventsource'
import { createElement } from 'react'
import { connect } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { getSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'
import QRDisplay, { generateQRText } from '../../ui/QRDisplay.js'

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
    const es = new EventSource(`${baseUrl}/me/qr`, {
      headers: {
        'X-Api-Key': credentials.deviceApiKey ?? '',
        'X-Device-Id': credentials.deviceId ?? '',
      },
    })

    es.onmessage = async (event) => {
      const data = JSON.parse(event.data) as { type: string; qr?: string; status?: string }

      if (data.type === 'qr' && data.qr) {
        const qrText = await generateQRText(data.qr)
        ctx.setView?.(createElement(QRDisplay, { qr: qrText }))
      } else if (data.type === 'status') {
        if (data.status === 'CONNECTED') {
          es.close()
          ctx.setView?.(null)
          ctx.write('WhatsApp connected!', 'success')
          resolve()
        } else {
          ctx.write(`Status: ${data.status}`, 'info')
        }
      }
    }

    es.onerror = () => {
      es.close()
      ctx.setView?.(null)
      ctx.write('Connection error. Try /connect again.', 'error')
      resolve()
    }
  })
}

registerCommand({ name: 'connect', description: 'Connect WhatsApp (scan QR)', roles: ['client'], handler: connectHandler })
