<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminDailyFortune,
  getAdminDevice,
  getAdminPersona,
  getAdminPeripheral,
  listAdminAnalyses,
  listAdminMemories,
  listAdminMessages,
  reviewAdminMemory,
  rotateBindingId,
  updateAdminPersona,
  type AdminDevice,
  type AdminMemory,
  type Analysis,
  type BondView,
  type ChatMessage,
  type DailyFortune,
  type PeripheralState,
} from '../../api/adminDevices'
import AnalysisCardList from '../../components/AnalysisCardList.vue'
import OffsetPager from '../../components/OffsetPager.vue'
import PageEmpty from '../../components/PageEmpty.vue'
import { formatDateTime, requestErrorMessage } from '../../utils/feedback'
import { setSelectedDeviceId } from '../../utils/selectedDevice'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const rotating = ref(false)
const device = ref<AdminDevice>()
const validTabs = ['persona', 'messages', 'memories', 'peripheral', 'analyses', 'fortune']
const activeTab = ref(typeof route.query.tab === 'string' && validTabs.includes(route.query.tab) ? route.query.tab : 'persona')
const messages = ref<ChatMessage[]>([])
const memories = ref<AdminMemory[]>([])
const memoryQuery = ref('')
const memoryStatus = ref('')
const memoryOffset = ref(0)
const hasMoreMemories = ref(false)
const messageRange = ref<string[]>([])
const messageOffset = ref(0)
const messagePageSize = 20
const hasMoreMessages = ref(false)
const peripheral = ref<PeripheralState>()
const peripheralMissing = ref(false)
const analyses = ref<Analysis[]>([])
const analysisKind = ref('')
const analysisOffset = ref(0)
const hasMoreAnalyses = ref(false)
const fortuneDate = ref('')
const fortune = ref<DailyFortune>()
const fortuneNotConfigured = ref(false)
const tabLoading = reactive({ persona: false, messages: false, memories: false, peripheral: false, analyses: false, fortune: false })
const tabError = reactive({ persona: '', messages: '', memories: '', peripheral: '', analyses: '', fortune: '' })
const persona = reactive({
  sun_sign: '',
  mbti: '',
  overridesText: '{}',
  follow_latest: true,
  kb_version: null as number | null,
  identity: '',
  background: '',
  roles: '',
  goals: '',
  evolutionRules: '',
  relationship: '',
})
const personaExists = ref(false)
const bond = ref<BondView | null>(null)
const relationshipKindLabels: Record<string, string> = {
  partner: '情感伴侣',
  rebellious_child: '逆子',
  beloved_child: '爱子',
  love_hate: '相爱相杀',
  confidant: '知己',
  companion: '陪伴伙伴',
  guardian: '守护者',
}
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

function detailError(error: unknown, fallback: string) {
  const message = requestErrorMessage(error, fallback)
  ElMessage.error(message)
  return message
}

function pretty(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
}

async function loadDevice() {
  loading.value = true
  try {
    device.value = (await getAdminDevice(props.id)).data
  } catch (error: unknown) {
    detailError(error, '设备资产详情加载失败')
  } finally {
    loading.value = false
  }
}

async function loadPersona() {
  tabLoading.persona = true
  tabError.persona = ''
  try {
    const result = (await getAdminPersona(props.id)).data
    persona.sun_sign = result.sun_sign || ''
    persona.mbti = result.mbti || ''
    persona.overridesText = pretty(result.overrides)
    persona.follow_latest = result.follow_latest
    persona.kb_version = result.kb_version
    persona.identity = result.dossier?.identity || ''
    persona.background = (result.dossier?.background || []).join('\n')
    persona.roles = (result.dossier?.roles || []).join('\n')
    persona.goals = (result.dossier?.goals || []).join('\n')
    persona.evolutionRules = (result.dossier?.evolution_rules || []).join('\n')
    persona.relationship = result.dossier?.relationship || ''
    bond.value = result.bond
    personaExists.value = true
  } catch (error: unknown) {
    personaExists.value = false
    bond.value = null
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status !== 404) tabError.persona = detailError(error, '人设加载失败')
  } finally {
    tabLoading.persona = false
  }
}

