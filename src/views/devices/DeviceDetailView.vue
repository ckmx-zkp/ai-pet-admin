<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminDevice, getAdminPersona, getAdminPeripheral, listAdminAnalyses, listAdminMessages, rotateBindingId,
  updateAdminPersona, type AdminDevice, type Analysis, type ChatMessage, type PeripheralState,
} from '../../api/adminDevices'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const rotating = ref(false)
const device = ref<AdminDevice>()
const validTabs = ['persona', 'messages', 'peripheral', 'analyses']
const activeTab = ref(typeof route.query.tab === 'string' && validTabs.includes(route.query.tab) ? route.query.tab : 'persona')
const messages = ref<ChatMessage[]>([])
const peripheral = ref<PeripheralState>()
const analyses = ref<Analysis[]>([])
const tabLoading = reactive({ persona: false, messages: false, peripheral: false, analyses: false })
const persona = reactive({ sun_sign: '', mbti: '', overridesText: '{}', follow_latest: true })
const personaExists = ref(false)
const signs = [
  { value: 'aries', label: '白羊座' }, { value: 'taurus', label: '金牛座' },
  { value: 'gemini', label: '双子座' }, { value: 'cancer', label: '巨蟹座' },
  { value: 'leo', label: '狮子座' }, { value: 'virgo', label: '处女座' },
  { value: 'libra', label: '天秤座' }, { value: 'scorpio', label: '天蝎座' },
  { value: 'sagittarius', label: '射手座' }, { value: 'capricorn', label: '摩羯座' },
  { value: 'aquarius', label: '水瓶座' }, { value: 'pisces', label: '双鱼座' },
]
const mbtis = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']
const canEditPersona = computed(() => device.value?.claimed === true)

function detailError(error: any, fallback: string) { ElMessage.error(error.response?.data?.detail || fallback) }
function formatTime(value: string | null | undefined) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无记录' }
function pretty(value: Record<string, unknown>) { return JSON.stringify(value, null, 2) }

async function loadDevice() {
  loading.value = true
  try { device.value = (await getAdminDevice(props.id)).data }
  catch (error: any) { detailError(error, '设备资产详情加载失败') }
  finally { loading.value = false }
}

async function loadPersona() {
  tabLoading.persona = true
  try {
    const result = (await getAdminPersona(props.id)).data
    persona.sun_sign = result.sun_sign || ''; persona.mbti = result.mbti || ''
    persona.overridesText = pretty(result.overrides); persona.follow_latest = result.follow_latest; personaExists.value = true
  } catch (error: any) {
    personaExists.value = false
    if (error.response?.status !== 404) detailError(error, '人设加载失败')
  } finally { tabLoading.persona = false }
}

async function savePersona() {
  let overrides: Record<string, unknown>
  try { overrides = JSON.parse(persona.overridesText || '{}') } catch { ElMessage.error('补充配置必须是合法 JSON 对象'); return }
  if (!persona.sun_sign || !persona.mbti) { ElMessage.warning('请选择星座和 MBTI'); return }
  tabLoading.persona = true
  try {
    await updateAdminPersona(props.id, { sun_sign: persona.sun_sign, mbti: persona.mbti, overrides, follow_latest: persona.follow_latest })
    personaExists.value = true; ElMessage.success('人设已保存')
  } catch (error: any) { detailError(error, '人设保存失败') } finally { tabLoading.persona = false }
}

async function loadMessages() { tabLoading.messages = true; try { messages.value = (await listAdminMessages(props.id, { limit: 100 })).data } catch (error: any) { detailError(error, '脱敏历史加载失败') } finally { tabLoading.messages = false } }
async function loadPeripheral() { tabLoading.peripheral = true; try { peripheral.value = (await getAdminPeripheral(props.id)).data } catch (error: any) { if (error.response?.status !== 404) detailError(error, '外设状态加载失败') } finally { tabLoading.peripheral = false } }
async function loadAnalyses() { tabLoading.analyses = true; try { analyses.value = (await listAdminAnalyses(props.id, { limit: 100 })).data } catch (error: any) { detailError(error, '分析记录加载失败') } finally { tabLoading.analyses = false } }
function loadTab(name: string | number) {
  if (typeof name === 'string' && route.query.tab !== name) router.replace({ query: { ...route.query, tab: name } })
  if (name === 'persona') loadPersona(); if (name === 'messages') loadMessages(); if (name === 'peripheral') loadPeripheral(); if (name === 'analyses') loadAnalyses()
}

async function confirmRotate() {
  if (!device.value) return
  try {
    await ElMessageBox.confirm('轮换后旧绑定码立即失效，不会改变当前用户归属。是否继续？', '确认轮换绑定码', { type: 'warning', confirmButtonText: '确认轮换', cancelButtonText: '取消' })
    rotating.value = true; device.value = (await rotateBindingId(props.id)).data; ElMessage.success('绑定码已轮换')
  } catch (error: any) { if (error !== 'cancel' && error !== 'close') detailError(error, '绑定码轮换失败') } finally { rotating.value = false }
}

async function copyBindingId() { if (!device.value) return; await navigator.clipboard.writeText(device.value.binding_id); ElMessage.success('绑定码已复制') }

watch(() => props.id, async () => { await loadDevice(); loadTab(activeTab.value) })
watch(() => route.query.tab, (tab) => {
  if (typeof tab === 'string' && validTabs.includes(tab) && tab !== activeTab.value) {
    activeTab.value = tab
    loadTab(tab)
  }
})
onMounted(async () => { await loadDevice(); localStorage.setItem('ai-pet-admin-selected-device', props.id); loadTab(activeTab.value) })
</script>

