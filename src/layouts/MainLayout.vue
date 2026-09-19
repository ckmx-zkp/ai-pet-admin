<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  UserFilled,
  ChatDotRound,
  Collection,
  DataAnalysis,
  View as ViewIcon,
  Opportunity,
  Reading,
  Histogram,
  TopRight,
  SwitchButton,
  Connection,
  User,
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { getSelectedDeviceId, isDeviceTab, type DeviceTab } from '../utils/selectedDevice'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const consoleUrl = import.meta.env.VITE_XIAOZHI_CONSOLE_URL

interface MenuItem {
  index: string
  label: string
  icon: any
  group?: string
}

const tabItems: Array<{ index: DeviceTab; label: string; icon: any }> = [
  { index: 'persona', label: '人设设置', icon: UserFilled },
  { index: 'messages', label: '对话历史', icon: ChatDotRound },
  { index: 'memories', label: '记忆管理', icon: Collection },
  { index: 'analyses', label: '行为分析', icon: DataAnalysis },
  { index: 'peripheral', label: '外设状态', icon: ViewIcon },
  { index: 'fortune', label: '运势核对', icon: Opportunity },
]

const menuItems = computed<MenuItem[]>(() => [
  { index: 'devices', label: '设备资产管理', icon: Monitor },
  ...tabItems,
  ...(auth.isAdmin
    ? [
        { index: 'kb', label: '知识库运营', icon: Reading },
        { index: 'ops', label: 'Agent 运营指标', icon: Histogram },
      ]
    : []),
])

const activeMenu = computed(() => {
  if (route.path === '/kb') return 'kb'
  if (route.path === '/ops') return 'ops'
  if (route.path.startsWith('/devices/') && route.params.id) {
    return isDeviceTab(route.query.tab) ? route.query.tab : 'persona'
  }
  return 'devices'
})

const currentSectionName = computed(() => {
  const current = menuItems.value.find((m) => m.index === activeMenu.value)
  return current ? current.label : '控制台'
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
  if (index === 'ops') {
    router.push('/ops')
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

function signOut() {
  auth.signOut()
  ElMessage.info('已退出登录')
  router.replace('/login')
}
</script>

<template>
  <el-container class="shell">
    <!-- 左侧专属定制侧边栏 -->
    <el-aside width="240px" class="sidebar">
      <!-- 品牌标识区 -->
      <div class="brand" @click="router.push('/devices')">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#brand-star)" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="brand-star" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                <stop stop-color="#818cf8"/>
                <stop offset="1" stop-color="#4f46e5"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="brand-info">
          <span class="brand-title">AI Pet 管理台</span>
          <span class="brand-sub">守护星资产与运营平台</span>
        </div>
      </div>

      <!-- 菜单分组 -->
      <div class="menu-scroll">
        <div class="menu-section-label">设备与单机会话</div>
        <el-menu
          :key="activeMenu"
          :default-active="activeMenu"
          background-color="transparent"
          text-color="#94a3b8"
          active-text-color="#ffffff"
          @select="openMenu"
          class="custom-menu"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.index"
            :index="item.index"
            class="custom-menu-item"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-text">{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 侧边栏底部小智直通卡片 -->
      <div class="sidebar-footer" v-if="consoleUrl">
        <a :href="consoleUrl" target="_blank" class="xiaozhi-shortcut">
          <div class="shortcut-icon">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="shortcut-text">
            <strong>小智智控台</strong>
            <span>硬件 OTA 与模型编排</span>
          </div>
          <el-icon class="shortcut-arrow"><TopRight /></el-icon>
        </a>
      </div>
    </el-aside>

    <!-- 右侧主体内容容器 -->
    <el-container class="main-container">
      <!-- 现代化磨砂玻璃顶栏 -->
      <el-header class="topbar">
        <div class="topbar-left">
          <div class="breadcrumb-badge">
            <span class="status-dot online"></span>
            <span class="current-label">{{ currentSectionName }}</span>
          </div>
          <span class="divider">/</span>
          <span class="sub-text">AI Pet Operations</span>
        </div>

        <div class="topbar-right">
          <!-- 智控台外链徽章 -->
          <a v-if="consoleUrl" :href="consoleUrl" target="_blank" class="console-pill">
            <el-icon><Connection /></el-icon>
            <span>小智智控台</span>
            <el-icon class="external-icon"><TopRight /></el-icon>
          </a>

          <!-- 用户名与头像胶囊 -->
          <div class="user-profile">
            <div class="user-avatar">
              {{ (auth.user?.login_name || 'U').charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <span class="username">{{ auth.user?.login_name }}</span>
              <el-tag size="small" :type="auth.isAdmin ? 'danger' : 'info'" effect="plain" class="role-tag">
                {{ auth.isAdmin ? '管理员' : '运营人员' }}
              </el-tag>
            </div>
            <el-tooltip content="退出登录" placement="bottom">
              <el-button
                class="logout-btn"
                circle
                size="small"
                @click="signOut"
              >
                <el-icon><SwitchButton /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </el-header>

      <!-- 主视图区 -->
      <el-main class="content-body">
        <div class="view-wrapper">
          <RouterView />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background-color: var(--app-bg);
}

/* 侧边栏样式 */
.sidebar {
  background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%);
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
  z-index: 10;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.15);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.2s ease;
}

.brand:hover {
  background: rgba(255, 255, 255, 0.03);
}

.brand-logo {
  width: 40px;
  height: 40px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.3px;
}

.brand-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.menu-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #64748b;
  padding: 8px 12px 12px;
}

.custom-menu {
  border: none;
}

.custom-menu-item {
  height: 44px;
  line-height: 44px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
}

.custom-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  transform: translateX(2px);
}

