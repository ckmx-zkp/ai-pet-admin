import { http } from './http'

export interface Device {
  id: number
  device_uid: string
  name: string | null
  online: boolean
  last_seen_at: string | null
  firmware_version: string | null
  capabilities: Record<string, unknown>
}

export interface BindDevicePayload {
  device_uid: string
  name?: string
}

export interface RenameDevicePayload {
  name: string
}

export const listDevices = () => http.get<Device[]>('/devices')
export const bindDevice = (payload: BindDevicePayload) => http.post<Device>('/devices/bind', payload)
export const getDevice = (deviceId: string | number) => http.get<Device>(`/devices/${deviceId}`)
export const renameDevice = (deviceId: string | number, payload: RenameDevicePayload) =>
  http.patch<Device>(`/devices/${deviceId}`, payload)
export const unbindDevice = (deviceId: string | number) => http.delete(`/devices/${deviceId}`)