async function savePersona() {
  let overrides: Record<string, unknown>
  try {
    overrides = JSON.parse(persona.overridesText || '{}')
  } catch {
    ElMessage.error('补充配置必须是合法 JSON 对象')
    return
  }
  if (!persona.sun_sign || !persona.mbti) {
    ElMessage.warning('请选择星座和 MBTI')
    return
  }
  tabLoading.persona = true
  try {
    const list = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 8)
    const result = (await updateAdminPersona(props.id, {
      sun_sign: persona.sun_sign,
      mbti: persona.mbti,
      overrides,
      follow_latest: persona.follow_latest,
      dossier: {
        identity: persona.identity.trim(),
        background: list(persona.background),
        roles: list(persona.roles),
        goals: list(persona.goals),
        evolution_rules: list(persona.evolutionRules),
        relationship: persona.relationship.trim(),
      },
    })).data
    persona.kb_version = result.kb_version
    personaExists.value = true
    ElMessage.success('人设已保存，将在下一次设备会话生效')
  } catch (error: unknown) {
    detailError(error, '人设保存失败')
  } finally {
    tabLoading.persona = false
  }
}

async function loadMessages(offset = messageOffset.value) {
  tabLoading.messages = true
  tabError.messages = ''
  try {
    const result = await listAdminMessages(props.id, {
      limit: messagePageSize,
      offset,
      from: messageRange.value[0],
      to: messageRange.value[1],
    })
    messages.value = result.data
    messageOffset.value = offset
    hasMoreMessages.value = result.data.length === messagePageSize
  } catch (error: unknown) {
    tabError.messages = detailError(error, '脱敏历史加载失败')
  } finally {
    tabLoading.messages = false
  }
}

function searchMessages() {
  loadMessages(0)
}

function resetMessageFilters() {
  messageRange.value = []
  loadMessages(0)
}

async function loadMemories(offset = memoryOffset.value) {
  tabLoading.memories = true
  tabError.memories = ''
  try {
    const result = await listAdminMemories(props.id, {
      q: memoryQuery.value || undefined,
      status: memoryStatus.value || undefined,
      limit: messagePageSize,
      offset,
    })
    memories.value = result.data
    memoryOffset.value = offset
    hasMoreMemories.value = result.data.length === messagePageSize
  } catch (error: unknown) {
    tabError.memories = detailError(error, '记忆列表加载失败')
  } finally {
    tabLoading.memories = false
  }
}

async function reviewMemory(memory: AdminMemory, action: 'approve' | 'reject') {
  try {
    await reviewAdminMemory(props.id, memory.id, action)
    ElMessage.success(action === 'approve' ? '记忆已接受' : '记忆已驳回')
    loadMemories(memoryOffset.value)
  } catch (error: unknown) {
    detailError(error, '记忆审核失败')
  }
}

async function loadPeripheral() {
  tabLoading.peripheral = true
  tabError.peripheral = ''
  peripheralMissing.value = false
  try {
    peripheral.value = (await getAdminPeripheral(props.id)).data
  } catch (error: unknown) {
    peripheral.value = undefined
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) peripheralMissing.value = true
    else tabError.peripheral = detailError(error, '外设状态加载失败')
  } finally {
    tabLoading.peripheral = false
  }
}

async function loadAnalyses(offset = analysisOffset.value) {
  tabLoading.analyses = true
  tabError.analyses = ''
  try {
    const result = await listAdminAnalyses(props.id, {
      kind: analysisKind.value || undefined,
      limit: messagePageSize,
      offset,
    })
    analyses.value = result.data
    analysisOffset.value = offset
    hasMoreAnalyses.value = result.data.length === messagePageSize
  } catch (error: unknown) {
    tabError.analyses = detailError(error, '分析记录加载失败')
  } finally {
    tabLoading.analyses = false
  }
}

