# AGENTS.md — ai-pet-admin（Web 管理台）

> AI 会话进本仓前**先拉取根协作文档**：`D:/Home_Work/work_dashboard/AI-Pet项目全景与进度.md`（第一信息源），
> 再读 `D:/Home_Work/AGENTS.md` 和 `D:/Home_Work/work_dashboard/AI-Pet协作看板.md`。

## 定位

AI Pet 的 **Web 管理台前端**（开发者/运营向，纯前端无后端逻辑）：登录、设备资产查看/诊断、人设设置、历史/记忆管理、外设状态、KB 运营、外链小智智控台。只调 `ai-pet-backend` 的 HTTP API。

## 必读文档（docs/）

- `docs/00`：三仓分工与协作边界
- `docs/03`：对接 API 清单；`docs/api-openapi.json`：后端契约快照（backend 重导后需同步）
- `docs/04`：开发任务清单（A 壳子 / B 核心页 / C 运营 / D 体验）
- `docs/05`：开发交接任务书（上一会话的交接上下文）
- `docs/06`：仓内协作看板（任务流转 + 后端接口可用状态）

## 技术栈与结构

- Vue 3（Composition API + `<script setup>`）+ Vite + TypeScript + Element Plus + Pinia + Vue Router + axios（Bearer + 401 拦截跳登录）
- 分层：`src/api/`（按域分文件）→ `src/stores/` → `src/views/`（按功能域分目录，组件命名 `XxxView.vue`）→ `src/layouts/MainLayout.vue`
- `deploy/`：Nginx 容器（8080，`/api` 同源反代 backend 8010）；构建后的浏览器静态产物位于 `dist/client/`，部署时同步其内容到 ECS 的 `/opt/ai-pet/ai-pet-admin/dist/`。
- `worker/`：Cloudflare Workers 静态托管能力（可选路径；当前生产联调入口为 ECS:8080）。

## 命令

- 开发：`npm run dev`（vite，默认 5173）
- 构建：`npm run build`（含 `vue-tsc` 类型检查，**提交前必跑**）
- **无测试框架、无 lint、无 CI**：验证 = 构建通过 + 页面端到端手测（登录→设备页），结果写进看板。

## 改完即交付（用户要求，勿等下一句）

每次改完本仓代码后主动完成，不要等用户再说「提交 / 构建 / 部署 / 推送」：

1. conventional commit（中文说明）
2. 前端有改动则 `npm run build`，把 `dist/client/` 同步到 ECS `/opt/ai-pet/ai-pet-admin/dist/`（SSH：`ssh -i "$env:USERPROFILE\.ssh\id_ed25519_aipet" root@39.107.143.71`），再 `docker exec ai-pet-admin-web nginx -s reload`
3. `git push origin main`
4. 纯文档/规则改动只需提交并推送，不必重部署静态资源

## 联调入口

- 线上：`http://39.107.143.71:8080`（同源反代，无需 CORS 改动）
- 本地直连 backend：SSH 隧道 `ssh -L 8010:127.0.0.1:8010 aliyun-aipet`
- backend 接口多为 501 骨架时，页面保留可恢复空态，**不 mock 死数据进组件**。
- **设备归属红线**：`/devices/bind` 是 App 用户以 `binding_id` 认领设备的接口；管理台不得调用它或写入 `devices.user_id`。等待 backend E1.1 的 `/admin/devices/*` 资产/诊断接口上线后，再开发或改造管理台设备登记功能。

## 约定

- 中文注释与文档；提交信息用 conventional commits（`feat:`/`fix:`/`docs:`/`build:`/`deploy:`）。
- 接口定义以 `ai-pet-backend/docs/06-HTTP-API规范.md` 为唯一真源；发现契约不一致先提给 backend 会话，不私改前端假设。

## 收工义务

完成任务后更新 `D:/Home_Work/work_dashboard/AI-Pet协作看板.md` 的"ai-pet-admin 进度摘要"与进度日志；仓内任务流转同步更新 `docs/06`。
