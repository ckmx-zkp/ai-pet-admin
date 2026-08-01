import { http } from './http'

export interface KBEntry {
  id: number
  level?: 'element' | 'sign' | 'modality'
  key: string
  parent_key?: string | null
  version: number
  status: 'draft' | 'published' | 'archived'
  payload: Record<string, unknown>
  updated_at: string
}

export interface KBFeedback {
  id: number
  device_id: number | null
  kind: string
  payload: Record<string, unknown>
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
}

export const listZodiacKB = (params?: Record<string, unknown>) => http.get<KBEntry[]>('/admin/kb/zodiac', { params })
export const createZodiacDraft = (payload: Pick<KBEntry, 'level' | 'key' | 'parent_key' | 'payload'>) => http.post<KBEntry>('/admin/kb/zodiac', payload)
export const updateZodiacDraft = (id: number, payload: Pick<KBEntry, 'level' | 'key' | 'parent_key' | 'payload'>) => http.put<KBEntry>(`/admin/kb/zodiac/${id}`, payload)
export const publishZodiacDraft = (id: number) => http.post<KBEntry>(`/admin/kb/zodiac/${id}/publish`)
export const listMbtiKB = (params?: Record<string, unknown>) => http.get<KBEntry[]>('/admin/kb/mbti', { params })
export const createMbtiDraft = (payload: Pick<KBEntry, 'key' | 'payload'>) => http.post<KBEntry>('/admin/kb/mbti', payload)
export const updateMbtiDraft = (id: number, payload: Pick<KBEntry, 'key' | 'payload'>) => http.put<KBEntry>(`/admin/kb/mbti/${id}`, payload)
export const publishMbtiDraft = (id: number) => http.post<KBEntry>(`/admin/kb/mbti/${id}/publish`)
export const listKBFeedback = (params?: Record<string, unknown>) => http.get<KBFeedback[]>('/admin/kb/feedback', { params })
export const reviewKBFeedback = (id: number, action: 'accept' | 'ignore') => http.post<KBFeedback>(`/admin/kb/feedback/${id}/${action}`)
