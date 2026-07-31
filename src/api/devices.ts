import { http } from './http'

export interface Device {
  id: number
  device_uid: string
  name?: string
  status?: string
  firmware_version?: string
}

export const listDevices = () => http.get<Device[]>('/devices')
export const getDevice = (deviceId: string) => http.get<Device>(`/devices/${deviceId}`)
