import { http } from './http'
import type { LoginPayload, RegisterPayload, TokenResponse, User } from '../types/auth'

export const login = (payload: LoginPayload) => http.post<TokenResponse>('/auth/login', payload)
export const register = (payload: RegisterPayload) => http.post<User>('/auth/register', payload)
export const getCurrentUser = () => http.get<User>('/auth/me')
