import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TEST_HOME = join(tmpdir(), `solaris-cli-creds-test-${process.pid}`)

vi.mock('node:os', async (orig) => {
  const actual = await orig<typeof import('node:os')>()
  return {
    ...actual,
    userInfo: () => ({ username: 'testuser', uid: 1000, gid: 1000, shell: '/bin/bash', homedir: TEST_HOME }),
    hostname: () => 'testhost',
    homedir: () => TEST_HOME,
  }
})

describe('credentials', () => {
  beforeEach(() => {
    vi.resetModules()
    mkdirSync(TEST_HOME, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true })
  })

  it('saves and loads back all fields', async () => {
    const { saveCredentials, loadCredentials } = await import('./credentials.js')

    const creds = {
      serviceKey: 'sk-test-123',
      accessToken: 'at-test-456',
      deviceId: 'dev-789',
      deviceApiKey: 'dak-abc',
    }

    saveCredentials(creds)
    expect(loadCredentials()).toEqual(creds)
  })

  it('returns empty object when no file exists', async () => {
    const { loadCredentials } = await import('./credentials.js')
    expect(loadCredentials()).toEqual({})
  })

  it('returns empty object on corrupt file', async () => {
    const { saveCredentials, loadCredentials } = await import('./credentials.js')
    const { writeFileSync } = await import('node:fs')

    saveCredentials({ serviceKey: 'x' })

    // corrupt the file
    const credFile = join(TEST_HOME, '.config', 'solaris-whatsapp-cli', 'credentials.enc')
    writeFileSync(credFile, Buffer.from('corrupted'))

    expect(loadCredentials()).toEqual({})
  })

  it('clears credentials file after clearCredentials', async () => {
    const { saveCredentials, loadCredentials, clearCredentials } = await import('./credentials.js')
    const { existsSync } = await import('node:fs')

    saveCredentials({ serviceKey: 'x' })
    clearCredentials()

    const credFile = join(TEST_HOME, '.config', 'solaris-whatsapp-cli', 'credentials.enc')
    expect(existsSync(credFile)).toBe(false)
    expect(loadCredentials()).toEqual({})
  })

  it('partial credentials survive round-trip', async () => {
    const { saveCredentials, loadCredentials } = await import('./credentials.js')

    saveCredentials({ deviceId: 'dev-only' })
    expect(loadCredentials()).toEqual({ deviceId: 'dev-only' })
  })
})
