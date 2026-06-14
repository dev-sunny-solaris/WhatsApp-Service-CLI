import { clearCredentials } from '../../config/credentials.js'
import { clearSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function logoutHandler(ctx: CommandContext): Promise<void> {
  clearCredentials()
  clearSession()
  ctx.write('Logged out', 'success')
}

registerCommand({
  name: 'logout',
  usage: '',
  description: 'Logout and clear session',
  roles: ['admin', 'client'],
  handler: logoutHandler,
})
