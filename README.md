# ai-pet-admin — AI Pet Web 管理台

> 职责：登录、设备、人设设置、历史/记忆管理、外设状态、知识库运营（管理员）、对接小智智控台入口。  
> 首版定位：**调试/资产向管理台**，不是消费级潮玩 App。  
> 终端用户手机/桌面客户端 → 见 [`../ai-pet-app`](../ai-pet-app/README.md)。

## 本仓库不负责

- 业务 API / 数据库 → 见 `../ai-pet-backend`
- 实时会话与 OTA → 见 `../xiaozhi-server`
- 固件 → 见 `../ESP32_XIAOZHI/xiaozhi-esp32`

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/00-文档索引与协作边界.md](./docs/00-文档索引与协作边界.md) | 三仓分工 |
| [docs/01-项目概述与信息架构.md](./docs/01-项目概述与信息架构.md) | IA、用户角色 |
| [docs/02-页面与交互规格.md](./docs/02-页面与交互规格.md) | 各页验收要点 |
| [docs/03-对接API清单.md](./docs/03-对接API清单.md) | 依赖后端接口 |
| [docs/04-开发任务清单.md](./docs/04-开发任务清单.md) | backlog |
| [docs/05-开发交接-Codex.md](./docs/05-开发交接-Codex.md) | AI 开发代理任务书（Codex 专用） |
| [docs/06-协作看板.md](./docs/06-协作看板.md) | 任务流转 + 后端接口可用状态 |
| [docs/07-项目定位与整体架构分析.md](./docs/07-项目定位与整体架构分析.md) | 本仓在五仓体系中的作用 |
| [docs/api-openapi.json](./docs/api-openapi.json) | 后端 OpenAPI 契约快照 |

## 技术栈（已定，详见 docs/05）

- Vue 3 + Composition API + `<script setup>` + Vite；UI 用 Element Plus
- Pinia 状态、Vue Router 守卫、axios 实例（Bearer + 401 拦截）
- 鉴权走业务后端 JWT；小智智控台用外链，避免双写智能体配置
