<script setup lang="ts">
defineProps<{
  description: string
  retryLabel?: string
}>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <el-empty :description="description">
    <el-button v-if="retryLabel" type="primary" @click="emit('retry')">{{ retryLabel }}</el-button>
    <slot />
  </el-empty>
</template>
