<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOpsMetrics, type OpsMetrics } from '../../api/adminDevices'
import PageEmpty from '../../components/PageEmpty.vue'
import { requestErrorMessage } from '../../utils/feedback'

const loading = ref(false)
const error = ref('')
const metrics = ref<OpsMetrics>()

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
  return Object.entries(metrics.last_24h_by_kind).map(([kind, byStatus]) => ({ kind, byStatus }))
}

onMounted(load)
</script>

<template>
  <section>
    <el-page-header content="运营指标" />
    <el-card class="ops-card" shadow="never">
      <template #header>
        <div class="card-header">
          <strong>Agent Worker 任务概览</strong>
          <el-button :loading="loading" @click="load">刷新</el-button>
        </div>
      </template>
      <el-skeleton v-if="loading && !metrics" :rows="4" animated />
      <PageEmpty v-else-if="!metrics" :description="error || '暂无数据'" retry-label="重新加载" @retry="load" />
      <template v-else>
        <el-alert
          title="仅任务计数与 kind 分组，不含对话原文；近 24 小时窗口。"
          type="info"
          :closable="false"
          show-icon
          class="tab-notice"
        />
        <div class="summary">
          <el-statistic title="待处理（pending）" :value="metrics.pending" />
          <el-statistic title="失败（failed，累计）" :value="metrics.failed" />
        </div>
        <el-table :data="kindRows(metrics)" empty-text="近 24 小时无任务">
          <el-table-column prop="kind" label="任务类型" min-width="180" />
          <el-table-column label="按状态计数" min-width="360">
            <template #default="{ row }">
              <el-tag
                v-for="(count, status) in row.byStatus"
                :key="status"
                :type="status === 'failed' ? 'danger' : status === 'done' ? 'success' : 'warning'"
                class="chip"
              >
                {{ status }}: {{ count }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-card>
  </section>
</template>

<style scoped>
.ops-card { max-width: 920px; margin-top: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.tab-notice { margin-bottom: 16px; }
.summary { display: flex; gap: 40px; margin-bottom: 20px; }
.chip { margin: 2px 6px 2px 0; }
</style>
