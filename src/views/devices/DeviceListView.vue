<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  Aim,
  Refresh,
  CopyDocument,
  ArrowRight,
  Cpu,
  CircleCheck,
  Connection,
  InfoFilled,
  Grid,
  Menu,
  Clock,
  Key,
  UserFilled,
  ChatDotRound,
  Collection
} from '@element-plus/icons-vue'
import { listAdminDevices, lookupAdminDevice, type AdminDevice } from '../../api/adminDevices'
import OffsetPager from '../../components/OffsetPager.vue'
import PageEmpty from '../../components/PageEmpty.vue'
import { formatDateTime, requestErrorMessage } from '../../utils/feedback'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const loadError = ref('')
const devices = ref<AdminDevice[]>([])
const query = ref('')
const offset = ref(0)
const pageSize = 20
const hasMore = ref(false)
const lookupMode = ref(false)
const viewMode = ref<'cards' | 'table'>('cards')

// 概览统计指标
const stats = computed(() => {
  const total = devices.value.length
  const claimed = devices.value.filter((d) => d.claimed).length
  const online = devices.value.filter((d) => d.online).length
  const offline = total - online
  return { total, claimed, online, offline }
})

async function loadDevices(nextOffset = offset.value) {
  lookupMode.value = false
  loading.value = true
  loadError.value = ''
  try {
    const result = (
      await listAdminDevices({
        q: query.value.trim() || undefined,
        limit: pageSize,
        offset: nextOffset
      })
    ).data
    devices.value = result
    offset.value = nextOffset
    hasMore.value = result.length === pageSize
  } catch (error: unknown) {
    loadError.value = requestErrorMessage(error, '设备资产加载失败，请重试')
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

async function lookupDevice() {
  const deviceUid = query.value.trim()
  if (!deviceUid) return loadDevices(0)
  lookupMode.value = true
  loading.value = true
  loadError.value = ''
  try {
    devices.value = [(await lookupAdminDevice(deviceUid)).data]
    offset.value = 0
    hasMore.value = false
  } catch (error: unknown) {
    devices.value = []
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      loadError.value = ''
      ElMessage.info('未找到该设备核心 ID 对应的资产')
    } else {
      loadError.value = requestErrorMessage(error, '设备查询失败，请重试')
      ElMessage.error(loadError.value)
    }
  } finally {
    loading.value = false
  }
}

async function copyText(text: string, label = '内容') {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

function goToDevice(id: number, tab?: string) {
  router.push(tab ? `/devices/${id}?tab=${tab}` : `/devices/${id}`)
}

function notifyNeedDevice() {
  if (route.query.needDevice === '1') {
    ElMessage.warning('请先在列表中点击打开一台设备，再查看对应的人设、历史或分析')
  }
}

onMounted(() => {
  loadDevices(0)
  notifyNeedDevice()
})
watch(() => route.query.needDevice, notifyNeedDevice)
</script>

<template>
  <section class="device-page">
    <!-- 顶栏标题与统计概览 -->
    <div class="header-section">
      <div>
        <h1 class="page-title">设备资产管理</h1>
        <p class="page-subtitle">
          监控全量 AI 宠物硬件资产状态、查询 Binding ID 与进行底层硬件诊断
        </p>
      </div>
      <!-- 视图切换器 -->
      <div class="view-toggle-group">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="cards">
            <el-icon><Grid /></el-icon>
            <span class="btn-text">独立卡片流</span>
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><Menu /></el-icon>
            <span class="btn-text">精简表格</span>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 顶部资产统计微卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon-box blue">
          <el-icon><Cpu /></el-icon>
        </div>
        <div class="stat-meta">
          <span class="stat-label">当前分页资产数</span>
          <span class="stat-val">{{ stats.total }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-box green">
          <el-icon><Connection /></el-icon>
        </div>
        <div class="stat-meta">
          <span class="stat-label">实时在线设备</span>
          <span class="stat-val text-green">{{ stats.online }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-box purple">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="stat-meta">
          <span class="stat-label">已被主人认领</span>
          <span class="stat-val text-purple">{{ stats.claimed }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-box gray">
          <el-icon><Cpu /></el-icon>
        </div>
        <div class="stat-meta">
          <span class="stat-label">休眠/离线设备</span>
          <span class="stat-val text-gray">{{ stats.offline }}</span>
        </div>
      </div>
    </div>

    <!-- 提示卡片 -->
    <div class="notice-card">
      <el-icon class="notice-icon"><InfoFilled /></el-icon>
      <div class="notice-text">
        <strong>架构红线说明：</strong>
        管理端仅供资产排障诊断与 Binding ID 轮换；设备用户归属只允许由用户端凭有效 Binding ID 自主认领。
      </div>
    </div>

    <!-- 检索工具栏 -->
    <el-card class="filter-card" shadow="never">
      <el-form class="search-form" @submit.prevent="lookupDevice">
        <div class="search-inputs">
          <el-input
            v-model="query"
            placeholder="输入设备核心 ID（MAC / SN）、设备名或绑定码..."
            size="large"
            :prefix-icon="Search"
            clearable
            @clear="loadDevices(0)"
            class="main-search-input"
          />
        </div>
        <div class="search-buttons">
          <el-button
            type="primary"
            size="large"
            :icon="Aim"
            :loading="loading"
            @click="lookupDevice"
          >
            MAC精确反查
          </el-button>
          <el-button
            size="large"
            :icon="Search"
            :loading="loading"
            @click="loadDevices(0)"
          >
            模糊搜索
          </el-button>
          <el-button
            size="large"
            :icon="Refresh"
            @click="() => { query = ''; loadDevices(0); }"
          >
            重置
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 视图模式 A：独立设备卡片流 (Card Grid) -->
    <div v-if="viewMode === 'cards'" v-loading="loading" class="devices-grid-wrapper">
      <div v-if="devices.length" class="devices-card-grid">
        <div
          v-for="device in devices"
          :key="device.id"
          class="device-card"
          :class="{ 'is-online': device.online }"
        >
          <!-- 卡片头部：图标、名称与状态指示 -->
          <div class="dcard-header">
            <div class="dcard-title-group">
              <div class="dcard-avatar">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="dcard-names">
                <div class="name-row">
                  <h3 class="device-name-text">{{ device.name || '未命名守护星' }}</h3>
                  <span class="device-id-badge">#{{ device.id }}</span>
                </div>
                <div class="mac-pill" @click="copyText(device.device_uid, '设备 MAC')">
                  <code>{{ device.device_uid }}</code>
                  <el-icon class="copy-mac-icon"><CopyDocument /></el-icon>
                </div>
              </div>
            </div>

            <!-- 在线与认领状态徽章 -->
            <div class="dcard-status-box">
              <div class="status-indicator">
                <span class="status-dot" :class="device.online ? 'online' : 'offline'"></span>
                <span :class="device.online ? 'text-green' : 'text-gray'" class="status-text">
                  {{ device.online ? '在线' : '离线' }}
                </span>
              </div>
              <el-tag
                :type="device.claimed ? 'success' : 'warning'"
                size="small"
                effect="light"
                round
                class="claim-badge"
              >
                {{ device.claimed ? '已认领' : '待认领' }}
              </el-tag>
            </div>
          </div>

          <!-- 卡片中段：Binding ID 专属高亮面板 -->
          <div class="dcard-binding-box">
            <div class="binding-head">
              <span class="binding-title">
                <el-icon><Key /></el-icon>
                <span>认领凭证 (Binding ID)</span>
              </span>
              <el-tooltip content="点击一键复制绑定码" placement="top">
                <el-button
                  type="primary"
                  link
                  size="small"
                  :icon="CopyDocument"
                  @click.stop="copyText(device.binding_id, '绑定码')"
                >
                  复制
                </el-button>
              </el-tooltip>
            </div>
            <div class="binding-code-display">
              <code>{{ device.binding_id }}</code>
            </div>
          </div>

          <!-- 卡片元数据信息：心跳、固件、能力 -->
          <div class="dcard-meta-list">
            <div class="meta-row">
              <span class="meta-k"><el-icon><Clock /></el-icon> 最近心跳</span>
              <span class="meta-v">{{ formatDateTime(device.last_seen_at) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-k"><el-icon><Connection /></el-icon> 固件版本</span>
              <el-tag size="small" type="info">{{ device.firmware_version || '未上报' }}</el-tag>
            </div>
            <div class="meta-row capabilities-row">
              <span class="meta-k">外设能力</span>
              <div class="cap-pill-group">
                <template v-if="Object.keys(device.capabilities || {}).length">
                  <el-tag
                    v-for="(val, k) in device.capabilities"
                    :key="k"
                    size="small"
                    effect="plain"
                    class="cap-pill"
                  >
                    {{ k }}
                  </el-tag>
                </template>
                <span v-else class="text-muted font-12">暂无上报</span>
              </div>
            </div>
          </div>

          <!-- 卡片底部快捷操作 -->
          <div class="dcard-actions">
            <div class="quick-tabs">
              <span class="quick-link" @click="goToDevice(device.id, 'persona')">
                <el-icon><UserFilled /></el-icon> 人设
              </span>
              <span class="quick-link" @click="goToDevice(device.id, 'messages')">
                <el-icon><ChatDotRound /></el-icon> 历史
              </span>
              <span class="quick-link" @click="goToDevice(device.id, 'memories')">
                <el-icon><Collection /></el-icon> 记忆
              </span>
            </div>

            <el-button
              type="primary"
              class="primary-action-btn"
              @click="goToDevice(device.id)"
            >
              <span>诊断与详情</span>
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <PageEmpty
        v-if="!loading && !devices.length"
        :description="loadError || '暂无匹配的设备资产数据'"
        retry-label="刷新资产列表"
        @retry="lookupMode ? lookupDevice() : loadDevices(offset)"
      />

      <OffsetPager
        v-if="!lookupMode && (devices.length || offset > 0)"
        :offset="offset"
        :page-size="pageSize"
        :has-more="hasMore"
        :loading="loading"
        @change="loadDevices"
      />
    </div>

    <!-- 视图模式 B：表格视图 (Table Grid) -->
    <el-card v-else class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="devices"
        empty-text=" "
        style="width: 100%"
        class="custom-table"
      >
        <el-table-column label="设备信息" min-width="180">
          <template #default="{ row }">
            <div class="device-cell">
              <div class="device-avatar">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="device-names">
                <strong class="device-title">{{ row.name || '未命名守护星' }}</strong>
                <span class="device-id-sub">ID: {{ row.id }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="设备核心 ID (MAC)" min-width="190">
          <template #default="{ row }">
            <span class="mono-code">{{ row.device_uid }}</span>
          </template>
        </el-table-column>

        <el-table-column label="当前绑定码 (Binding ID)" min-width="240">
          <template #default="{ row }">
            <div class="binding-pill" @click="copyText(row.binding_id, '绑定码')">
              <span class="mono-binding">{{ row.binding_id }}</span>
              <el-icon class="copy-btn-icon"><CopyDocument /></el-icon>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="在线状态" width="120">
          <template #default="{ row }">
            <div class="status-indicator">
              <span class="status-dot" :class="row.online ? 'online' : 'offline'"></span>
              <span :class="row.online ? 'text-green font-medium' : 'text-gray'">
                {{ row.online ? '实时在线' : '休眠离线' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="认领归属" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.claimed ? 'success' : 'warning'"
              effect="light"
              round
              class="claim-tag"
            >
              {{ row.claimed ? '已认领' : '待认领' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="最近心跳" min-width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.last_seen_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="管理操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              plain
              class="action-btn"
              @click="router.push(`/devices/${row.id}`)"
            >
              <span>诊断</span>
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <PageEmpty
        v-if="!loading && !devices.length"
        :description="loadError || '暂无匹配的设备资产数据'"
        retry-label="刷新资产列表"
        @retry="lookupMode ? lookupDevice() : loadDevices(offset)"
      />

      <OffsetPager
        v-if="!lookupMode && (devices.length || offset > 0)"
        :offset="offset"
        :page-size="pageSize"
        :has-more="hasMore"
        :loading="loading"
        @change="loadDevices"
      />
    </el-card>
  </section>
</template>

<style scoped>
.device-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.view-toggle-group .btn-text {
  margin-left: 6px;
  font-size: 13px;
}

/* 统计微卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: var(--card-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon-box.blue {
  background: #eef2ff;
  color: #4f46e5;
}

.stat-icon-box.green {
  background: #ecfdf5;
  color: #10b981;
}

.stat-icon-box.purple {
  background: #f5f3ff;
  color: #8b5cf6;
}

.stat-icon-box.gray {
  background: #f1f5f9;
  color: #64748b;
}

.stat-meta {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.stat-val {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.text-green {
  color: #10b981;
}

.text-purple {
  color: #8b5cf6;
}

.text-gray {
  color: #64748b;
}

.font-medium {
  font-weight: 500;
}

.font-12 {
  font-size: 12px;
}

/* 提示卡片 */
.notice-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #166534;
  font-size: 13px;
}

.notice-icon {
  font-size: 18px;
  color: #16a34a;
}

.notice-text strong {
  font-weight: 600;
}

/* 搜索筛选栏 */
.filter-card {
  border-radius: 12px;
}

.search-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-inputs {
  flex: 1;
}

.main-search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.search-buttons {
  display: flex;
  gap: 10px;
}

/* ================= 独立设备卡片流 (Card Grid) ================= */
.devices-grid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.devices-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.device-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--card-shadow);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.device-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05);
  border-color: #cbd5e1;
}

.device-card.is-online {
  border-top: 3px solid #10b981;
}

/* 卡片头部 */
.dcard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.dcard-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dcard-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.dcard-names {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-name-text {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
}

.device-id-badge {
  font-size: 11px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.mac-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  width: fit-content;
  transition: background 0.2s ease;
}

.mac-pill:hover {
  background: #e2e8f0;
}

.mac-pill code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  color: #475569;
}

.copy-mac-icon {
  font-size: 12px;
  color: #64748b;
}

.dcard-status-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-text {
  font-size: 12px;
}

.claim-badge {
  font-size: 11px;
  font-weight: 500;
}

/* Binding ID 专属展示框 */
.dcard-binding-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.binding-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.binding-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.binding-code-display code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #4f46e5;
  letter-spacing: 0.5px;
}

/* 元数据列表 */
.dcard-meta-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.meta-k {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
}

.meta-v {
  color: #1e293b;
  font-weight: 500;
}

.capabilities-row {
  align-items: flex-start;
}

.cap-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  max-width: 65%;
}

.cap-pill {
  font-size: 10px;
  height: 20px;
  line-height: 20px;
}

/* 卡片操作区 */
.dcard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #f1f5f9;
  padding-top: 14px;
  margin-top: auto;
}

.quick-tabs {
  display: flex;
  gap: 8px;
}

.quick-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-link:hover {
  background: #e0e7ff;
  color: #4f46e5;
}

.primary-action-btn {
  border-radius: 8px;
  font-size: 13px;
  padding: 8px 16px;
}

/* 表格定制 */
.table-card {
  border-radius: 12px;
}

.custom-table {
  border-radius: 8px;
}

.device-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-avatar {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.device-names {
  display: flex;
  flex-direction: column;
}

.device-title {
  font-size: 14px;
  color: #0f172a;
  font-weight: 600;
}

.device-id-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.mono-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
  color: #334155;
}

.binding-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.binding-pill:hover {
  background: #eef2ff;
  border-color: #818cf8;
}

.binding-pill:hover .copy-btn-icon {
  color: #4f46e5;
}

.mono-binding {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
  color: #1e293b;
  font-weight: 500;
}

.copy-btn-icon {
  font-size: 13px;
  color: #94a3b8;
}

.claim-tag {
  font-weight: 500;
  font-size: 12px;
}

.time-text {
  font-size: 12px;
  color: #64748b;
}

.action-btn {
  border-radius: 6px;
}

@media (max-width: 960px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .search-form {
    flex-direction: column;
    align-items: stretch;
  }
  .search-buttons {
    flex-wrap: wrap;
  }
  .devices-card-grid {
    grid-template-columns: 1fr;
  }
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
