<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { getSelectedDeviceId, isDeviceTab, type DeviceTab } from '../utils/selectedDevice'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const consoleUrl = import.meta.env.VITE_XIAOZHI_CONSOLE_URL
const tabItems: Array<{ index: DeviceTab; label: string }> = [
  { index: 'persona', label: '人设设置' },
  { index: 'messages', label: '对话历史' },
  { index: 'memories', label: '记忆管理' },
  { index: 'analyses', label: '分析' },
  { index: 'peripheral', label: '外设状态' },
]
const menuItems = computed(() => [
  { index: 'devices', label: '设备管理' },
  ...tabItems,
  ...(auth.isAdmin ? [{ index: 'kb', label: '知识库' }] : []),
])
const activeMenu = computed(() => {
  if (route.path === '/kb') return 'kb'
  if (route.path.startsWith('/devices/') && route.params.id) {
    return isDeviceTab(route.query.tab) ? route.query.tab : 'persona'
  }
  return 'devices'
})

function currentDeviceId() {
  return typeof route.params.id === 'string' && route.params.id ? route.params.id : getSelectedDeviceId()
}

function openMenu(index: string) {
  if (index === 'devices') {
    router.push('/devices')
    return
  }
  if (index === 'kb') {
    router.push('/kb')
    return
  }
  if (!isDeviceTab(index)) return
  const deviceId = currentDeviceId()
  if (!deviceId) {
    ElMessage.warning('请先在设备列表中打开一台设备')
    if (route.path !== '/devices') router.push({ path: '/devices', query: { needDevice: '1' } })
    return
  }
  router.push({ path: `/devices/${deviceId}`, query: { tab: index } })
}

function signOut() { auth.signOut(); router.replace('/login') }
</script>

<template>
  <el-container class="shell">
    <el-aside width="220px" class="sidebar">
      <div class="brand">AI Pet 管理台</div>
      <el-menu :key="activeMenu" :default-active="activeMenu" background-color="#1f2937" text-color="#d1d5db" active-text-color="#ffffff" @select="openMenu">
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="topbar">
        <span>设备与陪伴数据管理</span>
        <div class="actions">
          <el-link v-if="consoleUrl" :href="consoleUrl" target="_blank" type="primary">小智智控台</el-link>
          <span>{{ auth.user?.login_name }}</span>
          <el-button text @click="signOut">退出登录</el-button>
        </div>
      </el-header>
      <el-main><RouterView /></el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.shell { min-height: 100vh; }
.sidebar { background: #1f2937; }
.brand { padding: 22px 20px; color: #fff; font-size: 18px; font-weight: 600; }
.el-menu { border-right: 0; }
.soon { margin-left: 8px; }
.topbar { display: flex; align-items: center; justify-content: space-between; background: #fff; border-bottom: 1px solid #e5e7eb; }
.actions { display: flex; align-items: center; gap: 16px; }
@media (max-width: 720px) { .sidebar { width: 160px !important; } .topbar { padding: 0 12px; } }
</style>
