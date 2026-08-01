<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listAdminDevices, lookupAdminDevice, type AdminDevice } from '../../api/adminDevices'

const router = useRouter()
const loading = ref(false)
const devices = ref<AdminDevice[]>([])
const query = ref('')

async function loadDevices() {
  loading.value = true
  try {
    devices.value = (await listAdminDevices({ q: query.value.trim() || undefined, limit: 100 })).data
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '设备资产加载失败，请重试')
  } finally { loading.value = false }
}

async function lookupDevice() {
  const deviceUid = query.value.trim()
  if (!deviceUid) return loadDevices()
  loading.value = true
  try {
    const device = (await lookupAdminDevice(deviceUid)).data
    devices.value = [device]
  } catch (error: any) {
    if (error.response?.status === 404) {
      devices.value = []
      ElMessage.info('未找到该设备核心 ID 对应的资产')
    } else ElMessage.error(error.response?.data?.detail || '设备查询失败，请重试')
  } finally { loading.value = false }
}

function formatTime(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无活跃记录' }
onMounted(loadDevices)
</script>

<template>
  <section>
    <div class="page-heading"><div><h1>设备资产管理</h1><p>查看全量设备资产；设备认领仍仅由用户端 binding_id 流程完成。</p></div></div>
    <el-alert title="管理员可查看和轮换绑定码，但不能修改设备的用户归属。" type="info" :closable="false" show-icon class="notice" />
    <el-form class="search" @submit.prevent="lookupDevice">
      <el-input v-model="query" placeholder="设备核心 ID（MAC/SN）可精确查询；也可搜索名称、绑定码或平台 ID" clearable @clear="loadDevices" />
      <el-button type="primary" :loading="loading" @click="lookupDevice">精确查询</el-button>
      <el-button :loading="loading" @click="loadDevices">搜索资产</el-button>
    </el-form>
    <el-table v-loading="loading" :data="devices" empty-text="暂无匹配设备资产" style="width: 100%">
      <el-table-column label="名称" min-width="150"><template #default="{ row }">{{ row.name || '未命名设备' }}</template></el-table-column>
      <el-table-column prop="device_uid" label="设备核心 ID" min-width="190" />
      <el-table-column prop="binding_id" label="绑定码" min-width="220" show-overflow-tooltip />
      <el-table-column label="认领" width="90"><template #default="{ row }"><el-tag :type="row.claimed ? 'success' : 'warning'">{{ row.claimed ? '已认领' : '未认领' }}</el-tag></template></el-table-column>
      <el-table-column label="在线" width="80"><template #default="{ row }"><el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? '在线' : '离线' }}</el-tag></template></el-table-column>
      <el-table-column label="最近活跃" min-width="175"><template #default="{ row }">{{ formatTime(row.last_seen_at) }}</template></el-table-column>
      <el-table-column label="操作" width="90"><template #default="{ row }"><el-button link type="primary" @click="router.push(`/devices/${row.id}`)">详情</el-button></template></el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.page-heading { margin-bottom: 20px; }.page-heading h1 { margin: 0 0 6px; }.page-heading p { margin: 0; color: #6b7280; }.notice { margin-bottom: 16px; }.search { display: flex; gap: 12px; margin-bottom: 16px; }.search .el-input { max-width: 620px; }
@media (max-width: 680px) { .search { flex-wrap: wrap; }.search .el-input { max-width: none; width: 100%; } }
</style>
