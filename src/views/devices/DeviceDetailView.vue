<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getDevice, renameDevice, unbindDevice, type Device } from '../../api/devices'

const props = defineProps<{ id: string }>()
const router = useRouter()
const loading = ref(false)
const device = ref<Device>()
const renameVisible = ref(false)
const renaming = ref(false)
const renameFormRef = ref<FormInstance>()
const renameForm = reactive({ name: '' })
const renameRules: FormRules = { name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }, { max: 128, message: '设备名称最多 128 个字符', trigger: 'blur' }] }

async function loadDevice() {
  loading.value = true
  try { device.value = (await getDevice(props.id)).data }
  catch (error: any) {
    ElMessage.error(error.response?.status === 404 ? '设备不存在或无权访问' : error.response?.data?.detail || '设备详情加载失败，请重试')
  } finally { loading.value = false }
}

function openRenameDialog() {
  renameForm.name = device.value?.name || ''
  renameVisible.value = true
}

async function submitRename() {
  if (!renameFormRef.value || !(await renameFormRef.value.validate().catch(() => false))) return
  renaming.value = true
  try {
    device.value = (await renameDevice(props.id, { name: renameForm.name.trim() })).data
    renameVisible.value = false
    ElMessage.success('设备名称已更新')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '设备改名失败，请重试')
  } finally { renaming.value = false }
}

async function confirmUnbind() {
  if (!device.value) return
  try {
    await ElMessageBox.confirm(`解绑后将保留“${device.value.name || device.value.device_uid}”的历史数据，之后可重新绑定。`, '确认解绑设备', { confirmButtonText: '确认解绑', cancelButtonText: '取消', type: 'warning' })
    await unbindDevice(props.id)
    ElMessage.success('设备已解绑')
    await router.replace('/devices')
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.response?.data?.detail || '解绑失败，请重试')
  }
}

function formatLastSeen(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无活跃记录' }
function capabilityEntries(capabilities: Record<string, unknown>) { return Object.entries(capabilities) }

watch(() => props.id, loadDevice)
onMounted(loadDevice)
</script>

<template>
  <section>
    <el-page-header content="设备详情" @back="router.push('/devices')"><template #extra><el-button :loading="loading" @click="loadDevice">刷新</el-button></template></el-page-header>
    <el-skeleton v-if="loading && !device" :rows="5" animated class="detail-card" />
    <el-empty v-else-if="!device" description="未能加载设备详情"><el-button type="primary" @click="router.push('/devices')">返回设备列表</el-button></el-empty>
    <el-card v-else class="detail-card" shadow="never">
      <template #header><div class="card-header"><div><strong>{{ device.name || '未命名设备' }}</strong><p>{{ device.device_uid }}</p></div><el-tag :type="device.online ? 'success' : 'info'">{{ device.online ? '在线' : '离线' }}</el-tag></div></template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="设备标识">{{ device.device_uid }}</el-descriptions-item>
        <el-descriptions-item label="最近活跃">{{ formatLastSeen(device.last_seen_at) }}</el-descriptions-item>
        <el-descriptions-item label="固件版本">{{ device.firmware_version || '未上报' }}</el-descriptions-item>
        <el-descriptions-item label="设备能力"><template v-if="capabilityEntries(device.capabilities).length"><el-tag v-for="[key, value] in capabilityEntries(device.capabilities)" :key="key" class="capability">{{ key }}: {{ String(value) }}</el-tag></template><span v-else>暂未上报</span></el-descriptions-item>
      </el-descriptions>
      <div class="actions"><el-button @click="openRenameDialog">修改名称</el-button><el-button type="danger" plain @click="confirmUnbind">解绑设备</el-button></div>
    </el-card>
    <el-dialog v-model="renameVisible" title="修改设备名称" width="min(92vw, 420px)" :close-on-click-modal="!renaming">
      <el-form ref="renameFormRef" :model="renameForm" :rules="renameRules" label-position="top" @submit.prevent="submitRename"><el-form-item label="设备名称" prop="name"><el-input v-model="renameForm.name" maxlength="128" show-word-limit autocomplete="off" /></el-form-item></el-form>
      <template #footer><el-button :disabled="renaming" @click="renameVisible = false">取消</el-button><el-button type="primary" :loading="renaming" @click="submitRename">保存</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.detail-card { max-width: 760px; margin-top: 24px; }.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }.card-header p { margin: 6px 0 0; color: #6b7280; }.capability { margin: 2px 6px 2px 0; }.actions { display: flex; gap: 12px; margin-top: 24px; }
</style>
