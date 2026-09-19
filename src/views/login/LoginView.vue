<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Key, Cpu, Collection, TrendCharts } from '@element-plus/icons-vue'
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
  login_name: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 64, message: '账号长度为 3–64 位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 128, message: '密码至少 8 位', trigger: 'blur' }
  ],
  confirmPassword: [
    {
      validator: (_rule, value, callback) =>
        value === form.password ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: 'blur'
    }
  ]
}

async function submit() {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    if (mode.value === 'register') {
      await register({ login_name: form.login_name, password: form.password })
      ElMessage.success('注册成功，请使用新账号登录')
      mode.value = 'login'
    } else {
      await auth.signIn({ login_name: form.login_name, password: form.password })
      ElMessage.success('登录成功，欢迎进入管理台')
      await router.replace((route.query.redirect as string) || '/devices')
    }
  } catch (error: unknown) {
    ElMessage.error(requestErrorMessage(error, '请求失败，请稍后重试'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-wrapper">
    <div class="login-container">
      <!-- 左侧品牌展示区 -->
      <section class="brand-hero">
        <div class="brand-badge">
          <span class="badge-dot"></span>
          <span>AI Pet Cloud Platform</span>
        </div>
        <div class="brand-title-group">
          <div class="brand-logo-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#star-grad)" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="star-grad" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#818cf8"/>
                  <stop offset="1" stop-color="#4f46e5"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 class="hero-heading">AI Pet 管理台</h1>
        </div>
        <p class="hero-desc">智能硬件设备接入 · 拟人人设编排 · 记忆演化与运营看板</p>

        <div class="feature-list">
          <div class="feature-item">
            <el-icon class="feature-icon"><Cpu /></el-icon>
            <div>
              <strong>设备全息诊断</strong>
              <span>MAC/SN 反查、Binding ID 轮换与在线心跳监测</span>
            </div>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><TrendCharts /></el-icon>
            <div>
              <strong>人设与关系演化</strong>
              <span>MBTI × 星座核心人设、27 类亲密相处关系推断</span>
            </div>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><Collection /></el-icon>
            <div>
              <strong>记忆与知识库运营</strong>
              <span>长期记忆画像提取、候选审核与分级知识库发布</span>
            </div>
          </div>
        </div>

        <div class="hero-footer">
          <span>守护星 AI Pet 研发运营中心 &copy; 2026</span>
        </div>
      </section>

      <!-- 右侧登录/注册表单区 -->
      <section class="form-section">
        <div class="form-card">
          <div class="form-header">
            <h2>{{ mode === 'login' ? '欢迎登录管理台' : '新建运营者账号' }}</h2>
            <p>{{ mode === 'login' ? '请输入您的凭据以访问控制台' : '注册后可立即管理授权范围内的资产' }}</p>
          </div>

          <el-tabs v-model="mode" class="auth-tabs" stretch>
            <el-tab-pane label="账号登录" name="login" />
            <el-tab-pane label="注册账号" name="register" />
          </el-tabs>

          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit" class="auth-form">
            <el-form-item label="登录账号" prop="login_name">
              <el-input
                v-model="form.login_name"
                :prefix-icon="User"
                placeholder="请输入用户名（3-64位）"
                size="large"
                autocomplete="username"
                clearable
              />
            </el-form-item>

            <el-form-item label="登录密码" prop="password">
              <el-input
                v-model="form.password"
                :prefix-icon="Lock"
                type="password"
                placeholder="请输入密码（至少8位）"
                size="large"
                show-password
                autocomplete="current-password"
              />
            </el-form-item>

            <el-form-item v-if="mode === 'register'" label="确认密码" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                :prefix-icon="Key"
                type="password"
                placeholder="请再次输入确认密码"
                size="large"
                show-password
                autocomplete="new-password"
              />
            </el-form-item>

            <div class="form-actions">
              <el-button
                type="primary"
                native-type="submit"
                :loading="loading"
                size="large"
                class="submit-btn"
              >
                {{ mode === 'login' ? '立即登录' : '确认注册并进入' }}
              </el-button>
            </div>
          </el-form>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 10% 20%, #eef2ff 0%, #f8fafc 90%);
  padding: 24px;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 1080px;
  min-height: 620px;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.05);
}

/* 左侧品牌 Hero 区域 */
.brand-hero {
  flex: 1.1;
  background: linear-gradient(145deg, #1e1b4b 0%, #1e293b 100%);
  color: #ffffff;
  padding: 56px 48px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.brand-hero::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -80px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #c7d2fe;
  width: fit-content;
  margin-bottom: 32px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #818cf8;
  box-shadow: 0 0 8px #818cf8;
}

.brand-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.brand-logo-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.hero-heading {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 40px;
  line-height: 1.6;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.2s ease;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.feature-icon {
  font-size: 22px;
  color: #818cf8;
  padding-top: 2px;
}

.feature-item strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 2px;
}

.feature-item span {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}

.hero-footer {
  margin-top: 32px;
  font-size: 12px;
  color: #64748b;
}

/* 右侧表单区 */
.form-section {
  flex: 1;
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  width: 100%;
  max-width: 380px;
}

.form-header {
  margin-bottom: 24px;
}

.form-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
}

.form-header p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.auth-tabs {
  margin-bottom: 24px;
}

.auth-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f1f5f9;
}

.auth-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
}

.auth-tabs :deep(.el-tabs__item.is-active) {
  color: #4f46e5;
  font-weight: 600;
}

.auth-form :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  padding-bottom: 6px;
}

.auth-form :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

.form-actions {
  margin-top: 28px;
}

.submit-btn {
  width: 100%;
  border-radius: 8px;
  font-size: 15px;
  letter-spacing: 0.5px;
}

@media (max-width: 860px) {
  .login-container {
    flex-direction: column;
    max-width: 460px;
  }
  .brand-hero {
    padding: 36px 28px;
  }
  .feature-list {
    display: none;
  }
  .form-section {
    padding: 36px 28px;
  }
}
</style>
