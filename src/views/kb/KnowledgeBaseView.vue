<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
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

function pretty(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
}

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
        <p>已发布条目不可修改；请先创建或编辑草稿，再人工确认发布。</p>
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
    <el-table v-if="active !== 'feedback'" v-loading="loading" :data="entries" empty-text=" ">
      <el-table-column prop="key" label="键值" min-width="120" />
      <el-table-column v-if="active === 'zodiac'" prop="level" label="层级" width="100" />
      <el-table-column prop="version" label="版本" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : 'warning'">{{ row.status === 'published' ? '已发布' : '草稿' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="内容摘要" min-width="320">
        <template #default="{ row }">{{ summarizePayload(row.payload) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button v-if="row.status === 'draft'" link type="primary" @click="openDraft(row)">编辑</el-button>
          <el-button v-if="row.status === 'draft'" link type="success" @click="publish(row)">发布</el-button>
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
  </section>
</template>

<style scoped>
.heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.heading h1 { margin: 0 0 6px; }
.heading p { margin: 0; color: #6b7280; }
.filters { display: flex; gap: 12px; margin: 0 0 16px; }
.filters .el-input { max-width: 360px; }
@media (max-width: 680px) {
  .heading, .filters { align-items: stretch; flex-direction: column; }
  .filters .el-input { max-width: none; }
}
</style>
