# 03 — 对接 API 清单

完整契约见 `../ai-pet-backend/docs/06-HTTP-API规范.md`。

## 页面 → API 映射

| 页面 | API |
|------|-----|
| 登录 | `POST /auth/login` |
| 设备列表/绑定 | `GET /devices` `POST /devices/bind` |
| 人设 | `GET/PUT /devices/{id}/persona` |
| 历史 | `GET/DELETE /devices/{id}/messages` |
| 记忆 | `CRUD /devices/{id}/memories` + approve |
| 分析 | `GET /devices/{id}/analyses` |
| 外设 | `GET /devices/{id}/peripheral` |
| KB | `/admin/kb/*` |
| 导出 | `POST /devices/{id}/export` |

## 环境变量（前端）

```text
VITE_API_BASE=https://api.example.com/api
VITE_XIAOZHI_CONSOLE_URL=https://xiaozhi.example.com
```

## 错误处理

- 401 → 登录页  
- 403 → 无权限提示（KB）  
- 网络失败 → Toast + 可重试  
