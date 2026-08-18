<script setup lang="ts">
import { formatDateTime } from '../utils/feedback'
import type { Analysis } from '../api/adminDevices'

defineProps<{ items: Analysis[] }>()

const kindLabels: Record<string, string> = {
  daily_summary: '每日摘要',
  persona_growth: '人设成长建议',
  memory_profile: '记忆画像',
  relationship_update: '关系推断',
}

const relationshipKindLabels: Record<string, string> = {
  partner: '情感伴侣',
  rebellious_child: '逆子',
  beloved_child: '爱子',
  love_hate: '相爱相杀',
  confidant: '知己',
  companion: '陪伴伙伴',
  guardian: '守护者',
}

const decisionLabels: Record<string, string> = {
  approve: '建议采纳',
  candidate: '待审核',
  reject: '建议忽略',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

function isEmptySummary(payload: Record<string, unknown>): boolean {
  return payload.empty === true || (!payload.summary && asTextList(payload.topics).length === 0 && asTextList(payload.follow_up).length === 0)
}

function confidenceText(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '未给出'
  const ratio = value > 1 ? value / 100 : value
  return `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}%`
}

function fieldEntries(payload: Record<string, unknown>): Array<{ key: string; text: string }> {
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, text: stringifyValue(value) }))
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((item) => stringifyValue(item)).filter(Boolean).join('、')
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}：${stringifyValue(item)}`)
      .join('；')
  }
  return ''
}

function kindLabel(kind: string): string {
  return kindLabels[kind] || kind
}

function statusType(kind: string, payload: Record<string, unknown>): 'success' | 'warning' | 'info' | 'danger' {
  if (kind === 'daily_summary' && isEmptySummary(payload)) return 'info'
  if (kind === 'memory_profile' && payload.memory_count === 0) return 'info'
  if (payload.applied === true) return 'success'
  const decision = String(payload.decision || '')
  if (decision === 'approve') return 'success'
  if (decision === 'reject') return 'danger'
  if (decision === 'candidate') return 'warning'
  if (kind === 'relationship_update') return decision === 'hold' ? 'info' : 'success'
  if (payload.status === 'failed' || payload.error) return 'danger'
  if (payload.status === 'pending' || payload.status === 'running') return 'warning'
  return 'info'
}

function statusText(kind: string, payload: Record<string, unknown>): string {
  if (payload.status === 'pending' || payload.status === 'running') return '生成中'
  if (payload.status === 'failed' || payload.error) return '生成失败'
  if (kind === 'daily_summary' && isEmptySummary(payload)) return '无足够内容'
  if (kind === 'memory_profile' && payload.memory_count === 0) return '暂无记忆'
  if (kind === 'relationship_update') return payload.decision === 'hold' ? '证据不足' : '已推断'
  if (payload.applied === true) return '已应用'
  if (typeof payload.decision === 'string' && decisionLabels[payload.decision]) return decisionLabels[payload.decision]
  return '已生成'
}
</script>

<template>
  <div class="cards">
    <el-card v-for="item in items" :key="item.id" class="card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <strong>{{ kindLabel(item.kind) }}</strong>
            <p>{{ formatDateTime(item.created_at) }}</p>
          </div>
          <el-tag :type="statusType(item.kind, asRecord(item.payload))" size="small">
            {{ statusText(item.kind, asRecord(item.payload)) }}
          </el-tag>
        </div>
      </template>

      <template v-if="item.kind === 'daily_summary'">
        <el-empty v-if="isEmptySummary(asRecord(item.payload))" description="本次会话没有足够内容生成摘要" :image-size="64" />
        <el-descriptions v-else :column="1" border>
          <el-descriptions-item label="摘要">{{ String(asRecord(item.payload).summary || '暂无') }}</el-descriptions-item>
          <el-descriptions-item label="情绪">{{ String(asRecord(item.payload).user_mood || '未标注') }}</el-descriptions-item>
          <el-descriptions-item label="主题">
            <el-tag v-for="topic in asTextList(asRecord(item.payload).topics)" :key="topic" size="small" class="chip">{{ topic }}</el-tag>
            <span v-if="!asTextList(asRecord(item.payload).topics).length">暂无</span>
          </el-descriptions-item>
          <el-descriptions-item label="跟进建议">
            <ul v-if="asTextList(asRecord(item.payload).follow_up).length" class="list">
              <li v-for="line in asTextList(asRecord(item.payload).follow_up)" :key="line">{{ line }}</li>
            </ul>
            <span v-else>暂无</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <template v-else-if="item.kind === 'persona_growth'">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="建议">{{ String(asRecord(item.payload).summary || '暂无') }}</el-descriptions-item>
          <el-descriptions-item label="置信度">{{ confidenceText(asRecord(item.payload).confidence) }}</el-descriptions-item>
          <el-descriptions-item label="证据">
            <ul v-if="asTextList(asRecord(item.payload).evidence).length" class="list">
              <li v-for="line in asTextList(asRecord(item.payload).evidence)" :key="line">{{ line }}</li>
            </ul>
            <span v-else>暂无</span>
          </el-descriptions-item>
          <el-descriptions-item label="建议覆盖项">
            <ul v-if="fieldEntries(asRecord(asRecord(item.payload).suggested_overrides)).length" class="list">
              <li v-for="entry in fieldEntries(asRecord(asRecord(item.payload).suggested_overrides))" :key="entry.key">
                {{ entry.key }}：{{ entry.text }}
              </li>
            </ul>
            <span v-else>无建议覆盖项</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <template v-else-if="item.kind === 'memory_profile'">
        <el-empty v-if="asRecord(item.payload).memory_count === 0" description="暂无已确认的长期记忆" :image-size="64" />
        <el-descriptions v-else :column="1" border>
          <el-descriptions-item label="陪伴影响">{{ String(asRecord(item.payload).companion_impact || '暂无') }}</el-descriptions-item>
          <el-descriptions-item label="记忆条目">
            <ul v-if="Array.isArray(asRecord(item.payload).remembered) && (asRecord(item.payload).remembered as unknown[]).length" class="list">
              <li v-for="(entry, index) in (asRecord(item.payload).remembered as Array<Record<string, unknown>>)" :key="index">
                <strong>{{ String(entry.title || '未命名') }}</strong>：{{ String(entry.summary || '') }}
                <template v-if="asTextList(entry.tags).length"> ({{ asTextList(entry.tags).join('、') }})</template>
              </li>
            </ul>
            <span v-else>暂无</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <template v-else-if="item.kind === 'relationship_update'">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="推断关系">{{ relationshipKindLabels[String(asRecord(item.payload).kind || '')] || String(asRecord(item.payload).label || '暂无') }}</el-descriptions-item>
          <el-descriptions-item label="说明">{{ String(asRecord(item.payload).summary || '暂无') }}</el-descriptions-item>
          <el-descriptions-item label="置信度">{{ confidenceText(asRecord(item.payload).confidence) }}</el-descriptions-item>
          <el-descriptions-item label="证据">
            <ul v-if="asTextList(asRecord(item.payload).evidence).length" class="list">
              <li v-for="line in asTextList(asRecord(item.payload).evidence)" :key="line">{{ line }}</li>
            </ul>
            <span v-else>暂无</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <el-descriptions v-else :column="1" border>
        <el-descriptions-item v-for="entry in fieldEntries(asRecord(item.payload))" :key="entry.key" :label="entry.key">
          {{ entry.text || '—' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.cards { display: grid; gap: 16px; }
.card-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.card-head p { margin: 6px 0 0; color: #6b7280; }
.chip { margin: 0 6px 4px 0; }
.list { margin: 0; padding-left: 18px; }
.list li + li { margin-top: 4px; }
</style>