.custom-menu-item.is-active {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
}

.menu-icon {
  font-size: 17px;
  margin-right: 10px;
}

.menu-text {
  letter-spacing: 0.2px;
}

.sidebar-footer {
  padding: 16px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.xiaozhi-shortcut {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 12px;
  border-radius: 10px;
  color: #cbd5e1;
  transition: all 0.2s ease;
}

.xiaozhi-shortcut:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  color: #ffffff;
}

.shortcut-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
}

.shortcut-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.shortcut-text strong {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.shortcut-text span {
  font-size: 10px;
  color: #94a3b8;
}

.shortcut-arrow {
  font-size: 14px;
  color: #818cf8;
}

/* 主内容区 */
.main-container {
  display: flex;
  flex-direction: column;
  background: var(--app-bg);
}

/* 顶栏 Header */
.topbar {
  height: 64px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 9;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.breadcrumb-badge {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.divider {
  color: #cbd5e1;
}

.sub-text {
  font-size: 13px;
  color: #64748b;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.console-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.console-pill:hover {
  background: #e0e7ff;
  transform: translateY(-1px);
}

.external-icon {
  font-size: 13px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 10px;
  border-left: 1px solid #e2e8f0;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
}

.user-details {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.role-tag {
  font-size: 10px;
  height: 18px;
  line-height: 18px;
  padding: 0 6px;
  margin-top: 2px;
}

.logout-btn {
  color: #64748b;
  border-color: #e2e8f0;
}

.logout-btn:hover {
  color: #f43f5e;
  border-color: #fecdd3;
  background-color: #fff1f2;
}

/* 内容主体 */
.content-body {
  padding: 24px 28px;
}

.view-wrapper {
  max-width: 1320px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .sidebar {
    width: 70px !important;
  }
  .brand-info,
  .menu-section-label,
  .menu-text,
  .shortcut-text,
  .shortcut-arrow,
  .sub-text,
  .divider,
  .user-details {
    display: none;
  }
  .brand {
    padding: 16px 12px;
    justify-content: center;
  }
  .topbar {
    padding: 0 16px;
  }
}
</style>
