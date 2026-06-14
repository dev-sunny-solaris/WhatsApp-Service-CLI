import { adminLogin } from '../../api/admin.js'
import { normalizeError } from '../../api/client.js'
import { saveCredentials } from '../../config/credentials.js'
import { setBaseUrl } from '../../config/store.js'
import { setSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function loginAdminHandler(ctx: CommandContext): Promise<void> {
  const [baseUrl, serviceKey, otp] = ctx.args

  if (!baseUrl || !serviceKey || !otp) {
    ctx.write('Usage: /login-admin <BASE_URL> <SERVICE_KEY> <OTP>', 'error')
    return
  }

  try {
    const result = await adminLogin(baseUrl, serviceKey, otp)

    setBaseUrl(baseUrl)
    saveCredentials({ serviceKey, accessToken: result.access_token })
    setSession({
      role: 'admin',
      baseUrl,
      credentials: { serviceKey, accessToken: result.access_token },
    })

    ctx.write('Logged in as admin', 'success')
  } catch (e) {
    const err = normalizeError(e)

    if (err.code === 'ADMIN_HARD_LOCKED') {
      ctx.write('Admin hard locked — run admin:unlock on the server', 'error')
    } else if (err.code === 'ADMIN_LOCKED') {
      ctx.write(`Admin locked: ${err.message}`, 'error')
    } else {
      ctx.write(`Login failed [${err.code}]: ${err.message}`, 'error')
    }
  }
}

registerCommand({
  name: 'login-admin',
  usage: '<BASE_URL> <SERVICE_KEY> <OTP>',
  params: ['base_url', 'service_key', 'otp'],
  description: 'Login as admin',
  roles: ['unauthenticated'],
  handler: loginAdminHandler,
})
