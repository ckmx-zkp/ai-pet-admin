<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Histogram,
  Refresh,
  Clock,
  Warning,
  CircleCheck,
  Timer,
  InfoFilled,
} from '@element-plus/icons-vue'
import { getOpsMetrics, type OpsMetrics } from '../../api/adminDevices'
import PageEmpty from '../../components/PageEmpty.vue'
import { requestErrorMessage } from '../../utils/feedback'

const loading = ref(false)
const error = ref('')
const metrics = ref<OpsMetrics>()

const kindChineseLabels: Record<string, string> = {
  daily_summary: '每日小记摘要 (daily_summary)',
  persona_growth: '人设成长演化 (persona_growth)',
  memory_profile: '长期记忆画像 (memory_profile)',
  relationship_update: '相处亲密关系推断 (relationship_update)',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    metrics.value = (await getOpsMetrics()).data
  } catch (err: unknown) {
    error.value = requestErrorMessage(err, '运营指标加载失败')
  } finally {
    loading.value = false
  }
}

function kindRows(metrics: OpsMetrics) {
  return Object.entries(metrics.last_24h_by_kind).map(([kind, byStatus]) => ({
    kind,
    label: kindChineseLabels[kind] || kind,
    byStatus,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
  }))
}

onMounted(load)
</script>

<template>
  <section class="ops-page">
    <div class="header-section">
      <div>
        <h1 class="page-title">Agent Worker 运营指标</h1>
        <p class="page-subtitle">监控后台异步任务队列、近 24 小时分析生成吞吐与异常统计</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="load" size="large">
        刷新指标
      </el-button>
    </div>

    <el-skeleton v-if="loading && !metrics" :rows="5" animated class="loading-box" />
    <PageEmpty v-else-if="!metrics" :description="error || '暂无运营监控数据'" retry-label="重新加载" @retry="load" />

    <template v-else>
      <!-- 顶部指标数据面板 -->
      <div class="metrics-grid">
        <div class="metric-card yellow">
          <div class="card-left">
            <span class="m-label">队列待处理任务 (Pending)</span>
            <span class="m-value">{{ metrics.pending }}</span>
            <span class="m-sub">基于 PG SKIP LOCKED 消费循环</span>
          </div>
          <div class="card-icon-box yellow">
            <el-icon><Timer /></el-icon>
          </div>
        </div>

        <div class="metric-card red">
          <div class="card-left">
            <span class="m-label">累计失败任务 (Failed)</span>
            <span class="m-value text-danger">{{ metrics.failed }}</span>
            <span class="m-sub">已进入重试或异常隔离</span>
          </div>
          <div class="card-icon-box red">
            <el-icon><Warning /></el-icon>
          </div>
        </div>

        <div class="metric-card blue">
          <div class="card-left">
            <span class="m-label">统计窗口范围</span>
            <span class="m-value font-18">近 24 小时</span>
            <span class="m-sub">数据隔离脱敏，不含会话原文</span>
          </div>
          <div class="card-icon-box blue">
            <el-icon><Histogram /></el-icon>
          </div>
        </div>
      </div>

      <!-- 提示卡片 -->
      <div class="notice-card">
        <el-icon class="notice-icon"><InfoFilled /></el-icon>
        <div class="notice-text">
          <strong>数据合规说明：</strong>
          运营指标统计严格遵守脱敏红线，仅聚合任务类型（kind）与执行状态（status）频次，不涉及用户对话内容。
        </div>
      </div>

      <!-- 任务类型分组表格卡片 -->
      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="table-card-header">
            <strong>近 24 小时任务类型吞吐明细</strong>
            <span class="total-types">共 {{ Object.keys(metrics.last_24h_by_kind).length }} 类 Worker 任务</span>
          </div>
        </template>

        <el-table :data="kindRows(metrics)" empty-text="近 24 小时内暂无执行任务" style="width: 100%">
          <el-table-column label="Worker 任务类型" min-width="260">
            <template #default="{ row }">
              <div class="kind-cell">
                <strong>{{ row.label }}</strong>
                <code class="kind-code">{{ row.kind }}</code>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="24h 产出总量" width="130">
            <template #default="{ row }">
              <span class="total-badge">{{ row.total }} 次</span>
            </template>
          </el-table-column>

          <el-table-column label="执行状态分布" min-width="360">
            <template #default="{ row }">
              <div class="chips-group">
                <el-tag
                  v-for="(count, status) in row.byStatus"
                  :key="status"
                  :type="status === 'failed' ? 'danger' : status === 'done' ? 'success' : 'warning'"
                  effect="light"
                  class="status-chip"
                >
                  <span class="chip-status">{{ status }}:</span>
                  <strong class="chip-count">{{ count }}</strong>
                </el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </section>
</template>

<style scoped>
.ops-page {
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

.loading-box {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
}

/* 指标卡片网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--card-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.card-left {
  display: flex;
  flex-direction: column;
}

.m-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.m-value {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  margin: 4px 0;
  line-height: 1.1;
}

.m-value.font-18 {
  font-size: 24px;
}

.text-danger {
  color: #f43f5e;
}

.m-sub {
  font-size: 11px;
  color: #94a3b8;
}

.card-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.card-icon-box.yellow {
  background: #fffbeb;
  color: #f59e0b;
}

.card-icon-box.red {
  background: #fff1f2;
  color: #f43f5e;
}

.card-icon-box.blue {
  background: #eef2ff;
  color: #4f46e5;
}

/* 提示卡片 */
.notice-card {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #0369a1;
  font-size: 13px;
}

.notice-icon {
  font-size: 18px;
  color: #0284c7;
}

.notice-text strong {
  font-weight: 600;
}

/* 表格卡片 */
.table-card {
  border-radius: 14px;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-types {
  font-size: 12px;
  color: #64748b;
}

.kind-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kind-cell strong {
  font-size: 14px;
  color: #1e293b;
}

.kind-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
}

.total-badge {
  font-weight: 700;
  color: #4f46e5;
  font-size: 14px;
}

.chips-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-chip {
  padding: 4px 10px;
  border-radius: 6px;
}

.chip-status {
  margin-right: 4px;
}

.chip-count {
  font-weight: 700;
}

@media (max-width: 860px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
