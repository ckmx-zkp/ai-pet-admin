<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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

async function loadDevices(nextOffset = offset.value) {
  lookupMode.value = false
  loading.value = true
  loadError.value = ''
  try {
    const result = (await listAdminDevices({ q: query.value.trim() || undefined, limit: pageSize, offset: nextOffset })).data
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

function notifyNeedDevice() {
  if (route.query.needDevice === '1') ElMessage.warning('请先在列表中打开一台设备，再查看人设、历史、记忆或分析')
}

onMounted(() => {
  loadDevices(0)
  notifyNeedDevice()
})
watch(() => route.query.needDevice, notifyNeedDevice)
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <h1>设备资产管理</h1>
        <p>查看全量设备资产；人设、历史、记忆、分析与外设需先点进一台设备。设备认领仍仅由用户端 binding_id 完成。</p>
      </div>
    </div>
    <el-alert title="管理员可查看和轮换绑定码，但不能修改设备的用户归属。" type="info" :closable="false" show-icon class="notice" />
    <el-form class="search" @submit.prevent="lookupDevice">
      <el-input v-model="query" placeholder="设备核心 ID（MAC/SN）可精确查询；也可搜索名称、绑定码或平台 ID" clearable @clear="loadDevices(0)" />
      <el-button type="primary" :loading="loading" @click="lookupDevice">精确查询</el-button>
      <el-button :loading="loading" @click="loadDevices(0)">搜索资产</el-button>
    </el-form>
    <el-table v-loading="loading" :data="devices" empty-text=" " style="width: 100%">
      <el-table-column label="名称" min-width="150">
        <template #default="{ row }">{{ row.name || '未命名设备' }}</template>
      </el-table-column>
      <el-table-column prop="device_uid" label="设备核心 ID" min-width="190" />
      <el-table-column prop="binding_id" label="绑定码" min-width="220" show-overflow-tooltip />
      <el-table-column label="认领" width="90">
        <template #default="{ row }">
          <el-tag :type="row.claimed ? 'success' : 'warning'">{{ row.claimed ? '已认领' : '未认领' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="在线" width="80">
        <template #default="{ row }">
          <el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? '在线' : '离线' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近活跃" min-width="175">
        <template #default="{ row }">{{ formatDateTime(row.last_seen_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/devices/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <PageEmpty
      v-if="!loading && !devices.length"
      :description="loadError || '暂无匹配设备资产'"
      retry-label="重新加载"
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
  </section>
</template>

<style scoped>
.page-heading { margin-bottom: 20px; }
.page-heading h1 { margin: 0 0 6px; }
.page-heading p { margin: 0; color: #6b7280; }
.notice { margin-bottom: 16px; }
.search { display: flex; gap: 12px; margin-bottom: 16px; }
.search .el-input { max-width: 620px; }
@media (max-width: 680px) {
  .search { flex-wrap: wrap; }
  .search .el-input { max-width: none; width: 100%; }
}
</style>
