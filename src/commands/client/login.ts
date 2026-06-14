import { saveCredentials } from '../../config/credentials.js'
import { setBaseUrl } from '../../config/store.js'
import { setSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function loginHandler(ctx: CommandContext): Promise<void> {
  const [baseUrl, deviceId, deviceApiKey] = ctx.args

  if (!baseUrl || !deviceId || !deviceApiKey) {
    ctx.write('Usage: /login <BASE_URL> <DEVICE_ID> <DEVICE_API_KEY>', 'error')
    return
  }

  setBaseUrl(baseUrl)
  saveCredentials({ deviceId, deviceApiKey })
  setSession({ role: 'client', baseUrl, credentials: { deviceId, deviceApiKey } })
  ctx.write(`Logged in as client · ${deviceId}`, 'success')
}

registerCommand({
  name: 'login',
  usage: '<BASE_URL> <DEVICE_ID> <DEVICE_API_KEY>',
  params: ['base_url', 'device_id', 'api_key'],
  description: 'Login as device (client role)',
  roles: ['unauthenticated'],
  handler: loginHandler,
})
