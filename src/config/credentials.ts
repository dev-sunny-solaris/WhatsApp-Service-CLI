import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir, hostname, userInfo } from 'node:os'
import { join } from 'node:path'

const CONFIG_DIR = join(homedir(), '.config', 'solaris-whatsapp-cli')
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.enc')
const SCRYPT_SALT = Buffer.from('solaris-whatsapp-cli-v1', 'utf8')
const ALGORITHM = 'aes-256-gcm' as const
const IV_LEN = 12
const TAG_LEN = 16

export interface Credentials {
  serviceKey?: string
  accessToken?: string
  deviceId?: string
  deviceApiKey?: string
}

function deriveKey(): Buffer {
  const material = `${userInfo().username}:${hostname()}`
  return scryptSync(material, SCRYPT_SALT, 32)
}

export function saveCredentials(creds: Credentials): void {
  const key = deriveKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const plaintext = Buffer.from(JSON.stringify(creds), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()

  // layout: iv (12 B) | authTag (16 B) | ciphertext
  const payload = Buffer.concat([iv, authTag, encrypted])

  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CREDENTIALS_FILE, payload)
}

export function loadCredentials(): Credentials {
  if (!existsSync(CREDENTIALS_FILE)) return {}

  try {
    const key = deriveKey()
    const payload = readFileSync(CREDENTIALS_FILE)

    if (payload.length < IV_LEN + TAG_LEN) return {}

    const iv = payload.subarray(0, IV_LEN)
    const authTag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN)
    const encrypted = payload.subarray(IV_LEN + TAG_LEN)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return JSON.parse(plaintext.toString('utf8')) as Credentials
  } catch {
    return {}
  }
}

export function clearCredentials(): void {
  if (!existsSync(CREDENTIALS_FILE)) return

  // overwrite with random bytes before delete to prevent naive recovery
  const size = readFileSync(CREDENTIALS_FILE).length
  writeFileSync(CREDENTIALS_FILE, randomBytes(size))
  unlinkSync(CREDENTIALS_FILE)
}
