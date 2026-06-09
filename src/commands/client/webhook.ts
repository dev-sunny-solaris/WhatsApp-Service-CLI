import { setWebhook } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function webhookSetHandler(ctx: CommandContext): Promise<void> {
  const [url, secret] = ctx.args

  if (!url) {
    ctx.write('Usage: /webhook set <url> [secret]', 'error')
    return
  }

  try {
    await setWebhook(url, secret)
    ctx.write(`Webhook set: ${url}`, 'success')
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({ name: 'webhook set', description: 'Set webhook URL and optional secret', roles: ['client'], handler: webhookSetHandler })
