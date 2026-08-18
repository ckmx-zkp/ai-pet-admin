<script setup lang="ts">
defineProps<{
  offset: number
  pageSize: number
  hasMore: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ change: [offset: number] }>()
</script>

<template>
  <div class="pager">
    <el-button :disabled="offset === 0 || loading" @click="emit('change', Math.max(0, offset - pageSize))">上一页</el-button>
    <span>第 {{ Math.floor(offset / pageSize) + 1 }} 页</span>
    <el-button :disabled="!hasMore || loading" @click="emit('change', offset + pageSize)">下一页</el-button>
  </div>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 16px; }
@media (max-width: 680px) { .pager { justify-content: space-between; } }
</style>
