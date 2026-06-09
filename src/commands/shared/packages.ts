import { listPackages as adminListPackages } from '../../api/admin.js'
import { normalizeError } from '../../api/client.js'
import { writeTable } from '../../ui/tableFormatter.js'
import { getRole } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function packagesHandler(ctx: CommandContext): Promise<void> {
  try {
    // Both roles hit the same endpoint; admin.ts and device.ts both expose listPackages
    const packages = await adminListPackages()
    const entries = Object.entries(packages)
    if (entries.length === 0) {
      ctx.write('No packages available', 'info')
      return
    }
    writeTable(
      ctx.write,
      ['Package', 'Total', 'Period', 'Daily Limit'],
      entries.map(([name, def]) => {
        const d = def as Record<string, unknown>
        if (d.quota_total === null) {
          return [name, 'custom', '-', '-']
        }
        return [name, String(d.quota_total), `${d.period_days}d`, String(d.daily_limit)]
      }),
    )
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({ name: 'packages', description: 'List available quota packages', roles: ['admin', 'client'], handler: packagesHandler })
