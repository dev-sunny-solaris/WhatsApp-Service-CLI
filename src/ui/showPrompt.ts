import { type SelectItem } from './selectHelpers.js'
import type { CommandContext } from '../commands/registry.js'

export type { SelectItem }

export interface ShowSelectOptions {
  prompt?: string
  items: SelectItem[]
}

export function showSelectPrompt(ctx: CommandContext, options: ShowSelectOptions): Promise<string | undefined> {
  if (ctx.showSelect) {
    return ctx.showSelect(options)
  }
  return Promise.resolve(undefined)
}
