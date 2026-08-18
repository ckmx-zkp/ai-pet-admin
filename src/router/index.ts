import { createRouter, createWebHistory } from 'vue-router'
import { pinia } from '../stores'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/login/LoginView.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DeviceListView from '../views/devices/DeviceListView.vue'
import DeviceDetailView from '../views/devices/DeviceDetailView.vue'
import KnowledgeBaseView from '../views/kb/KnowledgeBaseView.vue'
import { getSelectedDeviceId } from '../utils/selectedDevice'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    {
      path: '/', component: MainLayout,
      children: [
        { path: '', redirect: '/devices' },
        { path: 'devices', component: DeviceListView },
        { path: 'devices/:id', component: DeviceDetailView, props: true },
        { path: 'kb', component: KnowledgeBaseView },
        {
          path: 'persona',
          redirect: () => selectedDeviceRedirect('persona'),
        },
        {
          path: 'messages',
          redirect: () => selectedDeviceRedirect('messages'),
        },
        {
          path: 'memories',
          redirect: () => selectedDeviceRedirect('memories'),
        },
        {
          path: 'analyses',
          redirect: () => selectedDeviceRedirect('analyses'),
        },
        {
          path: 'peripheral',
          redirect: () => selectedDeviceRedirect('peripheral'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/devices' },
  ],
})

function selectedDeviceRedirect(tab: string) {
  const deviceId = getSelectedDeviceId()
  return deviceId
    ? { path: `/devices/${deviceId}`, query: { tab } }
    : { path: '/devices', query: { needDevice: '1' } }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)
  if (to.meta.public) return true
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  if (!auth.user) {
    try { await auth.fetchCurrentUser() } catch { auth.signOut(); return { path: '/login' } }
  }
  return true
})
