import { createElement } from 'react'
import Spinner from './Spinner.js'
import type { CommandContext } from '../commands/registry.js'

export async function withSpinner<T>(
  ctx: CommandContext,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  ctx.setView?.(createElement(Spinner, { label }))
  try {
    return await fn()
  } finally {
    ctx.setView?.(null)
  }
}
