<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listDevices, type Device } from '../../api/devices'

const router = useRouter()
const loading = ref(false)
const unavailable = ref(false)
const devices = ref<Device[]>([])

async function loadDevices() {
  loading.value = true; unavailable.value = false
  try { devices.value = (await listDevices()).data }
  catch (error: any) {
    unavailable.value = error.response?.status === 501
    if (!unavailable.value) ElMessage.error(error.response?.data?.detail || '设备列表加载失败，请重试')
  }
  finally { loading.value = false }
}

function formatLastSeen(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无活跃记录'
}
onMounted(loadDevices)
</script>

<template>
  <section>
    <div class="page-heading">
      <div><h1>设备管理</h1><p>查看当前账号已关联的 AI Pet 设备。</p></div>
      <div class="header-actions">
        <el-button :loading="loading" @click="loadDevices">刷新</el-button>
      </div>
    </div>
    <el-alert title="设备认领由用户端使用 binding_id 完成；管理端资产诊断接口正在接入。" type="info" :closable="false" show-icon class="notice" />
    <el-alert v-if="unavailable" title="设备接口正在接入，页面骨架已准备完成。" type="info" :closable="false" show-icon class="notice" />
    <el-table v-loading="loading" :data="devices" empty-text="暂无已绑定设备" style="width: 100%">
      <el-table-column label="名称" min-width="150"><template #default="{ row }">{{ row.name || '未命名设备' }}</template></el-table-column>
      <el-table-column prop="device_uid" label="设备标识" min-width="200" />
      <el-table-column label="在线状态" width="120"><template #default="{ row }"><el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? '在线' : '离线' }}</el-tag></template></el-table-column>
      <el-table-column label="最近活跃" min-width="180"><template #default="{ row }">{{ formatLastSeen(row.last_seen_at) }}</template></el-table-column>
      <el-table-column label="固件版本" width="140"><template #default="{ row }">{{ row.firmware_version || '未上报' }}</template></el-table-column>
      <el-table-column label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="router.push(`/devices/${row.id}`)">详情</el-button></template></el-table-column>
    </el-table>

  </section>
</template>

<style scoped>
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.page-heading h1 { margin: 0 0 6px; }.page-heading p { margin: 0; color: #6b7280; }.notice { margin-bottom: 16px; }
.header-actions { display: flex; gap: 12px; flex-shrink: 0; }
@media (max-width: 560px) { .page-heading { align-items: flex-start; flex-direction: column; }.header-actions { width: 100%; }.header-actions .el-button { flex: 1; } }
</style>
