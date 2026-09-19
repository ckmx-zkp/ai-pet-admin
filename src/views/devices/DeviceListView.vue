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
  InfoFilled
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

    <!-- 设备表格卡片 -->
    <el-card class="table-card" shadow="never">
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

.status-indicator {
  display: flex;
  align-items: center;
  font-size: 13px;
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
}
</style>
