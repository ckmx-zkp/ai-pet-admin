<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listDevices, type Device } from '../../api/devices'

const router = useRouter()
const loading = ref(false)
const unavailable = ref(false)
const devices = ref<Device[]>([])

async function loadDevices() {
  loading.value = true; unavailable.value = false
  try { devices.value = (await listDevices()).data }
  catch (error: any) { unavailable.value = error.response?.status === 501 }
  finally { loading.value = false }
}
onMounted(loadDevices)
</script>

<template>
  <section><div class="page-heading"><div><h1>设备管理</h1><p>查看已绑定的 AI Pet 设备与能力信息。</p></div><el-button :loading="loading" @click="loadDevices">刷新</el-button></div>
    <el-alert v-if="unavailable" title="设备接口正在接入，页面骨架已准备完成。" type="info" :closable="false" show-icon class="notice" />
    <el-table v-loading="loading" :data="devices" empty-text="暂无已绑定设备" style="width: 100%"><el-table-column prop="name" label="名称" min-width="150" /><el-table-column prop="device_uid" label="设备标识" min-width="200" /><el-table-column prop="status" label="在线状态" width="120" /><el-table-column prop="firmware_version" label="固件版本" width="140" /><el-table-column label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="router.push(`/devices/${row.id}`)">详情</el-button></template></el-table-column></el-table>
  </section>
</template>

<style scoped>.page-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }.page-heading h1 { margin: 0 0 6px; }.page-heading p { margin: 0; color: #6b7280; }.notice { margin-bottom: 16px; }</style>
