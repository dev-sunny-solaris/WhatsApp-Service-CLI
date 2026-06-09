import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./Spinner.js', () => ({ default: 'span' }))

function makeCtx() {
  return {
    args: [] as string[],
    write: vi.fn(),
    writeLine: vi.fn(),
    setView: vi.fn(),
  }
}

describe('withSpinner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls setView with an element before fn runs', async () => {
    const { withSpinner } = await import('./withSpinner.js')
    const ctx = makeCtx()
    let calledDuringFn = false
    await withSpinner(ctx, 'Loading...', async () => {
      calledDuringFn = ctx.setView.mock.calls.length > 0
    })
    expect(calledDuringFn).toBe(true)
    expect(ctx.setView).toHaveBeenCalledWith(expect.anything())
  })

  it('calls setView(null) after fn completes', async () => {
    const { withSpinner } = await import('./withSpinner.js')
    const ctx = makeCtx()
    await withSpinner(ctx, 'Loading...', async () => {})
    expect(ctx.setView).toHaveBeenLastCalledWith(null)
  })

  it('returns the result of fn', async () => {
    const { withSpinner } = await import('./withSpinner.js')
    const ctx = makeCtx()
    const result = await withSpinner(ctx, 'Loading...', async () => 42)
    expect(result).toBe(42)
  })

  it('calls setView(null) and rethrows when fn throws', async () => {
    const { withSpinner } = await import('./withSpinner.js')
    const ctx = makeCtx()
    await expect(
      withSpinner(ctx, 'Loading...', async () => { throw new Error('boom') }),
    ).rejects.toThrow('boom')
    expect(ctx.setView).toHaveBeenLastCalledWith(null)
  })

  it('works gracefully when ctx has no setView', async () => {
    const { withSpinner } = await import('./withSpinner.js')
    const ctx = { args: [], write: vi.fn(), writeLine: vi.fn() }
    await expect(withSpinner(ctx as never, 'Loading...', async () => 'ok')).resolves.toBe('ok')
  })
})