async function loadFortune(date = fortuneDate.value) {
  tabLoading.fortune = true
  tabError.fortune = ''
  fortuneNotConfigured.value = false
  try {
    fortune.value = (await getAdminDailyFortune(props.id, date || undefined)).data
  } catch (error: unknown) {
    fortune.value = undefined
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) fortuneNotConfigured.value = true
    else tabError.fortune = detailError(error, '运势核对加载失败')
  } finally {
    tabLoading.fortune = false
  }
}

function loadTab(name: string | number) {
  if (typeof name === 'string' && route.query.tab !== name) router.replace({ query: { ...route.query, tab: name } })
  if (name === 'persona') loadPersona()
  if (name === 'messages') loadMessages()
  if (name === 'memories') loadMemories()
  if (name === 'peripheral') loadPeripheral()
  if (name === 'analyses') loadAnalyses()
  if (name === 'fortune') loadFortune()
}

async function confirmRotate() {
  if (!device.value) return
  try {
    await ElMessageBox.confirm('轮换后旧绑定码立即失效，不会改变当前用户归属。是否继续？', '确认轮换绑定码', {
      type: 'warning',
      confirmButtonText: '确认轮换',
      cancelButtonText: '取消',
    })
    rotating.value = true
    device.value = (await rotateBindingId(props.id)).data
    ElMessage.success('绑定码已轮换')
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') detailError(error, '绑定码轮换失败')
  } finally {
    rotating.value = false
  }
}

async function copyBindingId() {
  if (!device.value) return
  await navigator.clipboard.writeText(device.value.binding_id)
  ElMessage.success('绑定码已复制')
}

watch(() => props.id, async () => {
  await loadDevice()
  loadTab(activeTab.value)
})
watch(() => route.query.tab, (tab) => {
  if (typeof tab === 'string' && validTabs.includes(tab) && tab !== activeTab.value) {
    activeTab.value = tab
    loadTab(tab)
  }
})
onMounted(async () => {
  await loadDevice()
  setSelectedDeviceId(props.id)
  loadTab(activeTab.value)
})
</script>

