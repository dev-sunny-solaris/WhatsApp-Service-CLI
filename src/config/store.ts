import Conf from 'conf'
import { homedir } from 'node:os'
import { join } from 'node:path'

interface Schema {
  baseUrl: string
}

export const CONFIG_DIR = join(homedir(), '.config', 'solaris-whatsapp-cli')

const conf = new Conf<Schema>({
  cwd: CONFIG_DIR,
  schema: {
    baseUrl: { type: 'string', default: '' },
  },
})

export function getBaseUrl(): string {
  return conf.get('baseUrl')
}

export function setBaseUrl(url: string): void {
  conf.set('baseUrl', url.replace(/\/+$/, ''))
}

export function hasBaseUrl(): boolean {
  return conf.get('baseUrl').length > 0
}
