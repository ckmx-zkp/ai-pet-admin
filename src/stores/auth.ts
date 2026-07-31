import { defineStore } from 'pinia'
import { getCurrentUser, login } from '../api/auth'
import type { LoginPayload, User } from '../types/auth'

const TOKEN_KEY = 'ai-pet-admin-token'

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: localStorage.getItem(TOKEN_KEY) ?? '', user: null as User | null }),
  getters: { isAdmin: (state) => state.user?.role === 'admin' },
  actions: {
    async signIn(payload: LoginPayload) {
      const { data } = await login(payload)
      this.token = data.access_token
      localStorage.setItem(TOKEN_KEY, data.access_token)
      await this.fetchCurrentUser()
    },
    async fetchCurrentUser() {
      const { data } = await getCurrentUser()
      this.user = data
    },
    signOut() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
    },
  },
})
