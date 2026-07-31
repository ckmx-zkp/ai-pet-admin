export interface User {
  id: number
  login_name: string
  role: 'user' | 'admin'
  status: string
}

export interface LoginPayload {
  login_name: string
  password: string
}

export interface RegisterPayload extends LoginPayload {}

export interface TokenResponse {
  access_token: string
  token_type: string
}
