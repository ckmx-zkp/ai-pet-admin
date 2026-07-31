<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const consoleUrl = import.meta.env.VITE_XIAOZHI_CONSOLE_URL
const menuItems = computed(() => [
  { index: '/devices', label: '设备管理', enabled: true },
  { index: '/persona', label: '人设设置', enabled: false },
  { index: '/messages', label: '对话历史', enabled: false },
  { index: '/memories', label: '记忆管理', enabled: false },
  { index: '/analyses', label: '分析', enabled: false },
  { index: '/peripheral', label: '外设状态', enabled: false },
  ...(auth.isAdmin ? [{ index: '/kb', label: '知识库', enabled: false }] : []),
])

function signOut() { auth.signOut(); router.replace('/login') }
</script>

<template>
  <el-container class="shell">
    <el-aside width="220px" class="sidebar">
      <div class="brand">AI Pet 管理台</div>
      <el-menu :default-active="$route.path" router background-color="#1f2937" text-color="#d1d5db" active-text-color="#ffffff">
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.enabled ? item.index : ''" :disabled="!item.enabled">
          {{ item.label }}<el-tag v-if="!item.enabled" size="small" type="info" class="soon">后续</el-tag>
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
