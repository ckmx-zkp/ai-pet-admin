import axios from 'axios'
import { ElMessage } from 'element-plus'

const configuredBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, '')
const apiBase = configuredBase
  ? (configuredBase.endsWith('/api') ? configuredBase : `${configuredBase}/api`)
  : '/api'

export const http = axios.create({ baseURL: apiBase, timeout: 10_000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('ai-pet-admin-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config.url?.startsWith('/auth/')) {
      localStorage.removeItem('ai-pet-admin-token')
      const { router } = await import('../router')
      if (router.currentRoute.value.path !== '/login') {
        ElMessage.warning('登录已失效，请重新登录')
        await router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
      }
    }
    return Promise.reject(error)
  },
)
