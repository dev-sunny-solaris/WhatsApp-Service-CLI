import { listDevices } from '../../api/admin.js'
import { normalizeError } from '../../api/client.js'
import { showSelectPrompt } from '../../ui/showPrompt.js'
import type { CommandContext } from '../registry.js'

export async function selectDevice(ctx: CommandContext): Promise<string | undefined> {
  try {
    const devices = await listDevices()
    if (devices.length === 0) {
      ctx.write('No devices', 'info')
      return undefined
    }
    return showSelectPrompt(ctx, {
      prompt: 'Select device:',
      items: devices.map((d) => ({ label: `${d.name}  [${d.status}]`, value: d.id })),
    })
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
    return undefined
  }
}
