import {
  createDevice,
  deleteDevice,
  getDevice,
  listDevices,
  revokeDeviceKey,
  unlockDevice,
  type DeviceAdminView,
} from '../../api/admin.js'
import { normalizeError } from '../../api/client.js'
import { writeTable } from '../../ui/tableFormatter.js'
import { withSpinner } from '../../ui/withSpinner.js'
import { registerCommand, type CommandContext } from '../registry.js'
import { selectDevice } from './helpers.js'

export function formatDeviceRow(device: DeviceAdminView): string {
  const quota = device.quota ? `${device.quota.package} (${device.quota.used}/${device.quota.total ?? '∞'})` : 'no quota'
  return `${device.id}  ${device.name.padEnd(20)}  [${device.status}]  ${quota}`
}

export function formatDeviceDetail(device: DeviceAdminView): string[] {
  const lines = [
    `ID:      ${device.id}`,
    `Name:    ${device.name}`,
    `Status:  ${device.status}`,
    `Created: ${device.created_at}`,
  ]
  if (device.quota) {
    const q = device.quota
    lines.push(`Quota:   ${q.package} · ${q.used}/${q.total ?? '∞'} used · ${q.status} · expires ${q.expires_at}`)
    lines.push(`Daily:   ${q.daily_limit} msg/day`)
  }
  if (device.rate_limit) {
    const r = device.rate_limit
    lines.push(`Rate:    text=${r.text}/min  media=${r.media}/min  burst=${r.burst}`)
  }
  return lines
}

async function withApiError(ctx: CommandContext, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

export async function devicesListHandler(ctx: CommandContext): Promise<void> {
  await withApiError(ctx, async () => {
    const devices = await withSpinner(ctx, 'Fetching devices...', () => listDevices())
    if (devices.length === 0) {
      ctx.write('No devices found', 'info')
      return
    }
    writeTable(
      ctx.write,
      ['ID', 'Name', 'Status', 'Quota'],
      devices.map((d) => {
        const quota = d.quota
          ? `${d.quota.package} (${d.quota.used}/${d.quota.total ?? '∞'})`
          : 'no quota'
        return [d.id, d.name, d.status, quota]
      }),
    )
  })
}

export async function devicesCreateHandler(ctx: CommandContext): Promise<void> {
  const name = ctx.args.join(' ').trim()
  if (!name) {
    ctx.write('Usage: /devices create <name>', 'error')
    return
  }
  await withApiError(ctx, async () => {
    const device = await createDevice(name)
    ctx.write(`Created: ${device.id}  ${device.name}`, 'success')
    ctx.write(`API Key: ${device.api_key}`, 'raw')
  })
}

export async function devicesGetHandler(ctx: CommandContext): Promise<void> {
  let id = ctx.args[0]
  if (!id) {
    const selected = await selectDevice(ctx)
    if (!selected) return
    id = selected
  }
  await withApiError(ctx, async () => {
    const device = await withSpinner(ctx, 'Fetching device...', () => getDevice(id))
    formatDeviceDetail(device).forEach((line) => ctx.write(line, 'raw'))
  })
}

export async function devicesDeleteHandler(ctx: CommandContext): Promise<void> {
  let id = ctx.args[0]
  if (!id) {
    const selected = await selectDevice(ctx)
    if (!selected) return
    id = selected
  }
  await withApiError(ctx, async () => {
    await deleteDevice(id)
    ctx.write(`Deleted: ${id}`, 'success')
  })
}

export async function devicesRevokeKeyHandler(ctx: CommandContext): Promise<void> {
  let id = ctx.args[0]
  if (!id) {
    const selected = await selectDevice(ctx)
    if (!selected) return
    id = selected
  }
  await withApiError(ctx, async () => {
    const result = await revokeDeviceKey(id)
    ctx.write(`New API Key: ${result.api_key}`, 'success')
  })
}

export async function devicesUnlockHandler(ctx: CommandContext): Promise<void> {
  let id = ctx.args[0]
  if (!id) {
    const selected = await selectDevice(ctx)
    if (!selected) return
    id = selected
  }
  await withApiError(ctx, async () => {
    const result = await unlockDevice(id)
    ctx.write(`Unlocked: ${result.name}  New API Key: ${result.api_key}`, 'success')
  })
}

registerCommand({ name: 'devices list',       usage: '',                description: 'List all devices',               roles: ['admin'], handler: devicesListHandler })
registerCommand({ name: 'devices create',     usage: '<name>',          description: 'Create a new device',            roles: ['admin'], handler: devicesCreateHandler })
registerCommand({ name: 'devices get',        usage: '[device_id]',     description: 'Show device details',            roles: ['admin'], handler: devicesGetHandler })
registerCommand({ name: 'devices delete',     usage: '[device_id]',     description: 'Delete a device',                roles: ['admin'], handler: devicesDeleteHandler })
registerCommand({ name: 'devices revoke-key', usage: '[device_id]',     description: 'Rotate device API key',          roles: ['admin'], handler: devicesRevokeKeyHandler })
registerCommand({ name: 'devices unlock',     usage: '[device_id]',     description: 'Unlock locked device',           roles: ['admin'], handler: devicesUnlockHandler })
