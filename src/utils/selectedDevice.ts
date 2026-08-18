export const SELECTED_DEVICE_KEY = 'ai-pet-admin-selected-device'

export const DEVICE_TABS = ['persona', 'messages', 'memories', 'analyses', 'peripheral', 'fortune'] as const
export type DeviceTab = (typeof DEVICE_TABS)[number]

export function getSelectedDeviceId(): string {
  return localStorage.getItem(SELECTED_DEVICE_KEY) || ''
}

export function setSelectedDeviceId(id: string) {
  localStorage.setItem(SELECTED_DEVICE_KEY, id)
}

export function isDeviceTab(value: unknown): value is DeviceTab {
  return typeof value === 'string' && (DEVICE_TABS as readonly string[]).includes(value)
}
