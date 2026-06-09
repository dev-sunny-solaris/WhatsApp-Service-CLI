import type { ReactElement } from 'react'
import type { Role } from '../state/session.js'

export type OutputType = 'info' | 'success' | 'error' | 'raw'

export interface OutputLine {
  text: string
  type: OutputType
}

export interface CommandContext {
  args: string[]
  write: (text: string, type?: OutputType) => void
  writeLine: (line: OutputLine) => void
  setView?: (element: ReactElement | null) => void
  showSelect?: (options: {
    prompt?: string
    items: Array<{ label: string; value: string }>
  }) => Promise<string | undefined>
  clear?: () => void
  exit?: () => void
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>

export interface CommandDef {
  // Full name without leading slash, e.g. "devices list", "quota apply"
  name: string
  description: string
  roles: Role[]
  handler: CommandHandler
}

const registry: CommandDef[] = []

export function registerCommand(def: CommandDef): void {
  registry.push(def)
}

export function getCommandsForRole(role: Role): CommandDef[] {
  return registry.filter((cmd) => cmd.roles.includes(role))
}

// Autocomplete: return commands whose name starts with the given prefix
export function matchCommands(prefix: string, role: Role): CommandDef[] {
  const q = prefix.toLowerCase()
  return getCommandsForRole(role).filter((cmd) => cmd.name.startsWith(q))
}

// Split argument string respecting "double" and 'single' quoted tokens
export function parseArgs(argString: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuote: '"' | "'" | null = null

  for (const ch of argString) {
    if (inQuote) {
      if (ch === inQuote) inQuote = null
      else current += ch
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === ' ' || ch === '\t') {
      if (current) { args.push(current); current = '' }
    } else {
      current += ch
    }
  }

  if (current) args.push(current)
  return args
}

// Parse raw input (with or without leading slash) and dispatch to handler
// Returns false if no matching command found
export async function dispatch(
  rawInput: string,
  role: Role,
  ctx: Omit<CommandContext, 'args'>,
): Promise<boolean> {
  const trimmed = rawInput.trim().replace(/^\//, '')
  if (!trimmed) return false

  const available = getCommandsForRole(role)

  // Longest-match: prefer "devices list" over "devices" when both are registered
  const match = available
    .filter((cmd) => {
      const rest = trimmed.slice(cmd.name.length)
      return trimmed === cmd.name || trimmed.startsWith(cmd.name + ' ')
    })
    .sort((a, b) => b.name.length - a.name.length)[0]

  if (!match) return false

  const argString = trimmed.slice(match.name.length).trim()
  const args = argString ? parseArgs(argString) : []

  await match.handler({ ...ctx, args })
  return true
}