<template>
  <section>
    <el-page-header content="设备资产详情" @back="router.push('/devices')"><template #extra><el-button :loading="loading" @click="loadDevice">刷新</el-button></template></el-page-header>
    <el-skeleton v-if="loading && !device" :rows="6" animated class="detail-card" />
    <el-empty v-else-if="!device" description="未能加载设备资产"><el-button type="primary" @click="router.push('/devices')">返回设备列表</el-button></el-empty>
    <template v-else>
      <el-card class="detail-card" shadow="never">
        <template #header><div class="card-header"><div><strong>{{ device.name || '未命名设备' }}</strong><p>{{ device.device_uid }}</p></div><div><el-tag :type="device.claimed ? 'success' : 'warning'">{{ device.claimed ? '已认领' : '未认领' }}</el-tag><el-tag :type="device.online ? 'success' : 'info'" class="status">{{ device.online ? '在线' : '离线' }}</el-tag></div></div></template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="平台 ID">{{ device.id }}</el-descriptions-item><el-descriptions-item label="设备核心 ID">{{ device.device_uid }}</el-descriptions-item>
          <el-descriptions-item label="当前绑定码"><span class="binding-id">{{ device.binding_id }}</span><el-button link type="primary" @click="copyBindingId">复制</el-button></el-descriptions-item>
          <el-descriptions-item label="最近活跃">{{ formatTime(device.last_seen_at) }}</el-descriptions-item><el-descriptions-item label="固件版本">{{ device.firmware_version || '未上报' }}</el-descriptions-item>
          <el-descriptions-item label="设备能力"><template v-if="Object.keys(device.capabilities).length"><el-tag v-for="(value, key) in device.capabilities" :key="key" class="capability">{{ key }}: {{ String(value) }}</el-tag></template><span v-else>暂无上报</span></el-descriptions-item>
        </el-descriptions>
        <div class="actions"><el-button type="warning" plain :loading="rotating" @click="confirmRotate">轮换绑定码</el-button></div>
      </el-card>
      <el-card class="detail-card" shadow="never"><el-tabs v-model="activeTab" @tab-change="loadTab">
        <el-tab-pane label="人设" name="persona"><el-alert v-if="!canEditPersona" title="设备尚未由用户认领，不能配置人设。" type="warning" :closable="false" show-icon class="tab-notice" /><el-form v-loading="tabLoading.persona" label-width="90px" class="persona-form"><el-form-item label="星座"><el-select v-model="persona.sun_sign" :disabled="!canEditPersona" placeholder="选择星座"><el-option v-for="item in signs" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item><el-form-item label="MBTI"><el-select v-model="persona.mbti" :disabled="!canEditPersona" placeholder="选择 MBTI"><el-option v-for="item in mbtis" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="跟随最新"><el-switch v-model="persona.follow_latest" :disabled="!canEditPersona" /></el-form-item><el-form-item label="补充配置"><el-input v-model="persona.overridesText" :disabled="!canEditPersona" type="textarea" :rows="5" /></el-form-item><el-form-item><el-button type="primary" :disabled="!canEditPersona" :loading="tabLoading.persona" @click="savePersona">{{ personaExists ? '保存人设' : '创建人设' }}</el-button></el-form-item></el-form></el-tab-pane>
        <el-tab-pane label="脱敏历史" name="messages"><el-table v-loading="tabLoading.messages" :data="messages" empty-text="暂无脱敏历史"><el-table-column prop="created_at" label="时间" min-width="175"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column><el-table-column prop="role" label="角色" width="100" /><el-table-column prop="content_redacted" label="内容" min-width="340" show-overflow-tooltip /></el-table></el-tab-pane>
        <el-tab-pane label="外设状态" name="peripheral"><el-descriptions v-if="peripheral" v-loading="tabLoading.peripheral" :column="1" border><el-descriptions-item label="眼睛情绪">{{ peripheral.eye_emotion || '暂无' }}</el-descriptions-item><el-descriptions-item label="注视方向">{{ peripheral.eye_gaze || '暂无' }}</el-descriptions-item><el-descriptions-item label="闭眼">{{ peripheral.eye_closed === null ? '暂无' : peripheral.eye_closed ? '是' : '否' }}</el-descriptions-item><el-descriptions-item label="更新时间">{{ formatTime(peripheral.updated_at) }}</el-descriptions-item><el-descriptions-item label="扩展数据"><pre>{{ pretty(peripheral.extra) }}</pre></el-descriptions-item></el-descriptions><el-empty v-else v-loading="tabLoading.peripheral" description="暂无外设状态上报" /></el-tab-pane>
        <el-tab-pane label="分析" name="analyses"><el-table v-loading="tabLoading.analyses" :data="analyses" empty-text="暂无分析记录"><el-table-column prop="kind" label="类型" width="160" /><el-table-column label="生成时间" width="180"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column><el-table-column label="结果"><template #default="{ row }"><pre>{{ pretty(row.payload) }}</pre></template></el-table-column></el-table></el-tab-pane>
      </el-tabs></el-card>
    </template>
  </section>
</template>

<style scoped>
.detail-card { max-width: 920px; margin-top: 24px; }.card-header { display: flex; justify-content: space-between; gap: 16px; }.card-header p { margin: 6px 0 0; color: #6b7280; }.status { margin-left: 8px; }.binding-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }.capability { margin: 2px 6px 2px 0; }.actions { margin-top: 20px; }.tab-notice { margin-bottom: 20px; }.persona-form { max-width: 640px; } pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
</style>
