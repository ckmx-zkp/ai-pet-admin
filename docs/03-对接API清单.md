# 03 — 对接 API 清单

完整契约见 `../ai-pet-backend/docs/06-HTTP-API规范.md`。管理台只调 `/api/admin/*` 与 `/api/auth/*`，**禁止**调用用户 `/devices/bind` 或写入 `devices.user_id`。

## 页面 → API 映射

| 页面 | API |
|------|-----|
| 登录/注册/当前用户 | `POST /auth/login` `POST /auth/register` `GET /auth/me` |
| 设备资产列表/精确查询 | `GET /admin/devices?q&limit&offset` `GET /admin/devices/lookup?device_uid=` |
| 设备资产详情/轮换绑定码 | `GET /admin/devices/{id}` `POST /admin/devices/{id}/binding-id/rotate` |
| 人设 | `GET/PUT /admin/devices/{id}/persona` |
| 历史 | `GET /admin/devices/{id}/messages?from&to&limit&offset` |
| 记忆审核 | `GET /admin/devices/{id}/memories` `POST .../memories/{mid}/approve\|reject` |
| 分析 | `GET /admin/devices/{id}/analyses?kind&limit&offset` |
| 外设 | `GET /admin/devices/{id}/peripheral` |
| KB | `/admin/kb/zodiac` `/admin/kb/mbti` `/admin/kb/feedback` |
| 导出 | `POST /devices/{id}/export`（后端 501，前端不接） |

用户侧 `/devices/*` 仅供 `ai-pet-app`。成长建议应用端点 `POST /devices/{id}/analyses/{aid}/apply-persona-growth` 也是用户 API，管理台不调用。

## 环境变量（前端）

```text
VITE_API_BASE=/api
VITE_XIAOZHI_CONSOLE_URL=http://39.107.143.71:8002
```

生产由 Nginx 把 `/api` 同源反代到本机 backend `8010`，浏览器不必直连 8010。

## 错误处理

- 401 → 清 token 跳登录页
- 403 → 「无权限」提示
- 404/409/422 → 展示后端 `detail`
- 网络失败 → Toast + 空态「重新加载」
