import type { Credentials } from '../config/credentials.js'

export type Role = 'unauthenticated' | 'admin' | 'client'

interface Session {
  role: Role
  baseUrl: string
  credentials: Credentials
}

let current: Session = {
  role: 'unauthenticated',
  baseUrl: '',
  credentials: {},
}

export function getSession(): Readonly<Session> {
  return current
}

export function setSession(patch: Partial<Session>): void {
  current = { ...current, ...patch }
}

export function clearSession(): void {
  current = { role: 'unauthenticated', baseUrl: '', credentials: {} }
}

export function getRole(): Role {
  return current.role
}

export function isAuthenticated(): boolean {
  return current.role !== 'unauthenticated'
}
