import { logout } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function disconnectHandler(ctx: CommandContext): Promise<void> {
  try {
    await logout()
    ctx.write('WhatsApp disconnected. CLI credentials still saved — use /logout to clear them.', 'success')
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({
  name: 'disconnect',
  description: 'Disconnect WhatsApp from phone (keeps CLI credentials)',
  roles: ['client'],
  handler: disconnectHandler,
})
