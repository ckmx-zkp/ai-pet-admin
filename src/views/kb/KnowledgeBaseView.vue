<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Search,
  Filter,
  Reading,
  Check,
  Close,
  Clock,
  Edit,
  Document
} from '@element-plus/icons-vue'
import {
  createMbtiDraft,
  createZodiacDraft,
  listKBFeedback,
  listMbtiKB,
  listZodiacKB,
  publishMbtiDraft,
  publishZodiacDraft,
  reviewKBFeedback,
  updateMbtiDraft,
  updateZodiacDraft,
  type KBEntry,
  type KBFeedback,
} from '../../api/kb'
import OffsetPager from '../../components/OffsetPager.vue'
import PageEmpty from '../../components/PageEmpty.vue'
import { requestErrorMessage } from '../../utils/feedback'

const active = ref('zodiac')
const loading = ref(false)
const loadError = ref('')
const entries = ref<KBEntry[]>([])
const feedback = ref<KBFeedback[]>([])
const status = ref('published')
const keyword = ref('')
const dialog = ref(false)
const editing = ref<KBEntry>()
const submitting = ref(false)
const offset = ref(0)
const pageSize = 20
const hasMore = ref(false)
const form = reactive({ level: 'sign', key: '', parent_key: '', payloadText: '{}' })
const historyDialog = ref(false)
const historyKey = ref('')
const historyRows = ref<KBEntry[]>([])

const ZODIAC_LABELS: Record<string, string> = {
  aries: '白羊座', taurus: '金牛座', gemini: '双子座', cancer: '巨蟹座',
  leo: '狮子座', virgo: '处女座', libra: '天秤座', scorpio: '天蝎座',
  sagittarius: '射手座', capricorn: '摩羯座', aquarius: '水瓶座', pisces: '双鱼座',
  fire: '火相', earth: '土相', air: '风相', water: '水相',
  cardinal: '基本宫', fixed: '固定宫', mutable: '变动宫',
}
const MBTI_LABELS: Record<string, string> = {
  INTJ: '建筑师', INTP: '逻辑学家', ENTJ: '指挥官', ENTP: '辩论家',
  INFJ: '提倡者', INFP: '调停者', ENFJ: '主人公', ENFP: '竞选者',
  ISTJ: '物流师', ISFJ: '守卫者', ESTJ: '总经理', ESFJ: '执政官',
  ISTP: '鉴赏家', ISFP: '探险家', ESTP: '企业家', ESFP: '表演者',
}
const LEVEL_LABELS: Record<string, string> = { element: '四元素', sign: '星座', modality: '三动力' }

function keyLabel(key: string): string {
  return ZODIAC_LABELS[key] || MBTI_LABELS[key.toUpperCase()] || ''
}
function levelLabel(level?: string): string {
  return level ? LEVEL_LABELS[level] || level : ''
}

function pretty(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
}

function latestPerKey(rows: KBEntry[]): KBEntry[] {
  const byKey = new Map<string, KBEntry>()
  for (const row of rows) {
    const current = byKey.get(row.key)
    if (!current || row.version > current.version) byKey.set(row.key, row)
  }
  return [...byKey.values()]
}

function showHistory(key: string) {
  historyKey.value = key
  historyRows.value = entries.value.filter((row) => row.key === key).sort((a, b) => b.version - a.version)
  historyDialog.value = true
}

const displayedEntries = computed(() => {
  if (status.value !== 'published') return entries.value
  return latestPerKey(entries.value).sort((a, b) => a.key.localeCompare(b.key))
})

function summarizePayload(payload: Record<string, unknown>): string {
  const fragments = payload.prompt_fragments
  if (Array.isArray(fragments) && fragments.length) return fragments.map((item) => String(item)).join(' ').slice(0, 160)
  const summary = payload.summary
  if (typeof summary === 'string' && summary.trim()) return summary
  const keys = Object.keys(payload)
  if (!keys.length) return '空内容'
  return keys.slice(0, 6).join('、')
}