<template>
  <section>
    <el-page-header content="设备资产详情" @back="router.push('/devices')">
      <template #extra>
        <el-button :loading="loading" @click="loadDevice">刷新</el-button>
      </template>
    </el-page-header>
    <el-skeleton v-if="loading && !device" :rows="6" animated class="detail-card" />
    <PageEmpty v-else-if="!device" description="未能加载设备资产" retry-label="返回设备列表" @retry="router.push('/devices')" />
    <template v-else>
      <el-card class="detail-card" shadow="never">
        <template #header>
          <div class="card-header">
            <div>
              <strong>{{ device.name || '未命名设备' }}</strong>
              <p>{{ device.device_uid }}</p>
            </div>
            <div>
              <el-tag :type="device.claimed ? 'success' : 'warning'">{{ device.claimed ? '已认领' : '未认领' }}</el-tag>
              <el-tag :type="device.online ? 'success' : 'info'" class="status">{{ device.online ? '在线' : '离线' }}</el-tag>
            </div>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="平台 ID">{{ device.id }}</el-descriptions-item>
          <el-descriptions-item label="设备核心 ID">{{ device.device_uid }}</el-descriptions-item>
          <el-descriptions-item label="当前绑定码">
            <span class="binding-id">{{ device.binding_id }}</span>
            <el-button link type="primary" @click="copyBindingId">复制</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="最近活跃">{{ formatDateTime(device.last_seen_at) }}</el-descriptions-item>
          <el-descriptions-item label="固件版本">{{ device.firmware_version || '未上报' }}</el-descriptions-item>
          <el-descriptions-item label="设备能力">
            <template v-if="Object.keys(device.capabilities).length">
              <el-tag v-for="(value, key) in device.capabilities" :key="key" class="capability">{{ key }}: {{ String(value) }}</el-tag>
            </template>
            <span v-else>暂无上报</span>
          </el-descriptions-item>
        </el-descriptions>
        <div class="actions">
          <el-button type="warning" plain :loading="rotating" @click="confirmRotate">轮换绑定码</el-button>
        </div>
      </el-card>
      <el-card class="detail-card" shadow="never">
        <el-tabs v-model="activeTab" @tab-change="loadTab">
          <el-tab-pane label="人设" name="persona">
            <el-alert
              title="保存后将在下一次设备会话生效。小智默认约 300 秒刷新 persona_pack，不会中途改写当前对话。"
              type="info"
              :closable="false"
              show-icon
              class="tab-notice"
            />
            <el-alert
              v-if="!canEditPersona"
              title="设备尚未由用户认领，不能配置人设。"
              type="warning"
              :closable="false"
              show-icon
              class="tab-notice"
            />
            <PageEmpty v-if="tabError.persona" :description="tabError.persona" retry-label="重新加载" @retry="loadPersona" />
            <el-form v-else v-loading="tabLoading.persona" label-width="90px" class="persona-form">
              <el-form-item label="星座">
                <el-select v-model="persona.sun_sign" :disabled="!canEditPersona" placeholder="选择星座">
                  <el-option v-for="item in signs" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="MBTI">
                <el-select v-model="persona.mbti" :disabled="!canEditPersona" placeholder="选择 MBTI">
                  <el-option v-for="item in mbtis" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="知识库版本">{{ persona.follow_latest ? '跟随已发布最新版' : (persona.kb_version ?? '未钉扎') }}</el-form-item>
              <el-form-item v-if="bond" label="与主人关系">
                <span>{{ relationshipKindLabels[bond.kind] || bond.label }}</span>
                <span v-if="bond.summary"> — {{ bond.summary }}</span>
                <el-tag size="small" class="bond-source">{{ bond.source === 'worker' ? 'worker 推断' : '人工设置' }}</el-tag>
              </el-form-item>
              <el-form-item label="角色身份">
                <el-input v-model="persona.identity" :disabled="!canEditPersona" placeholder="例如：温柔的陪伴型 AI 宠物" />
              </el-form-item>
              <el-form-item label="背景/角色/目标">
                <el-input v-model="persona.background" type="textarea" :rows="2" placeholder="每行一项背景" :disabled="!canEditPersona" />
                <el-input v-model="persona.roles" type="textarea" :rows="2" placeholder="每行一项角色" :disabled="!canEditPersona" />
                <el-input v-model="persona.goals" type="textarea" :rows="2" placeholder="每行一个目标" :disabled="!canEditPersona" />
              </el-form-item>
              <el-form-item label="关系与进化">
                <el-input v-model="persona.relationship" placeholder="与主人的关系" :disabled="!canEditPersona" />
                <el-input v-model="persona.evolutionRules" type="textarea" :rows="2" placeholder="每行一条进化规则" :disabled="!canEditPersona" />
              </el-form-item>
              <el-form-item label="跟随最新">
                <el-switch v-model="persona.follow_latest" :disabled="!canEditPersona" />
              </el-form-item>
              <el-form-item label="高级配置">
                <el-input v-model="persona.overridesText" :disabled="!canEditPersona" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :disabled="!canEditPersona" :loading="tabLoading.persona" @click="savePersona">
                  {{ personaExists ? '保存人设' : '创建人设' }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="脱敏历史" name="messages">
            <div class="history-tools">
              <el-date-picker
                v-model="messageRange"
                type="datetimerange"
                value-format="YYYY-MM-DDTHH:mm:ss"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
              />
              <el-button type="primary" :loading="tabLoading.messages" @click="searchMessages">筛选</el-button>
              <el-button @click="resetMessageFilters">重置</el-button>
            </div>
            <el-table v-loading="tabLoading.messages" :data="messages" empty-text=" ">
              <el-table-column prop="created_at" label="时间" min-width="175">
                <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
              </el-table-column>
              <el-table-column prop="role" label="角色" width="100" />
              <el-table-column prop="content_redacted" label="内容" min-width="340" show-overflow-tooltip />
            </el-table>
            <PageEmpty
              v-if="!tabLoading.messages && !messages.length"
              :description="tabError.messages || '暂无脱敏历史'"
              retry-label="重新加载"
              @retry="loadMessages(messageOffset)"
            />
            <OffsetPager
              v-if="messages.length || messageOffset > 0"
              :offset="messageOffset"
              :page-size="messagePageSize"
              :has-more="hasMoreMessages"
              :loading="tabLoading.messages"
              @change="loadMessages"
            />
          </el-tab-pane>

          <el-tab-pane label="记忆管理" name="memories">
            <div class="history-tools">
              <el-input v-model="memoryQuery" placeholder="搜索标题或内容" clearable @keyup.enter="loadMemories(0)" />
              <el-select v-model="memoryStatus" placeholder="全部状态" clearable @change="loadMemories(0)">
                <el-option label="候选待审核" value="candidate" />
                <el-option label="已生效" value="active" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
              <el-button type="primary" :loading="tabLoading.memories" @click="loadMemories(0)">筛选</el-button>
            </div>
            <el-table v-loading="tabLoading.memories" :data="memories" empty-text=" ">
              <el-table-column label="标题" min-width="140">
                <template #default="{ row }">{{ row.title || '未命名记忆' }}</template>
              </el-table-column>
              <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip />
              <el-table-column prop="source" label="来源" width="100" />
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'candidate' ? 'warning' : row.status === 'active' ? 'success' : 'info'">
                    {{ row.status === 'candidate' ? '待审核' : row.status === 'active' ? '已生效' : '已驳回' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="130">
                <template #default="{ row }">
                  <el-button v-if="row.status === 'candidate'" link type="success" @click="reviewMemory(row, 'approve')">接受</el-button>
                  <el-button v-if="row.status === 'candidate'" link type="danger" @click="reviewMemory(row, 'reject')">驳回</el-button>
                </template>
              </el-table-column>
            </el-table>
            <PageEmpty
              v-if="!tabLoading.memories && !memories.length"
              :description="tabError.memories || '暂无记忆'"
              retry-label="重新加载"
              @retry="loadMemories(memoryOffset)"
            />
            <OffsetPager
              v-if="memories.length || memoryOffset > 0"
              :offset="memoryOffset"
              :page-size="messagePageSize"
              :has-more="hasMoreMemories"
              :loading="tabLoading.memories"
              @change="loadMemories"
            />
          </el-tab-pane>

          <el-tab-pane label="外设状态" name="peripheral">
            <el-descriptions v-if="peripheral" v-loading="tabLoading.peripheral" :column="1" border>
              <el-descriptions-item label="眼睛情绪">{{ peripheral.eye_emotion || '暂无' }}</el-descriptions-item>
              <el-descriptions-item label="注视方向">{{ peripheral.eye_gaze || '暂无' }}</el-descriptions-item>
              <el-descriptions-item label="闭眼">{{ peripheral.eye_closed === null ? '暂无' : peripheral.eye_closed ? '是' : '否' }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ formatDateTime(peripheral.updated_at) }}</el-descriptions-item>
              <el-descriptions-item v-if="Object.keys(peripheral.extra || {}).length" label="扩展字段">
                <el-tag v-for="(value, key) in peripheral.extra" :key="key" class="capability">{{ key }}: {{ String(value) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-else label="扩展字段">暂无上报</el-descriptions-item>
            </el-descriptions>
            <PageEmpty
              v-else
              :description="tabError.peripheral || (peripheralMissing ? '暂无外设状态上报' : '正在加载外设状态')"
              :retry-label="tabLoading.peripheral ? undefined : '重新加载'"
              @retry="loadPeripheral"
            />
          </el-tab-pane>

          <el-tab-pane label="分析" name="analyses">
            <div class="history-tools">
              <el-select v-model="analysisKind" placeholder="全部类型" clearable @change="loadAnalyses(0)">
                <el-option label="每日摘要" value="daily_summary" />
                <el-option label="人设成长建议" value="persona_growth" />
                <el-option label="记忆画像" value="memory_profile" />
                <el-option label="关系推断" value="relationship_update" />
              </el-select>
              <el-button type="primary" :loading="tabLoading.analyses" @click="loadAnalyses(0)">筛选</el-button>
            </div>
            <div v-loading="tabLoading.analyses">
              <AnalysisCardList v-if="analyses.length" :items="analyses" />
              <PageEmpty
                v-else-if="!tabLoading.analyses"
                :description="tabError.analyses || '暂无分析记录。会话结束后由 worker 生成每日摘要与成长建议。'"
                retry-label="重新加载"
                @retry="loadAnalyses(analysisOffset)"
              />
            </div>
            <OffsetPager
              v-if="analyses.length || analysisOffset > 0"
              :offset="analysisOffset"
              :page-size="messagePageSize"
              :has-more="hasMoreAnalyses"
              :loading="tabLoading.analyses"
              @change="loadAnalyses"
            />
          </el-tab-pane>

          <el-tab-pane label="运势核对" name="fortune">
            <el-alert
              title="只读核对面板：与用户端同结构同语义，不触发内容懒生成。星座/生辰取账号主人档案，不回退宠物人设星座。"
              type="info"
              :closable="false"
              show-icon
              class="tab-notice"
            />
            <div class="history-tools">
              <el-date-picker v-model="fortuneDate" type="date" value-format="YYYY-MM-DD" placeholder="默认今天" />
              <el-button type="primary" :loading="tabLoading.fortune" @click="loadFortune()">查询</el-button>
            </div>
            <div v-loading="tabLoading.fortune">
              <PageEmpty
                v-if="fortuneNotConfigured"
                description="设备尚未配置宠物人设（无星座），无法核对运势"
              />
              <PageEmpty
                v-else-if="!fortune && !tabLoading.fortune"
                :description="tabError.fortune || '暂无数据'"
                retry-label="重新加载"
                @retry="loadFortune()"
              />
              <template v-else-if="fortune">
                <el-descriptions :column="1" border class="tab-notice">
                  <el-descriptions-item label="日期">{{ fortune.date }}</el-descriptions-item>
                  <el-descriptions-item label="主人星座">{{ fortune.sign ? (signs.find((s) => s.value === fortune!.sign)?.label ?? fortune.sign) : '未录入' }}</el-descriptions-item>
                  <el-descriptions-item label="问候语">{{ fortune.greeting || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="生成状态">
                    <el-tag :type="fortune.generating ? 'warning' : 'success'">{{ fortune.generating ? '生成中' : '已完成' }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
                <el-descriptions v-if="fortune.sign_fortune" title="星座运势" :column="1" border class="tab-notice">
                  <el-descriptions-item label="总述">{{ fortune.sign_fortune.overall || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="事业">{{ fortune.sign_fortune.career || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="财运">{{ fortune.sign_fortune.wealth || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="学业">{{ fortune.sign_fortune.study || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="情感">{{ fortune.sign_fortune.love || '暂无' }}</el-descriptions-item>
                </el-descriptions>
                <el-descriptions v-if="fortune.bazi_fortune" title="八字运势" :column="1" border>
                  <el-descriptions-item label="总述">{{ fortune.bazi_fortune.overall || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="事业">{{ fortune.bazi_fortune.career || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="财运">{{ fortune.bazi_fortune.wealth || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="学业">{{ fortune.bazi_fortune.study || '暂无' }}</el-descriptions-item>
                  <el-descriptions-item label="情感">{{ fortune.bazi_fortune.love || '暂无' }}</el-descriptions-item>
                </el-descriptions>
              </template>
            </div>
          </el-tab-pane>

        </el-tabs>
      </el-card>
    </template>
  </section>
</template>

<style scoped>
.detail-card { max-width: 920px; margin-top: 24px; }
.card-header { display: flex; justify-content: space-between; gap: 16px; }
.card-header p { margin: 6px 0 0; color: #6b7280; }
.status { margin-left: 8px; }
.binding-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
.capability { margin: 2px 6px 2px 0; }
.actions { margin-top: 20px; }
.tab-notice { margin-bottom: 16px; }
.bond-source { margin-left: 8px; }
.persona-form { max-width: 640px; }
.history-tools { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
@media (max-width: 680px) {
  .history-tools { align-items: stretch; flex-direction: column; }
  .history-tools :deep(.el-date-editor) { width: 100%; }
}
</style>
