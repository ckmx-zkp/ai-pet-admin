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

export const listAdminDevices = (params?: { q?: string; limit?: number; offset?: number }) =>
  http.get<AdminDevice[]>('/admin/devices', { params })
export const lookupAdminDevice = (deviceUid: string) =>
  http.get<AdminDevice>('/admin/devices/lookup', { params: { device_uid: deviceUid } })
export const getAdminDevice = (deviceId: string | number) => http.get<AdminDevice>(`/admin/devices/${deviceId}`)
export const rotateBindingId = (deviceId: string | number) =>
  http.post<AdminDevice>(`/admin/devices/${deviceId}/binding-id/rotate`)
export const getAdminPersona = (deviceId: string | number) =>
  http.get<PersonaProfile>(`/admin/devices/${deviceId}/persona`)
export const updateAdminPersona = (deviceId: string | number, payload: Omit<PersonaProfile, 'device_id' | 'kb_version'>) =>
  http.put<PersonaProfile>(`/admin/devices/${deviceId}/persona`, payload)
export const listAdminMessages = (deviceId: string | number, params?: { limit?: number; offset?: number }) =>
  http.get<ChatMessage[]>(`/admin/devices/${deviceId}/messages`, { params })
export const getAdminPeripheral = (deviceId: string | number) =>
  http.get<PeripheralState>(`/admin/devices/${deviceId}/peripheral`)
export const listAdminAnalyses = (deviceId: string | number, params?: { limit?: number; offset?: number }) =>
  http.get<Analysis[]>(`/admin/devices/${deviceId}/analyses`, { params })
