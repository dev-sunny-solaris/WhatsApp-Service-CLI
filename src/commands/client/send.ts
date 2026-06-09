import { createElement } from 'react'
import { basename } from 'node:path'
import { sendMedia, sendText } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import ProgressBar from '../../ui/ProgressBar.js'
import { registerCommand, type CommandContext } from '../registry.js'
import { uploadFile } from './upload.js'

export async function sendTextHandler(ctx: CommandContext): Promise<void> {
  const [to, ...parts] = ctx.args
  const message = parts.join(' ')

  if (!to || !message) {
    ctx.write('Usage: /send text <to> <message>', 'error')
    return
  }

  try {
    const result = await sendText(to, message)
    ctx.write(`Sent${result.message_id ? ` · ID: ${result.message_id}` : ''}`, 'success')
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

export async function sendMediaHandler(ctx: CommandContext): Promise<void> {
  const forceDocument = ctx.args.includes('--document')
  const cleanArgs = ctx.args.filter((a) => a !== '--document')
  const [to, filePath, ...captionParts] = cleanArgs
  const caption = captionParts.length > 0 ? captionParts.join(' ') : undefined

  if (!to || !filePath) {
    ctx.write('Usage: /send media <to> <file_path> [caption] [--document]', 'error')
    return
  }

  try {
    const label = basename(filePath)
    const uploadId = await uploadFile(filePath, (pct) => {
      ctx.setView?.(createElement(ProgressBar, { pct, label }))
    })
    ctx.setView?.(null)
    const result = await sendMedia(to, uploadId, caption, forceDocument || undefined)
    ctx.write(`Sent${result.message_id ? ` · ID: ${result.message_id}` : ''}`, 'success')
  } catch (e) {
    ctx.setView?.(null)
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({ name: 'send text',  description: 'Send a text message',  roles: ['client'], handler: sendTextHandler })
registerCommand({ name: 'send media', description: 'Send a media message', roles: ['client'], handler: sendMediaHandler })
