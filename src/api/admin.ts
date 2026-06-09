import { getHttp, makeHttp, unwrap } from './client.js'

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  access_token: string
}

export async function adminLogin(
  baseUrl: string,
  serviceKey: string,
  otp: string,
  name?: string,
): Promise<LoginResult> {
  const http = makeHttp(baseUrl, { 'X-Api-Key': serviceKey })
  return unwrap(http.post<{ success: boolean; data: LoginResult }>('/admin/login', { otp, name }))
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export interface TokenEntry {
  name: string
  created_at: string
  token_prefix: string
}

export async function listTokens(): Promise<TokenEntry[]> {
  return unwrap(getHttp().get('/admin/tokens'))
}

// full token value required (server matches by value, not prefix)
export async function revokeToken(token: string): Promise<void> {
  await unwrap(getHttp().post('/admin/tokens/revoke', { token }))
}

export async function revokeAllTokens(): Promise<void> {
  await unwrap(getHttp().post('/admin/tokens/revoke-all', {}))
}

// ─── Devices ─────────────────────────────────────────────────────────────────

export interface QuotaStatus {
  package: string
  total: number | null
  used: number
  remaining: number | null
  period_days: number
  expires_at: string
  daily_limit: number
  status: string
}

export interface RateLimit {
  text: number
  media: number
  burst: number
}

export interface DeviceAdminView {
  id: string
  name: string
  status: string
  quota: QuotaStatus | null
  rate_limit: RateLimit | null
  created_at: string
}

export interface DeviceCreated {
  id: string
  name: string
  api_key: string
  created_at: string
}

export interface DeviceKeyResult {
  id: string
  name: string
  api_key: string
}

export async function createDevice(name: string): Promise<DeviceCreated> {
  return unwrap(getHttp().post('/devices', { name }))
}

export async function listDevices(): Promise<DeviceAdminView[]> {
  return unwrap(getHttp().get('/devices'))
}

export async function getDevice(id: string): Promise<DeviceAdminView> {
  return unwrap(getHttp().get(`/devices/${id}`))
}

export async function deleteDevice(id: string): Promise<void> {
  await unwrap(getHttp().delete(`/devices/${id}`))
}

export async function revokeDeviceKey(id: string): Promise<DeviceKeyResult> {
  return unwrap(getHttp().post(`/devices/${id}/revoke-key`, {}))
}

export async function unlockDevice(id: string): Promise<DeviceKeyResult> {
  return unwrap(getHttp().post(`/devices/${id}/unlock`, {}))
}

// ─── Quota ───────────────────────────────────────────────────────────────────

export interface QuotaApplyBody {
  package: string
  quota_total?: number
  period_days?: number
  daily_limit?: number
  rate_limit_text?: number
  rate_limit_media?: number
  rate_limit_burst?: number
}

export interface QuotaResult {
  id: string
  name: string
  quota: QuotaStatus | null
}

export async function applyQuota(deviceId: string, body: QuotaApplyBody): Promise<QuotaResult> {
  return unwrap(getHttp().post(`/devices/${deviceId}/quota/apply`, body))
}

export async function removeQuota(deviceId: string): Promise<QuotaResult> {
  return unwrap(getHttp().delete(`/devices/${deviceId}/quota`))
}

// ─── Packages ────────────────────────────────────────────────────────────────

export interface PackageDef {
  quota_total: number | null
  period_days: number | null
  daily_limit?: number
  rate_limit_text?: number
  rate_limit_media?: number
  rate_limit_burst?: number
}

export type PackagesResponse = Record<string, PackageDef>

export async function listPackages(): Promise<PackagesResponse> {
  return unwrap(getHttp().get('/packages'))
}
