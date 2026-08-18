<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { register } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import { requestErrorMessage } from '../../utils/feedback'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ login_name: '', password: '', confirmPassword: '' })
const rules: FormRules = {
  login_name: [{ required: true, message: '请输入账号', trigger: 'blur' }, { min: 3, max: 64, message: '账号长度为 3–64 位', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 8, max: 128, message: '密码至少 8 位', trigger: 'blur' }],
  confirmPassword: [{ validator: (_rule, value, callback) => value === form.password ? callback() : callback(new Error('两次输入的密码不一致')), trigger: 'blur' }],
}

async function submit() {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    if (mode.value === 'register') {
      await register({ login_name: form.login_name, password: form.password })
      ElMessage.success('注册成功，请登录')
      mode.value = 'login'
    } else {
      await auth.signIn({ login_name: form.login_name, password: form.password })
      await router.replace((route.query.redirect as string) || '/devices')
    }
  } catch (error: any) {
    ElMessage.error(requestErrorMessage(error, '请求失败，请稍后重试'))
  } finally { loading.value = false }
}
</script>

<template>
  <main class="login-page">
    <el-card class="login-card" shadow="always">
      <h1>AI Pet 管理台</h1><p>管理你的设备与陪伴数据</p>
      <el-tabs v-model="mode" stretch><el-tab-pane label="登录" name="login" /><el-tab-pane label="注册" name="register" /></el-tabs>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="账号" prop="login_name"><el-input v-model="form.login_name" autocomplete="username" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input v-model="form.password" type="password" show-password autocomplete="current-password" /></el-form-item>
        <el-form-item v-if="mode === 'register'" label="确认密码" prop="confirmPassword"><el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" /></el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" class="submit">{{ mode === 'login' ? '登录' : '注册' }}</el-button>
      </el-form>
    </el-card>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: #f5f7fa; }
.login-card { width: min(100%, 400px); }.login-card h1 { margin: 0; font-size: 24px; }.login-card p { color: #6b7280; margin: 8px 0 20px; }.submit { width: 100%; }
</style>
