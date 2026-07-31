<script setup lang="ts">
defineProps<{ id: string }>()
</script>

<template>
  <section><el-page-header content="设备详情" @back="$router.push('/devices')" /><el-empty description="设备详情接口将在后端设备模块上线后启用。"><el-button type="primary" @click="$router.push('/devices')">返回设备列表</el-button></el-empty></section>
</template>
