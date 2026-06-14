import { applyQuota, listPackages, removeQuota, type QuotaApplyBody } from '../../api/admin.js'
import { normalizeError } from '../../api/client.js'
import { showSelectPrompt } from '../../ui/showPrompt.js'
import { registerCommand, type CommandContext } from '../registry.js'
import { selectDevice } from './helpers.js'

async function selectPackage(ctx: CommandContext): Promise<string | undefined> {
  try {
    const packages = await listPackages()
    const items = [
      ...Object.keys(packages).map((k) => ({ label: k, value: k })),
      { label: 'custom', value: 'custom' },
    ]
    return showSelectPrompt(ctx, { prompt: 'Select package:', items })
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
    return undefined
  }
}

export async function quotaApplyHandler(ctx: CommandContext): Promise<void> {
  let deviceId = ctx.args[0]
  let pkg      = ctx.args[1]
  const rest   = ctx.args.slice(2)

  if (!deviceId) {
    const selected = await selectDevice(ctx)
    if (!selected) return
    deviceId = selected
  }

  if (!pkg) {
    const selected = await selectPackage(ctx)
    if (!selected) return
    pkg = selected
  }

  const body: QuotaApplyBody = { package: pkg }

  if (pkg === 'custom') {
    const [qt, pd, dl] = rest.map(Number)
    if (!qt || !pd || !dl || isNaN(qt) || isNaN(pd) || isNaN(dl)) {
      ctx.write('custom package requires: quota_total period_days daily_limit (positive numbers)', 'error')
      return
    }
    body.quota_total  = qt
    body.period_days  = pd
    body.daily_limit  = dl
  }

  try {
    const result = await applyQuota(deviceId, body)
    const q = result.quota
    if (q) {
      ctx.write(`Quota applied: ${q.package} · ${q.total} msgs / ${q.period_days} days · daily ${q.daily_limit}`, 'success')
    } else {
      ctx.write(`Quota applied to ${result.name}`, 'success')
    }
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

export async function quotaRemoveHandler(ctx: CommandContext): Promise<void> {
  let deviceId = ctx.args[0]

  if (!deviceId) {
    const selected = await selectDevice(ctx)
    if (!selected) return
    deviceId = selected
  }

  try {
    const result = await removeQuota(deviceId)
    ctx.write(`Quota removed from ${result.name}`, 'success')
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({ name: 'quota apply',  usage: '[device_id] [package]', description: 'Apply quota package to device', roles: ['admin'], handler: quotaApplyHandler })
registerCommand({ name: 'quota remove', usage: '[device_id]',           description: 'Remove quota from device',      roles: ['admin'], handler: quotaRemoveHandler })
