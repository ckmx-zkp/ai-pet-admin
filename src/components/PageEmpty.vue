<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'

defineProps<{
  description: string
  retryLabel?: string
}>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="empty-container">
    <el-empty :description="description" :image-size="120">
      <template #description>
        <p class="empty-desc">{{ description }}</p>
      </template>
      <el-button
        v-if="retryLabel"
        type="primary"
        plain
        :icon="Refresh"
        @click="emit('retry')"
        class="retry-btn"
      >
        {{ retryLabel }}
      </el-button>
      <slot />
    </el-empty>
  </div>
</template>

<style scoped>
.empty-container {
  padding: 40px 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  margin: 16px 0;
}

.empty-desc {
  font-size: 14px;
  color: #64748b;
  margin: 12px 0 16px;
}

.retry-btn {
  border-radius: 8px;
  padding: 8px 18px;
}
</style>
