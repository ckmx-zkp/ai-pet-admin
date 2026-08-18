<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const LEVEL_LABELS: Record<string, string> = { element: '元素', sign: '星座', modality: '模式' }

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
    await ElMessageBox.confirm(`发布 ${entry.key} v${entry.version} 后将不可修改。是否继续？`, '确认发布', { type: 'warning' })
    active.value === 'zodiac' ? await publishZodiacDraft(entry.id) : await publishMbtiDraft(entry.id)
    ElMessage.success('已发布')
    load(offset.value)
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(requestErrorMessage(error, '发布失败'))
  }
}

async function review(item: KBFeedback, action: 'accept' | 'ignore') {
  try {
    await reviewKBFeedback(item.id, action)
    ElMessage.success(action === 'accept' ? '已接受候选' : '已忽略候选')
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
  <section>
    <div class="heading">
      <div>
        <h1>知识库运营</h1>
        <p>这里管理 AI 和用户聊天时使用的「人设话术片段」——按星座、MBTI 性格类型配置不同的语气和沟通方式。已发布内容不可直接修改，需先创建或编辑草稿，人工确认后再发布新版本（旧版本历史仍会保留，供追溯）。</p>
      </div>
      <el-button v-if="active !== 'feedback'" type="primary" @click="openDraft()">新建草稿</el-button>
    </div>
    <el-tabs v-model="active" @tab-change="changeTab">
      <el-tab-pane label="星座与元素" name="zodiac" />
      <el-tab-pane label="MBTI" name="mbti" />
      <el-tab-pane label="反馈审核" name="feedback" />
    </el-tabs>
    <div class="filters">
      <el-select v-model="status" @change="load(0)">
        <el-option label="已发布" value="published" />
        <el-option label="草稿" value="draft" />
        <el-option v-if="active === 'feedback'" label="待审核" value="pending" />
        <el-option label="全部状态" value="" />
      </el-select>
      <el-input v-if="active !== 'feedback'" v-model="keyword" placeholder="按键值筛选" clearable @keyup.enter="load(0)" />
      <el-button :loading="loading" @click="load(offset)">刷新</el-button>
    </div>
    <el-table v-if="active !== 'feedback'" v-loading="loading" :data="displayedEntries" empty-text=" ">
      <el-table-column label="名称" min-width="160">
        <template #default="{ row }">
          <div class="key-cell">
            <strong>{{ keyLabel(row.key) || row.key }}</strong>
            <span v-if="keyLabel(row.key)" class="key-code">{{ row.key }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="active === 'zodiac'" label="分类" width="100">
        <template #default="{ row }">{{ levelLabel(row.level) }}</template>
      </el-table-column>
      <el-table-column label="当前版本" width="100">
        <template #default="{ row }">v{{ row.version }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : 'warning'">{{ row.status === 'published' ? '已发布（生效中）' : '草稿（未生效）' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="话术内容摘要" min-width="320">
        <template #default="{ row }">{{ summarizePayload(row.payload) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="row.status === 'draft'" link type="primary" @click="openDraft(row)">编辑</el-button>
          <el-button v-if="row.status === 'draft'" link type="success" @click="publish(row)">发布</el-button>
          <el-button v-if="status === 'published'" link @click="showHistory(row.key)">历史版本</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-table v-else v-loading="loading" :data="feedback" empty-text=" ">
      <el-table-column prop="kind" label="类型" width="130" />
      <el-table-column label="内容摘要" min-width="400">
        <template #default="{ row }">{{ summarizePayload(row.payload) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="success" @click="review(row, 'accept')">接受</el-button>
          <el-button v-if="row.status === 'pending'" link type="danger" @click="review(row, 'ignore')">忽略</el-button>
        </template>
      </el-table-column>
    </el-table>
    <PageEmpty
      v-if="!loading && (active === 'feedback' ? !feedback.length : !entries.length)"
      :description="loadError || (active === 'feedback' ? '暂无待审核反馈' : '暂无条目')"
      retry-label="重新加载"
      @retry="load(offset)"
    />
    <OffsetPager :offset="offset" :page-size="pageSize" :has-more="hasMore" :loading="loading" @change="load" />
    <el-dialog v-model="dialog" :title="editing ? '编辑知识库草稿' : '新建知识库草稿'" width="min(92vw, 680px)">
      <el-form label-position="top">
        <el-form-item v-if="active === 'zodiac'" label="层级">
          <el-select v-model="form.level">
            <el-option label="元素" value="element" />
            <el-option label="星座" value="sign" />
            <el-option label="模式" value="modality" />
          </el-select>
        </el-form-item>
        <el-form-item label="键值">
          <el-input v-model="form.key" placeholder="例如 pisces 或 INFP" />
        </el-form-item>
        <el-form-item v-if="active === 'zodiac'" label="父键（星座填写所属元素）">
          <el-input v-model="form.parent_key" placeholder="例如 water" />
        </el-form-item>
        <el-form-item label="内容（JSON）">
          <el-input v-model="form.payloadText" type="textarea" :rows="10" placeholder='例如 {"prompt_fragments":["..."],"taboo":[]}' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveDraft">保存草稿</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="historyDialog" :title="`${keyLabel(historyKey) || historyKey} 历史版本`" width="min(92vw, 640px)">
      <el-table :data="historyRows" empty-text="暂无历史版本">
        <el-table-column label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'">{{ row.status === 'published' ? '已发布（生效中）' : '草稿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ row.updated_at }}</template>
        </el-table-column>
        <el-table-column label="内容摘要" min-width="260">
          <template #default="{ row }">{{ summarizePayload(row.payload) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="historyDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.heading h1 { margin: 0 0 6px; }
.heading p { margin: 0; color: #6b7280; }
.filters { display: flex; gap: 12px; margin: 0 0 16px; }
.filters .el-input { max-width: 360px; }
.key-cell { display: flex; align-items: baseline; gap: 6px; }
.key-code { color: #9ca3af; font-size: 12px; }
@media (max-width: 680px) {
  .heading, .filters { align-items: stretch; flex-direction: column; }
  .filters .el-input { max-width: none; }
}
</style>