async function load(nextOffset = offset.value) {
  loading.value = true
  loadError.value = ''
  try {
    if (active.value === 'feedback') {
      const result = (await listKBFeedback({ status: status.value || undefined, limit: pageSize, offset: nextOffset })).data
      feedback.value = result
      entries.value = []
      hasMore.value = result.length === pageSize
    } else {
      const request = active.value === 'zodiac' ? listZodiacKB : listMbtiKB
      const result = (await request({
        status: status.value || undefined,
        key: keyword.value || undefined,
        limit: pageSize,
        offset: nextOffset,
      })).data
      entries.value = result
      feedback.value = []
      hasMore.value = result.length === pageSize
    }
    offset.value = nextOffset
  } catch (error: unknown) {
    loadError.value = requestErrorMessage(error, '知识库加载失败')
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

function openDraft(entry?: KBEntry) {
  editing.value = entry
  form.level = entry?.level || 'sign'
  form.key = entry?.key || ''
  form.parent_key = entry?.parent_key || ''
  form.payloadText = pretty(entry?.payload || {})
  dialog.value = true
}

async function saveDraft() {
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(form.payloadText)
  } catch {
    ElMessage.error('内容必须是合法 JSON 对象')
    return
  }
  submitting.value = true
  try {
    const body = active.value === 'zodiac'
      ? { level: form.level as 'element' | 'sign' | 'modality', key: form.key, parent_key: form.parent_key || null, payload }
      : { key: form.key, payload }
    if (active.value === 'zodiac') {
      editing.value ? await updateZodiacDraft(editing.value.id, body as never) : await createZodiacDraft(body as never)
    } else {
      editing.value ? await updateMbtiDraft(editing.value.id, body) : await createMbtiDraft(body)
    }
    dialog.value = false
    ElMessage.success('草稿已保存')
    load(0)
  } catch (error: unknown) {
    ElMessage.error(requestErrorMessage(error, '草稿保存失败'))
  } finally {
    submitting.value = false
  }
}

async function publish(entry: KBEntry) {
  try {
    await ElMessageBox.confirm(`发布 ${entry.key} v${entry.version} 后将不可修改并即刻对跟随最新版本的宠物生效。是否继续？`, '确认发布', { type: 'warning' })
    active.value === 'zodiac' ? await publishZodiacDraft(entry.id) : await publishMbtiDraft(entry.id)
    ElMessage.success('知识库已成功发布并版本升级')
    load(offset.value)
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(requestErrorMessage(error, '发布失败'))
  }
}

async function review(item: KBFeedback, action: 'accept' | 'ignore') {
  try {
    await reviewKBFeedback(item.id, action)
    ElMessage.success(action === 'accept' ? '已接受候选并形成新草稿' : '已忽略候选')
    load(offset.value)
  } catch (error: unknown) {
    ElMessage.error(requestErrorMessage(error, '审核失败'))
  }
}

function changeTab() {
  status.value = active.value === 'feedback' ? 'pending' : 'published'
  keyword.value = ''
  load(0)
}

onMounted(() => load(0))
</script>

<template>
  <section class="kb-page">
    <div class="header-section">
      <div>
        <h1 class="page-title">知识库运营中心</h1>
        <p class="page-subtitle">
          编排拟人人设话术片段（星座、MBTI 原型与语气特征）；严格遵守契约红线：已发布版本不可变，修改需通过草稿发布新版。
        </p>
      </div>
      <el-button
        v-if="active !== 'feedback'"
        type="primary"
        size="large"
        :icon="Plus"
        @click="openDraft()"
      >
        新建知识库草稿
      </el-button>
    </div>

    <!-- 顶部导航与筛选工具栏卡片 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar-inner">
        <el-tabs v-model="active" @tab-change="changeTab" class="kb-tabs">
          <el-tab-pane label="星座与元素库" name="zodiac" />
          <el-tab-pane label="MBTI 心理原型" name="mbti" />
          <el-tab-pane label="用户反馈候选审核" name="feedback" />
        </el-tabs>

        <div class="filters-row">
          <el-select v-model="status" placeholder="状态筛选" @change="load(0)" class="status-select">
            <el-option label="已发布（生效中）" value="published" />
            <el-option label="草稿状态" value="draft" />
            <el-option v-if="active === 'feedback'" label="待审核候选" value="pending" />
            <el-option label="全部状态" value="" />
          </el-select>

          <el-input
            v-if="active !== 'feedback'"
            v-model="keyword"
            placeholder="按键值搜索（如 pisces / INFP）"
            :prefix-icon="Search"
            clearable
            @keyup.enter="load(0)"
            class="search-input"
          />

          <el-button :icon="Refresh" :loading="loading" @click="load(offset)">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 列表数据卡片 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-if="active !== 'feedback'"
        v-loading="loading"
        :data="displayedEntries"
        empty-text=" "
        style="width: 100%"
      >
        <el-table-column label="名称与键值" min-width="170">
          <template #default="{ row }">
            <div class="key-cell">
              <strong class="key-name">{{ keyLabel(row.key) || row.key }}</strong>
              <span class="key-code">({{ row.key }})</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column v-if="active === 'zodiac'" label="维度分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ levelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="发布版本" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" class="version-tag">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'" effect="light">
              {{ row.status === 'published' ? '已发布' : '草稿未发布' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Prompt 片段内容摘要" min-width="320">
          <template #default="{ row }">
            <span class="summary-text">{{ summarizePayload(row.payload) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button v-if="row.status === 'draft'" link type="primary" :icon="Edit" @click="openDraft(row)">
                编辑
              </el-button>
              <el-button v-if="row.status === 'draft'" link type="success" :icon="Check" @click="publish(row)">
                发布
              </el-button>
              <el-button v-if="status === 'published'" link type="info" :icon="Clock" @click="showHistory(row.key)">
                历史
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 反馈审核表格 -->
      <el-table
        v-else
        v-loading="loading"
        :data="feedback"
        empty-text=" "
        style="width: 100%"
      >
        <el-table-column prop="kind" label="反馈类型" width="140">
          <template #default="{ row }">
            <el-tag size="small">{{ row.kind }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="建议话术内容" min-width="400">
          <template #default="{ row }">
            <span class="summary-text">{{ summarizePayload(row.payload) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : 'info'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="success" plain @click="review(row, 'accept')">
              采纳
            </el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" plain @click="review(row, 'ignore')">
              忽略
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <PageEmpty
        v-if="!loading && (active === 'feedback' ? !feedback.length : !entries.length)"
        :description="loadError || (active === 'feedback' ? '暂无待审核的用户反馈' : '暂无知识库条目')"
        retry-label="重新加载"
        @retry="load(offset)"
      />

      <OffsetPager
        :offset="offset"
        :page-size="pageSize"
        :has-more="hasMore"
        :loading="loading"
        @change="load"
      />
    </el-card>

    <!-- 编辑/新建草稿对话框 -->
    <el-dialog
      v-model="dialog"
      :title="editing ? '编辑知识库草稿' : '新建知识库草稿'"
      width="min(92vw, 700px)"
      class="custom-dialog"
    >
      <el-form label-position="top">
        <el-form-item v-if="active === 'zodiac'" label="分类层级">
          <el-select v-model="form.level" class="full-w">
            <el-option label="四元素 (element)" value="element" />
            <el-option label="星座 (sign)" value="sign" />
            <el-option label="动力模式 (modality)" value="modality" />
          </el-select>
        </el-form-item>

        <el-form-item label="标识键值 (Key)">
          <el-input v-model="form.key" placeholder="例如 pisces 或 INFP" />
        </el-form-item>

        <el-form-item v-if="active === 'zodiac'" label="父键 Parent Key（如星座所属元素）">
          <el-input v-model="form.parent_key" placeholder="例如 water" />
        </el-form-item>

        <el-form-item label="话术片段内容 (Payload JSON)">
          <el-input
            v-model="form.payloadText"
            type="textarea"
            :rows="11"
            class="mono-font"
            placeholder='{"prompt_fragments": ["语气温柔贴心", "喜欢观察星象"], "taboo": []}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveDraft">
          保存知识库草稿
        </el-button>
      </template>
    </el-dialog>

    <!-- 历史版本对话框 -->
    <el-dialog
      v-model="historyDialog"
      :title="`${keyLabel(historyKey) || historyKey} 历史版本追溯`"
      width="min(92vw, 720px)"
    >
      <el-table :data="historyRows" empty-text="暂无历史版本记录">
        <el-table-column label="版本" width="90">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'" size="small">
              {{ row.status === 'published' ? '已生效发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ row.updated_at }}</template>
        </el-table-column>
        <el-table-column label="内容摘要" min-width="240">
          <template #default="{ row }">
            <span class="summary-text">{{ summarizePayload(row.payload) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="historyDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.kb-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  max-width: 800px;
}

.toolbar-card {
  border-radius: 14px;
}

.toolbar-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.kb-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f1f5f9;
}

.filters-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.status-select {
  width: 180px;
}

.search-input {
  max-width: 320px;
}

.table-card {
  border-radius: 14px;
}

.key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-name {
  color: #0f172a;
  font-size: 14px;
}

.key-code {
  font-size: 12px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.version-tag {
  font-weight: 600;
}

.summary-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.full-w {
  width: 100%;
}

.mono-font :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 860px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
}
</style>
