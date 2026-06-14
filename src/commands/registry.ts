import type { ReactElement } from 'react'
import type { Role } from '../state/session.js'

export type OutputType = 'info' | 'success' | 'error' | 'raw' | 'cmd-header' | 'cmd-arg' | 'cmd-spacer'

export interface OutputLine {
  text: string
  type: OutputType
  timestamp?: Date
}

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'select'
  options?: Array<{ label: string; value: string }>
  optional?: boolean
  placeholder?: string
}

export type FormValues = Record<string, string>
export type FormFieldsFn = FieldDef[] | ((values: FormValues) => FieldDef[])

export interface CommandContext {
  args: string[]
  write: (text: string, type?: OutputType) => void
  writeLine: (line: OutputLine) => void
  writeCommandArgs?: (args: Array<{ key: string; value: string }>) => void
  setView?: (element: ReactElement | null) => void
  showSelect?: (options: {
    prompt?: string
    items: Array<{ label: string; value: string }>
  }) => Promise<string | undefined>
  showInput?: (prompt: string) => Promise<string | undefined>
  showForm?: (
    title: string,
    fields: FormFieldsFn,
    initial?: Partial<FormValues>
  ) => Promise<FormValues | undefined>
  clear?: () => void
  exit?: () => void
  setCancel?: (fn: (() => void) | null) => void
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>

export interface CommandDef {
  // Full name without leading slash, e.g. "devices list", "quota apply"
  name: string
  description: string
  /** Argument hint shown in the autocomplete dropdown, e.g. "<to> <message>" */
  usage?: string
  /** Named param labels for chat history display, e.g. ["to", "message"] */
  params?: string[]
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

// Parse raw input (with or without leading slash) and dispatch to handler.
// Writes a formatted command entry to chat before calling the handler.
// Returns false if no matching command found.
export async function dispatch(
  rawInput: string,
  role: Role,
  ctx: Omit<CommandContext, 'args' | 'writeCommandArgs'>,
): Promise<boolean> {
  const trimmed = rawInput.trim().replace(/^\//, '')
  if (!trimmed) return false

  const available = getCommandsForRole(role)

  // Longest-match: prefer "devices list" over "devices" when both are registered
  const match = available
    .filter((cmd) => {
      return trimmed === cmd.name || trimmed.startsWith(cmd.name + ' ')
    })
    .sort((a, b) => b.name.length - a.name.length)[0]

  if (!match) return false

  const argString = trimmed.slice(match.name.length).trim()
  const args = argString ? parseArgs(argString) : []

  // Build display pairs for inline args (named if params defined, positional otherwise)
  const argPairs = args.map((v, i) => {
    const key = match.params?.[i]
    return key ? `${key} · ${v}` : v
  })

  // Write command entry header
  ctx.writeLine({ text: '', type: 'cmd-spacer' })
  ctx.writeLine({ text: match.name, type: 'cmd-header', timestamp: new Date() })
  for (const pair of argPairs) {
    ctx.writeLine({ text: pair, type: 'cmd-arg' })
  }

  // writeCommandArgs: lets handlers append form-filled arg lines to the header
  const writeCommandArgs = (formArgs: Array<{ key: string; value: string }>) => {
    for (const { key, value } of formArgs) {
      if (value) ctx.writeLine({ text: `${key} · ${value}`, type: 'cmd-arg' })
    }
  }

  await match.handler({ ...ctx, args, writeCommandArgs })
  return true
}
