import { http } from './http'

export interface AdminDevice {
  id: number
  device_uid: string
  binding_id: string
  name: string | null
  claimed: boolean
  online: boolean
  last_seen_at: string | null
  firmware_version: string | null
  capabilities: Record<string, unknown>
}

export interface PersonaProfile {
  device_id: number
  sun_sign: string | null
  mbti: string | null
  overrides: Record<string, unknown>
  follow_latest: boolean
  kb_version: number | null
  dossier: PersonaDossier
  bond: BondView | null
}
export interface PersonaDossier { identity: string; background: string[]; roles: string[]; goals: string[]; evolution_rules: string[]; relationship: string }
export interface BondView {
  kind: string
  label: string
  summary: string
  source: string
  confidence: number
  updated_at: string | null
}

export interface ChatMessage {
  id: number
  session_id: number
  role: string
  content_redacted: string
  created_at: string
}

export interface PeripheralState {
  device_id: number
  eye_emotion: string | null
  eye_gaze: string | null
  eye_closed: boolean | null
  extra: Record<string, unknown>
  updated_at: string
}

export interface Analysis {
  id: number
  kind: string
  payload: Record<string, unknown>
  created_at: string
}
export interface AdminMemory {
  id: number
  device_id: number
  title: string | null
  content: string
  status: string
  source: string
  tags: string[]
  created_at: string
  updated_at: string
}

export const listAdminDevices = (params?: { q?: string; limit?: number; offset?: number }) =>
  http.get<AdminDevice[]>('/admin/devices', { params })
export const lookupAdminDevice = (deviceUid: string) =>
  http.get<AdminDevice>('/admin/devices/lookup', { params: { device_uid: deviceUid } })
export const getAdminDevice = (deviceId: string | number) => http.get<AdminDevice>(`/admin/devices/${deviceId}`)
export const rotateBindingId = (deviceId: string | number) =>
  http.post<AdminDevice>(`/admin/devices/${deviceId}/binding-id/rotate`)
export const getAdminPersona = (deviceId: string | number) =>
  http.get<PersonaProfile>(`/admin/devices/${deviceId}/persona`)
export const updateAdminPersona = (deviceId: string | number, payload: Omit<PersonaProfile, 'device_id' | 'kb_version' | 'bond'>) =>
  http.put<PersonaProfile>(`/admin/devices/${deviceId}/persona`, payload)
export const listAdminMessages = (deviceId: string | number, params?: {
  from?: string
  to?: string
  limit?: number
  offset?: number
}) =>
  http.get<ChatMessage[]>(`/admin/devices/${deviceId}/messages`, { params })
export const getAdminPeripheral = (deviceId: string | number) =>
  http.get<PeripheralState>(`/admin/devices/${deviceId}/peripheral`)
export const listAdminAnalyses = (deviceId: string | number, params?: { kind?: string; limit?: number; offset?: number }) =>
  http.get<Analysis[]>(`/admin/devices/${deviceId}/analyses`, { params })
export const listAdminMemories = (deviceId: string | number, params?: { q?: string; status?: string; limit?: number; offset?: number }) =>
  http.get<AdminMemory[]>(`/admin/devices/${deviceId}/memories`, { params })
export const reviewAdminMemory = (deviceId: string | number, memoryId: number, action: 'approve' | 'reject') =>
  http.post<AdminMemory>(`/admin/devices/${deviceId}/memories/${memoryId}/${action}`)

export interface FortuneDimensions {
  overall: string | null
  career: string | null
  wealth: string | null
  study: string | null
  love: string | null
}
export interface DailyFortune {
  date: string
  sign: string | null
  sign_fortune: FortuneDimensions | null
  greeting: string | null
  bazi_fortune: FortuneDimensions | null
  generating: boolean
}
export const getAdminDailyFortune = (deviceId: string | number, date?: string) =>
  http.get<DailyFortune>(`/admin/devices/${deviceId}/fortune/daily`, { params: { date } })

export interface OpsMetrics {
  pending: number
  failed: number
  last_24h_by_kind: Record<string, Record<string, number>>
}
export const getOpsMetrics = () => http.get<OpsMetrics>('/admin/ops/metrics')
