# 05 — 开发交接说明（Codex 专用）

> 本文是 AI 开发代理（Codex 等）开发本仓库的**任务书**。开工前必读，配合本目录 00～04 文档使用。
> 最后更新：2026-08-01（backend 会话 A 维护）

## 1. 你的任务

开发 AI Pet 系统的 **Web 管理台前端**（本仓库 = 纯前端，不写任何后端逻辑、不连数据库）。
用户两类：`user`（宠物主人：设备/人设/历史/记忆/摘要）与 `admin`（运营：KB 管理/发布/反馈审核）。

**范围边界（来自 docs/00）：**
- 所有数据读写一律调 `ai-pet-backend` 的 HTTP API，禁止直连数据库、禁止调 `/api/internal/*`
- 小智智控台只做外链（`VITE_XIAOZHI_CONSOLE_URL`），不在本仓复刻其功能
- 非目标：日记 Feed、成长曲线、社交、NFC、儿童模式

## 2. 技术栈（已定，不可变更）

| 项 | 决策 | 依据 |
|----|------|------|
| 框架 | Vue 3 + Composition API + `<script setup>` | ai-pet-backend/docs/08 |
| 构建 | Vite | 同上 |
| UI 组件 | Element Plus | 表单/表格型管理台 |
| 状态 | Pinia（auth token、用户信息） | |
| 路由 | Vue Router（路由守卫：未登录→/login，非 admin→隐藏 KB 菜单） | |
| HTTP | axios 实例：自动带 `Authorization: Bearer`，响应拦截 401→清 token 跳登录页 | |
| 环境变量 | `VITE_API_BASE`、`VITE_XIAOZHI_CONSOLE_URL` | docs/03 |

## 3. 后端对接（重要：读这一节再动手）

### 3.1 契约文档（权威，优先级从高到低）

1. **本目录 `api-openapi.json`** —— 线上后端实时导出的 OpenAPI 规范（25 个端点，含字段定义）
2. `ai-pet-backend/docs/06-HTTP-API规范.md` —— 文字版契约与错误码约定
3. 本目录 `03-对接API清单.md` —— 页面↔API 映射

三处不一致时以 openapi.json 为准，并在协作看板记录。

### 3.2 后端实现现状（2026-08-01）

| 状态 | 端点 |
|------|------|
| ✅ 已实现可用 | `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me` |
| 501 骨架（契约已定，逻辑未实现） | devices / persona / messages / memories / analyses / peripheral / admin/kb 全部 |

**策略：页面按契约开发，调 501 接口时按"加载失败/敬请期待"空态处理**；后端按里程碑逐步实现，前端不需改代码即可自动点亮。

### 3.3 联调环境

| 项 | 值 |
|----|-----|
| 后端地址 | 服务器 `39.107.143.71:8010`（安全组未对外开放） |
| 本地联调方式 | 先执行 `ssh -N -L 8010:localhost:8010 aliyun-aipet`（保持窗口），然后 `VITE_API_BASE=http://localhost:8010` |
| 在线接口调试 | 隧道建立后访问 `http://localhost:8010/docs`（Swagger UI） |
| 测试账号 | `tester01` / `passw0rd123`（role=user）；admin 账号待后端提供 |
| Vite 代理 | `vite.config.ts` 配 `server.proxy: { '/api': 'http://localhost:8010' }`，前端代码一律写相对路径 `/api/...` |

### 3.4 鉴权约定

- 登录响应含 `access_token`（JWT），存 Pinia + localStorage；axios 请求头带 `Authorization: Bearer <token>`
- 401 → 清 token 跳 `/login`；403 → 提示无权限；422 → 表单字段错误回显
- 登录失败提示直接展示后端 detail（后端已做防枚举模糊化，前端不要再"优化"文案）

## 4. 页面与里程碑（详细规格见 docs/02）

| 里程碑 | 页面 | 依赖后端状态 |
|--------|------|-------------|
| **M1（先做）** | 登录/注册、布局框架（侧边栏+顶栏）、设备列表/详情骨架、401 跳转闭环 | auth ✅ 已可联调 |
| M2 | 人设设置（星座+MBTI+忌口+follow_latest） | persona（501，后端排期中） |
| M3 | 对话历史（筛选/分页/删除）、记忆 CRUD+候选审核 | messages/memories（501） |
| M4 | KB 管理（admin）、分析卡片、外设状态 | admin/kb（501） |

M1 完成标准：能注册→登录→看到布局和设备空列表→刷新保持登录→退出登录。UI 保持 Element Plus 默认风格即可，不做视觉设计。

## 5. 工程纪律

1. **不引入重型依赖**：不要状态管理替代品、不要 UI 库混用、不要图表库（M4 之前用不上）
2. 每个页面一个目录（`src/views/<page>/`），公共 API 调用集中在 `src/api/`，类型定义与 openapi.json 对齐
3. 完成后更新 `D:\Home_Work\AI-Pet协作看板.md` 的 admin 部分和进度日志
4. 密钥/token 不提交仓库；`.env.local` 进 .gitignore
5. 本仓库 GitHub 远端（如有）以 main 分支为准，提交信息用中文简述

## 6. 协作上下文（别的 AI 会话在做什么）

- **backend（Kimi 会话 A）**：已实现 auth 并部署到 39.107.143.71:8010；接下来按 M2/M3/M4 顺序实现业务 API
- **xiaozhi-server（Kimi 会话 B）**：语音后台已部署（8000/8002/8003），与本仓无直接接口
- 状态同步点：`D:\Home_Work\AI-Pet协作看板.md`（开工必读、完工必写）
