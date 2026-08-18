# 改完即提交、构建、部署、推送

用户要求：本仓每次修改完代码后，**主动**走完整交付，不要等下一句指令。

1. `git add` 仅暂存本次改动；`git commit` 用 conventional commits（`feat:`/`fix:`/`docs:`/`build:`/`deploy:`），说明用中文。
2. 页面/样式/前端逻辑有改动时：`npm run build`（含 `vue-tsc`），通过后再部署。
3. 部署：`ssh -i "$env:USERPROFILE\.ssh\id_ed25519_aipet" root@39.107.143.71`；将本地 `dist/client/` 同步到 `/opt/ai-pet/ai-pet-admin/dist/`，`chmod -R a+rX`，`docker exec ai-pet-admin-web nginx -s reload`。
4. `git push origin main`。
5. 纯文档或规则改动：提交并推送即可，不必重部署静态资源。
6. 不要把 `work_dashboard` 里他人未提交的改动一并提交。
