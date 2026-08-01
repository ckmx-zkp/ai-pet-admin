<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { bindDevice, listDevices, type Device } from '../../api/devices'

const router = useRouter()
const loading = ref(false)
const unavailable = ref(false)
const devices = ref<Device[]>([])
const bindVisible = ref(false)
const binding = ref(false)
const bindFormRef = ref<FormInstance>()
const bindForm = reactive({ device_uid: '', name: '' })
const bindRules: FormRules = {
  device_uid: [
    { required: true, message: '请输入设备标识（MAC 或 UUID）', trigger: 'blur' },
    { min: 4, max: 64, message: '设备标识长度为 4–64 位', trigger: 'blur' },
  ],
  name: [{ max: 128, message: '设备名称最多 128 个字符', trigger: 'blur' }],
}

async function loadDevices() {
  loading.value = true; unavailable.value = false
  try { devices.value = (await listDevices()).data }
  catch (error: any) {
    unavailable.value = error.response?.status === 501
    if (!unavailable.value) ElMessage.error(error.response?.data?.detail || '设备列表加载失败，请重试')
  }
  finally { loading.value = false }
}

function openBindDialog() {
  bindForm.device_uid = ''
  bindForm.name = ''
  bindVisible.value = true
}

async function submitBind() {
  if (!bindFormRef.value || !(await bindFormRef.value.validate().catch(() => false))) return
  binding.value = true
  try {
    await bindDevice({
      device_uid: bindForm.device_uid.trim(),
      ...(bindForm.name.trim() ? { name: bindForm.name.trim() } : {}),
    })
    ElMessage.success('设备绑定成功')
    bindVisible.value = false
    await loadDevices()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '设备绑定失败，请重试')
  } finally { binding.value = false }
}

function formatLastSeen(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无活跃记录'
}
onMounted(loadDevices)
</script>

<template>
  <section>
    <div class="page-heading">
      <div><h1>设备管理</h1><p>绑定并管理你的 AI Pet 设备。</p></div>
      <div class="header-actions">
        <el-button :loading="loading" @click="loadDevices">刷新</el-button>
        <el-button type="primary" @click="openBindDialog">绑定设备</el-button>
      </div>
    </div>
    <el-alert v-if="unavailable" title="设备接口正在接入，页面骨架已准备完成。" type="info" :closable="false" show-icon class="notice" />
    <el-table v-loading="loading" :data="devices" empty-text="暂无已绑定设备" style="width: 100%">
      <el-table-column label="名称" min-width="150"><template #default="{ row }">{{ row.name || '未命名设备' }}</template></el-table-column>
      <el-table-column prop="device_uid" label="设备标识" min-width="200" />
      <el-table-column label="在线状态" width="120"><template #default="{ row }"><el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? '在线' : '离线' }}</el-tag></template></el-table-column>
      <el-table-column label="最近活跃" min-width="180"><template #default="{ row }">{{ formatLastSeen(row.last_seen_at) }}</template></el-table-column>
      <el-table-column label="固件版本" width="140"><template #default="{ row }">{{ row.firmware_version || '未上报' }}</template></el-table-column>
      <el-table-column label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="router.push(`/devices/${row.id}`)">详情</el-button></template></el-table-column>
    </el-table>

    <el-dialog v-model="bindVisible" title="绑定设备" width="min(92vw, 460px)" :close-on-click-modal="!binding">
      <el-form ref="bindFormRef" :model="bindForm" :rules="bindRules" label-position="top" @submit.prevent="submitBind">
        <el-form-item label="设备标识" prop="device_uid"><el-input v-model="bindForm.device_uid" placeholder="例如 aa:bb:cc:dd:ee:ff" autocomplete="off" /></el-form-item>
        <el-form-item label="设备名称" prop="name"><el-input v-model="bindForm.name" placeholder="可选，例如客厅的小宠物" autocomplete="off" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="binding" @click="bindVisible = false">取消</el-button><el-button type="primary" :loading="binding" @click="submitBind">确认绑定</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.page-heading h1 { margin: 0 0 6px; }.page-heading p { margin: 0; color: #6b7280; }.notice { margin-bottom: 16px; }
.header-actions { display: flex; gap: 12px; flex-shrink: 0; }
@media (max-width: 560px) { .page-heading { align-items: flex-start; flex-direction: column; }.header-actions { width: 100%; }.header-actions .el-button { flex: 1; } }
</style>
