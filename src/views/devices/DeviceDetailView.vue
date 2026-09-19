<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Refresh,
  CopyDocument,
  Cpu,
  Connection,
  UserFilled,
  ChatDotRound,
  Collection,
  View as ViewIcon,
  DataAnalysis,
  Opportunity,
  Clock,
  Key,
  Switch,
  Check,
  Close,
  Search,
  Filter,
  InfoFilled,
  WarningFilled
} from '@element-plus/icons-vue'
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
    ElMessage.error('高级配置 JSON 格式错误')
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
  if (typeof name === 'string' && route.query.tab !== name) {
    router.replace({ query: { ...route.query, tab: name } })
  }
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
    await ElMessageBox.confirm(
      '轮换后旧 Binding ID 将立即失效，但不会修改当前用户的认领归属。是否继续？',
      '确认轮换绑定码',
      {
        type: 'warning',
        confirmButtonText: '确认轮换',
        cancelButtonText: '取消',
      }
    )
    rotating.value = true
    device.value = (await rotateBindingId(props.id)).data
    ElMessage.success('绑定码已成功轮换')
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') detailError(error, '绑定码轮换失败')
  } finally {
    rotating.value = false
  }
}

async function copyText(text: string, label = '内容') {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
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
  <section class="device-detail-page">
    <!-- 顶栏导航 -->
    <div class="top-nav-bar">
      <el-button
        class="back-btn"
        :icon="ArrowLeft"
        @click="router.push('/devices')"
      >
        返回资产列表
      </el-button>
      <div class="top-nav-actions">
        <el-button
          :icon="Refresh"
          :loading="loading"
          @click="loadDevice"
        >
          刷新数据
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading && !device" :rows="8" animated class="loading-box" />
    <PageEmpty
      v-else-if="!device"
      description="未能加载该设备资产详情"
      retry-label="返回设备列表"
      @retry="router.push('/devices')"
    />

    <template v-else>
      <!-- 设备资产核心 Hero 看板 -->
      <div class="hero-asset-card">
        <!-- 栏目1：设备身份与在线状态 -->
        <div class="asset-col identity-col">
          <div class="asset-avatar">
            <el-icon><Cpu /></el-icon>
          </div>
          <div class="identity-info">
            <div class="title-row">
              <h2 class="device-main-title">{{ device.name || '未命名守护星' }}</h2>
              <span class="status-dot" :class="device.online ? 'online' : 'offline'"></span>
              <el-tag :type="device.online ? 'success' : 'info'" size="small" effect="plain" class="status-tag">
                {{ device.online ? '实时在线' : '休眠离线' }}
              </el-tag>
              <el-tag :type="device.claimed ? 'success' : 'warning'" size="small" effect="light" class="status-tag">
                {{ device.claimed ? '已被主人认领' : '待认领' }}
              </el-tag>
            </div>
            <div class="id-row">
              <span class="id-badge">
                <span>MAC: </span>
                <code>{{ device.device_uid }}</code>
                <el-icon class="copy-icon" @click="copyText(device.device_uid, '设备核心 ID')"><CopyDocument /></el-icon>
              </span>
              <span class="id-badge secondary">
                <span>平台ID: </span>
                <code>{{ device.id }}</code>
              </span>
            </div>
          </div>
        </div>

        <!-- 栏目2：绑定码专属控制面板 -->
        <div class="asset-col binding-col">
          <div class="binding-label">
            <el-icon><Key /></el-icon>
            <span>当前 Binding ID 认领码</span>
          </div>
          <div class="binding-value-box">
            <span class="binding-code">{{ device.binding_id }}</span>
            <el-tooltip content="点击复制绑定码" placement="top">
              <el-button
                type="primary"
                link
                :icon="CopyDocument"
                @click="copyText(device.binding_id, '绑定码')"
              />
            </el-tooltip>
          </div>
          <div class="binding-actions">
            <el-button
              type="warning"
              plain
              size="small"
              :icon="Switch"
              :loading="rotating"
              @click="confirmRotate"
            >
              轮换绑定码
            </el-button>
            <span class="binding-hint">轮换后旧码失效，归属不变</span>
          </div>
        </div>

        <!-- 栏目3：固件与硬件心跳 -->
        <div class="asset-col specs-col">
          <div class="spec-item">
            <span class="spec-label"><el-icon><Clock /></el-icon> 最近心跳</span>
            <span class="spec-val">{{ formatDateTime(device.last_seen_at) }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label"><el-icon><Connection /></el-icon> 固件版本</span>
            <el-tag size="small" type="info">{{ device.firmware_version || '未上报' }}</el-tag>
          </div>
          <div class="spec-item capabilities-box">
            <span class="spec-label">硬件能力</span>
            <div class="cap-tags">
              <template v-if="Object.keys(device.capabilities).length">
                <el-tag
                  v-for="(val, k) in device.capabilities"
                  :key="k"
                  size="small"
                  class="cap-tag"
                >
                  {{ k }}: {{ String(val) }}
                </el-tag>
              </template>
              <span v-else class="text-muted">暂无外设能力上报</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 下方选项卡容器 -->
      <el-card class="detail-tabs-card" shadow="never">
        <el-tabs v-model="activeTab" @tab-change="loadTab" class="custom-tabs">
          <!-- Tab 1: 人设配置 -->
          <el-tab-pane name="persona">
            <template #label>
              <span class="tab-label-custom">
                <el-icon><UserFilled /></el-icon>
                <span>人设配置与相处关系</span>
              </span>
            </template>

            <div class="tab-content-padded">
              <div class="tab-alert-box info">
                <el-icon><InfoFilled /></el-icon>
                <span>人设配置将在下一次设备语音会话生效。小智实时语音默认约 300 秒刷新 persona_pack，不会中途打断已有会话。</span>
              </div>

              <div v-if="!canEditPersona" class="tab-alert-box warning">
                <el-icon><WarningFilled /></el-icon>
                <span>该设备尚未由终端用户认领，暂无法进行人设参数的深度配置。</span>
              </div>

              <PageEmpty v-if="tabError.persona" :description="tabError.persona" retry-label="重新加载" @retry="loadPersona" />

              <div v-else v-loading="tabLoading.persona" class="persona-cards-grid">
                <!-- 卡片 A：核心星盘与原型 -->
                <div class="persona-subcard">
                  <div class="subcard-header">
                    <span class="step-num">01</span>
                    <div>
                      <strong>核心性格与星盘原型</strong>
                      <p>决定宠物的语气底色、心理防御机制与表达习惯</p>
                    </div>
                  </div>

                  <el-form label-position="top">
                    <div class="form-row-2">
                      <el-form-item label="太阳星座">
                        <el-select v-model="persona.sun_sign" :disabled="!canEditPersona" placeholder="选择星座" class="full-w">
                          <el-option v-for="item in signs" :key="item.value" :label="item.label" :value="item.value" />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="MBTI 心理原型">
                        <el-select v-model="persona.mbti" :disabled="!canEditPersona" placeholder="选择 MBTI" class="full-w">
                          <el-option v-for="item in mbtis" :key="item" :label="item" :value="item" />
                        </el-select>
                      </el-form-item>
                    </div>

                    <el-form-item label="与主人的相处纽带 (Bond)">
                      <div class="bond-pill" v-if="bond">
                        <span class="bond-kind">{{ relationshipKindLabels[bond.kind] || bond.label }}</span>
                        <span v-if="bond.summary" class="bond-summary"> — {{ bond.summary }}</span>
                        <el-tag size="small" effect="plain" class="bond-src">{{ bond.source === 'worker' ? 'Agent 推断' : '人工配置' }}</el-tag>
                      </div>
                      <div v-else class="text-muted font-13">暂无推断关系</div>
                    </el-form-item>

                    <el-form-item label="知识库版本追踪">
                      <div class="kb-switch-box">
                        <el-switch v-model="persona.follow_latest" :disabled="!canEditPersona" />
                        <span class="kb-switch-text">
                          {{ persona.follow_latest ? '跟随系统发布的最新知识库版本' : `钉扎在 v${persona.kb_version ?? '未指定'}` }}
                        </span>
                      </div>
                    </el-form-item>
                  </el-form>
                </div>

                <!-- 卡片 B：角色档案与目标 -->
                <div class="persona-subcard">
                  <div class="subcard-header">
                    <span class="step-num">02</span>
                    <div>
                      <strong>角色设定与拟人背景</strong>
                      <p>注入背景故事、身份定位与长远陪伴目标</p>
                    </div>
                  </div>

                  <el-form label-position="top">
                    <el-form-item label="宠物角色身份 (Identity)">
                      <el-input
                        v-model="persona.identity"
                        :disabled="!canEditPersona"
                        placeholder="例如：聪明、有点傲娇但默默守护主人的电子宠物"
                      />
                    </el-form-item>

                    <div class="form-row-2">
                      <el-form-item label="背景故事 (每行一项)">
                        <el-input
                          v-model="persona.background"
                          type="textarea"
                          :rows="3"
                          placeholder="例如：来自猎户座边缘的守护星灵"
                          :disabled="!canEditPersona"
                        />
                      </el-form-item>
                      <el-form-item label="核心角色定位 (每行一项)">
                        <el-input
                          v-model="persona.roles"
                          type="textarea"
                          :rows="3"
                          placeholder="例如：每日情绪观察员、生活小管家"
                          :disabled="!canEditPersona"
                        />
                      </el-form-item>
                    </div>

                    <el-form-item label="陪伴目标 (每行一项)">
                      <el-input
                        v-model="persona.goals"
                        type="textarea"
                        :rows="2"
                        placeholder="例如：让主人每天都拥有好心情"
                        :disabled="!canEditPersona"
                      />
                    </el-form-item>
                  </el-form>
                </div>

                <!-- 卡片 C：关系进化与规则 -->
                <div class="persona-subcard full-span">
                  <div class="subcard-header">
                    <span class="step-num">03</span>
                    <div>
                      <strong>相处演化与底层 Overrides</strong>
                      <p>配置动态进化规则与私有模型提示词覆写</p>
                    </div>
                  </div>

                  <el-form label-position="top">
                    <div class="form-row-2">
                      <el-form-item label="与主人的相处契约声明">
                        <el-input
                          v-model="persona.relationship"
                          placeholder="例如：彼此信任、互相吐槽的亲密战友"
                          :disabled="!canEditPersona"
                        />
                      </el-form-item>
                      <el-form-item label="性格进化规则 (每行一条)">
                        <el-input
                          v-model="persona.evolutionRules"
                          type="textarea"
                          :rows="2"
                          placeholder="例如：当主人情绪低落时，主动切换为温柔倾听模式"
                          :disabled="!canEditPersona"
                        />
                      </el-form-item>
                    </div>

                    <el-form-item label="底层 Overrides 配置 (JSON 格式)">
                      <el-input
                        v-model="persona.overridesText"
                        :disabled="!canEditPersona"
                        type="textarea"
                        :rows="3"
                        class="mono-font"
                      />
                    </el-form-item>

                    <div class="persona-submit-bar">
                      <el-button
                        type="primary"
                        size="large"
                        :disabled="!canEditPersona"
                        :loading="tabLoading.persona"
                        :icon="Check"
                        @click="savePersona"
                      >
                        {{ personaExists ? '保存人设配置' : '创建人设配置' }}
                      </el-button>
                    </div>
                  </el-form>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 2: 对话历史 -->
          <el-tab-pane name="messages">
            <template #label>
              <span class="tab-label-custom">
                <el-icon><ChatDotRound /></el-icon>
                <span>脱敏对话历史</span>
              </span>
            </template>

            <div class="tab-content-padded">
              <!-- 工具栏 -->
              <div class="filter-toolbar">
                <el-date-picker
                  v-model="messageRange"
                  type="datetimerange"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                />
                <el-button type="primary" :icon="Filter" :loading="tabLoading.messages" @click="searchMessages">
                  筛选
                </el-button>
                <el-button :icon="Refresh" @click="resetMessageFilters">重置</el-button>
              </div>

              <!-- 对话流卡片 -->
              <div v-loading="tabLoading.messages" class="messages-stream">
                <div
                  v-for="msg in messages"
                  :key="msg.id"
                  class="message-card"
                  :class="msg.role === 'user' ? 'msg-user' : 'msg-pet'"
                >
                  <div class="msg-header">
                    <span class="role-badge" :class="msg.role">
                      {{ msg.role === 'user' ? '用户发言' : 'AI 宠物回复' }}
                    </span>
                    <span class="msg-time">{{ formatDateTime(msg.created_at) }}</span>
                    <span v-if="msg.session_id" class="session-pill">Session: #{{ msg.session_id }}</span>
                  </div>
                  <div class="msg-body">
                    {{ msg.content_redacted }}
                  </div>
                </div>
              </div>

              <PageEmpty
                v-if="!tabLoading.messages && !messages.length"
                :description="tabError.messages || '暂无脱敏历史对话记录'"
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
            </div>
          </el-tab-pane>

          <!-- Tab 3: 记忆管理 -->
          <el-tab-pane name="memories">
            <template #label>
              <span class="tab-label-custom">
                <el-icon><Collection /></el-icon>
                <span>长期记忆库</span>
              </span>
            </template>

            <div class="tab-content-padded">
              <div class="filter-toolbar">
                <el-input
                  v-model="memoryQuery"
                  placeholder="搜索记忆标题或具体事实..."
                  :prefix-icon="Search"
                  clearable
                  @keyup.enter="loadMemories(0)"
                  class="search-input-w"
                />
                <el-select v-model="memoryStatus" placeholder="筛选记忆状态" clearable @change="loadMemories(0)">
                  <el-option label="待审核候选记忆" value="candidate" />
                  <el-option label="已生效正式记忆" value="active" />
                  <el-option label="已驳回/忽略记忆" value="rejected" />
                </el-select>
                <el-button type="primary" :icon="Filter" :loading="tabLoading.memories" @click="loadMemories(0)">
                  筛选
                </el-button>
              </div>

              <div v-loading="tabLoading.memories" class="memories-grid">
                <div
                  v-for="m in memories"
                  :key="m.id"
                  class="memory-card"
                  :class="m.status"
                >
                  <div class="memory-card-top">
                    <strong class="mem-title">{{ m.title || '无标题记忆碎片' }}</strong>
                    <el-tag
                      size="small"
                      :type="m.status === 'candidate' ? 'warning' : m.status === 'active' ? 'success' : 'info'"
                      effect="light"
                    >
                      {{ m.status === 'candidate' ? '待审核' : m.status === 'active' ? '已生效' : '已驳回' }}
                    </el-tag>
                  </div>
                  <p class="mem-content">{{ m.content }}</p>
                  <div class="memory-card-footer">
                    <span class="mem-src">来源: {{ m.source || 'agent' }}</span>
                    <div v-if="m.status === 'candidate'" class="mem-actions">
                      <el-button
                        type="success"
                        size="small"
                        plain
                        :icon="Check"
                        @click="reviewMemory(m, 'approve')"
                      >
                        采纳入库
                      </el-button>
                      <el-button
                        type="danger"
                        size="small"
                        plain
                        :icon="Close"
                        @click="reviewMemory(m, 'reject')"
                      >
                        驳回
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <PageEmpty
                v-if="!tabLoading.memories && !memories.length"
                :description="tabError.memories || '暂无长期记忆数据'"
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
            </div>
          </el-tab-pane>

          <!-- Tab 4: 外设状态 -->
          <el-tab-pane name="peripheral">
            <template #label>
              <span class="tab-label-custom">
                <el-icon><ViewIcon /></el-icon>
                <span>外设快照</span>
              </span>
            </template>

            <div class="tab-content-padded">
              <div v-if="peripheral" v-loading="tabLoading.peripheral" class="peripheral-board">
                <div class="peripheral-card">
                  <div class="card-title-row">
                    <el-icon class="icon-accent"><ViewIcon /></el-icon>
                    <strong>屏幕与眼睛情绪</strong>
                  </div>
                  <div class="metric-list">
                    <div class="metric-item">
                      <span class="k">眼睛当前情绪</span>
                      <el-tag size="small" type="primary">{{ peripheral.eye_emotion || '未上报' }}</el-tag>
                    </div>
                    <div class="metric-item">
                      <span class="k">视线注视方向</span>
                      <el-tag size="small" type="info">{{ peripheral.eye_gaze || '未上报' }}</el-tag>
                    </div>
                    <div class="metric-item">
                      <span class="k">闭眼休眠状态</span>
                      <el-tag size="small" :type="peripheral.eye_closed ? 'warning' : 'success'">
                        {{ peripheral.eye_closed === null ? '未知' : peripheral.eye_closed ? '闭眼' : '睁眼' }}
                      </el-tag>
                    </div>
                    <div class="metric-item">
                      <span class="k">快照上报时间</span>
                      <span class="v">{{ formatDateTime(peripheral.updated_at) }}</span>
                    </div>
                  </div>
                </div>

                <div class="peripheral-card">
                  <div class="card-title-row">
                    <el-icon class="icon-accent"><Connection /></el-icon>
                    <strong>扩展传感器与外设</strong>
                  </div>
                  <div v-if="Object.keys(peripheral.extra || {}).length" class="extra-tags">
                    <el-tag
                      v-for="(val, k) in peripheral.extra"
                      :key="k"
                      class="extra-tag"
                      effect="plain"
                    >
                      {{ k }}: {{ String(val) }}
                    </el-tag>
                  </div>
                  <div v-else class="text-muted font-13 padding-top-8">暂无扩展外设上报数据</div>
                </div>
              </div>

              <PageEmpty
                v-else
                :description="tabError.peripheral || (peripheralMissing ? '当前设备尚未产生外设快照数据' : '正在加载外设状态...')"
                :retry-label="tabLoading.peripheral ? undefined : '重新加载'"
                @retry="loadPeripheral"
              />
            </div>
          </el-tab-pane>

          <!-- Tab 5: 行为分析 -->
          <el-tab-pane name="analyses">
            <template #label>
              <span class="tab-label-custom">
                <el-icon><DataAnalysis /></el-icon>
                <span>Worker 行为分析</span>
              </span>
            </template>

            <div class="tab-content-padded">
              <div class="filter-toolbar">
                <el-select v-model="analysisKind" placeholder="全部分析类型" clearable @change="loadAnalyses(0)">
                  <el-option label="每日小记摘要 (daily_summary)" value="daily_summary" />
                  <el-option label="人设成长建议 (persona_growth)" value="persona_growth" />
                  <el-option label="长期记忆画像 (memory_profile)" value="memory_profile" />
                  <el-option label="亲密关系推断 (relationship_update)" value="relationship_update" />
                </el-select>
                <el-button type="primary" :icon="Filter" :loading="tabLoading.analyses" @click="loadAnalyses(0)">
                  筛选
                </el-button>
              </div>

              <div v-loading="tabLoading.analyses">
                <AnalysisCardList v-if="analyses.length" :items="analyses" />
                <PageEmpty
                  v-else-if="!tabLoading.analyses"
                  :description="tabError.analyses || '暂无分析记录。设备挂断会话后将由 Worker 自动生成每日小记与成长建议。'"
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
            </div>
          </el-tab-pane>

          <!-- Tab 6: 运势核对 -->
          <el-tab-pane name="fortune">
            <template #label>
              <span class="tab-label-custom">
                <el-icon><Opportunity /></el-icon>
                <span>运势核对</span>
              </span>
            </template>

            <div class="tab-content-padded">
              <div class="tab-alert-box info">
                <el-icon><InfoFilled /></el-icon>
                <span>只读核对面板：与用户端日运卡片同源。仅查询已有生成结果，不触发懒生成计算。</span>
              </div>

              <div class="filter-toolbar">
                <el-date-picker v-model="fortuneDate" type="date" value-format="YYYY-MM-DD" placeholder="查询日期（默认今天）" />
                <el-button type="primary" :icon="Search" :loading="tabLoading.fortune" @click="loadFortune()">
                  查询
                </el-button>
              </div>

              <div v-loading="tabLoading.fortune">
                <PageEmpty
                  v-if="fortuneNotConfigured"
                  description="设备尚未配置宠物人设（无星座），无法核对运势"
                />
                <PageEmpty
                  v-else-if="!fortune && !tabLoading.fortune"
                  :description="tabError.fortune || '该日期暂无运势生成记录'"
                  retry-label="重新加载"
                  @retry="loadFortune()"
                />
                <template v-else-if="fortune">
                  <div class="fortune-board">
                    <div class="fortune-header-card">
                      <div class="fortune-date-badge">{{ fortune.date }}</div>
                      <h3 class="fortune-greeting">"{{ fortune.greeting || '愿今日充满灵感与温柔！' }}"</h3>
                      <div class="fortune-meta-row">
                        <span>主人星座: <strong>{{ fortune.sign ? (signs.find((s) => s.value === fortune!.sign)?.label ?? fortune.sign) : '未录入' }}</strong></span>
                        <el-tag size="small" :type="fortune.generating ? 'warning' : 'success'">
                          {{ fortune.generating ? '正在生成中' : '已生成完成' }}
                        </el-tag>
                      </div>
                    </div>

                    <div v-if="fortune.sign_fortune" class="fortune-section-card">
                      <div class="fortune-sec-title">五维星座运势详情</div>
                      <div class="fortune-grid">
                        <div class="f-item overall">
                          <span class="f-label">综合总述</span>
                          <span class="f-text">{{ fortune.sign_fortune.overall || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">事业</span>
                          <span class="f-text">{{ fortune.sign_fortune.career || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">财运</span>
                          <span class="f-text">{{ fortune.sign_fortune.wealth || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">学业</span>
                          <span class="f-text">{{ fortune.sign_fortune.study || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">情感</span>
                          <span class="f-text">{{ fortune.sign_fortune.love || '无' }}</span>
                        </div>
                      </div>
                    </div>

                    <div v-if="fortune.bazi_fortune" class="fortune-section-card">
                      <div class="fortune-sec-title">八字专属排盘运势</div>
                      <div class="fortune-grid">
                        <div class="f-item overall">
                          <span class="f-label">八字总述</span>
                          <span class="f-text">{{ fortune.bazi_fortune.overall || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">事业</span>
                          <span class="f-text">{{ fortune.bazi_fortune.career || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">财运</span>
                          <span class="f-text">{{ fortune.bazi_fortune.wealth || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">学业</span>
                          <span class="f-text">{{ fortune.bazi_fortune.study || '无' }}</span>
                        </div>
                        <div class="f-item">
                          <span class="f-label">情感</span>
                          <span class="f-text">{{ fortune.bazi_fortune.love || '无' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </section>
</template>

<style scoped>
.device-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  border-radius: 8px;
}

.loading-box {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
}

/* 核心 Hero 资产看板 */
.hero-asset-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: var(--card-shadow);
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  overflow: hidden;
}

.asset-col {
  padding: 24px;
}

.identity-col {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  border-right: 1px solid #f1f5f9;
}

.asset-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.identity-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.device-main-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.id-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.id-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.id-badge code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #1e293b;
  font-weight: 500;
}

.copy-icon {
  cursor: pointer;
  color: #6366f1;
}

.copy-icon:hover {
  color: #4338ca;
}

/* 绑定码看板 */
.binding-col {
  background: #fafafa;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.binding-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.binding-value-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  padding: 8px 12px;
  border-radius: 8px;
}

.binding-code {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 14px;
  font-weight: 700;
  color: #4f46e5;
  letter-spacing: 0.5px;
}

.binding-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.binding-hint {
  font-size: 11px;
  color: #94a3b8;
}

/* 规格栏 */
.specs-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.spec-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  width: 72px;
  flex-shrink: 0;
}

.spec-val {
  color: #1e293b;
  font-weight: 500;
}

.capabilities-box {
  align-items: flex-start;
}

.cap-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cap-tag {
  font-size: 11px;
}

/* 下方 Tabs */
.detail-tabs-card {
  border-radius: 16px;
}

.custom-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f1f5f9;
}

.tab-label-custom {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.tab-content-padded {
  padding: 16px 0 8px;
}

.tab-alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 20px;
}

.tab-alert-box.info {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  color: #3730a3;
}

.tab-alert-box.warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

/* 人设卡片网格 */
.persona-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.persona-subcard {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.persona-subcard.full-span {
  grid-column: span 2;
}

.subcard-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.step-num {
  font-size: 14px;
  font-weight: 800;
  color: #6366f1;
  background: #eef2ff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.subcard-header strong {
  display: block;
  font-size: 15px;
  color: #0f172a;
}

.subcard-header p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-w {
  width: 100%;
}

.bond-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.bond-kind {
  font-weight: 600;
  color: #4f46e5;
}

.bond-summary {
  font-size: 12px;
  color: #475569;
}

.kb-switch-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kb-switch-text {
  font-size: 13px;
  color: #475569;
}

.mono-font :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
}

.persona-submit-bar {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 过滤工具栏 */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input-w {
  max-width: 320px;
}

/* 消息对话流 */
.messages-stream {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.message-card.msg-user {
  background: #f8fafc;
  border-left: 4px solid #6366f1;
}

.message-card.msg-pet {
  background: #f5f3ff;
  border-left: 4px solid #8b5cf6;
}

.msg-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
}

.role-badge {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.role-badge.user {
  background: #e0e7ff;
  color: #4338ca;
}

.role-badge.assistant {
  background: #ede9fe;
  color: #6d28d9;
}

.msg-time {
  color: #94a3b8;
}

.session-pill {
  color: #64748b;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
}

.msg-body {
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
}

/* 记忆网格 */
.memories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.memory-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--card-shadow);
}

.memory-card.candidate {
  border-color: #fde68a;
  background: #fffdf5;
}

.memory-card.active {
  border-left: 4px solid #10b981;
}

.memory-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.mem-title {
  font-size: 14px;
  color: #0f172a;
}

.mem-content {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  margin: 0 0 14px;
  flex: 1;
}

.memory-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.mem-src {
  font-size: 11px;
  color: #94a3b8;
}

.mem-actions {
  display: flex;
  gap: 8px;
}

/* 外设看板 */
.peripheral-board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.peripheral-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  margin-bottom: 16px;
  color: #0f172a;
}

.icon-accent {
  color: #6366f1;
}

.metric-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 8px;
}

.metric-item .k {
  color: #64748b;
}

.extra-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 运势看板 */
.fortune-board {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fortune-header-card {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  padding: 28px;
  border-radius: 14px;
}

.fortune-date-badge {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 10px;
}

.fortune-greeting {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 16px;
  letter-spacing: -0.3px;
}

.fortune-meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.fortune-section-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.fortune-sec-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 14px;
}

.fortune-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.f-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.f-item.overall {
  grid-column: span 4;
}

.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
}

.f-text {
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
}

@media (max-width: 960px) {
  .hero-asset-card {
    grid-template-columns: 1fr;
  }
  .asset-col {
    border-right: none !important;
    border-bottom: 1px solid #f1f5f9;
  }
  .persona-cards-grid {
    grid-template-columns: 1fr;
  }
  .persona-subcard.full-span {
    grid-column: span 1;
  }
  .form-row-2 {
    grid-template-columns: 1fr;
  }
  .peripheral-board {
    grid-template-columns: 1fr;
  }
  .fortune-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .f-item.overall {
    grid-column: span 2;
  }
}
</style>
