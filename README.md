# light_gallery

## 文档规则

本项目所有说明文档、设计文档、实施计划和维护文档都必须使用中文编写。命令、环境变量名、文件路径、代码标识符、错误信息和第三方专有名词可以保留英文原文。

## 本机开发

1. 复制环境变量模板：

   ```powershell
   Copy-Item .env.example .env
   ```

2. 启动数据库：

   ```powershell
   docker compose up -d postgres
   ```

3. 初始化数据库并创建管理员账号：

   ```powershell
   npx prisma db push
   npm run db:seed
   ```

4. 启动开发服务：

   ```powershell
   npm run dev
   ```

开发地址固定是 `http://127.0.0.1:3001/login`，端口来自 `.env` 的 `DEV_PORT=3001`。默认管理员账号是 `admin@example.com`，密码来自 `.env` 的 `SEED_ADMIN_PASSWORD`，模板默认值为 `admin`。

如果启动时报端口被占用（`EADDRINUSE`），可以查找并停掉旧进程：

```powershell
# 查找占用 3001 端口的进程
netstat -ano | findstr :3001

# 用找到的 PID 停掉进程（替换 12345 为实际 PID）
taskkill /PID 12345 /F

# 或者一键停掉所有 node 进程
taskkill /IM node.exe /F
```

## Docker App 部署

启动完整 Docker 应用：

```powershell
docker compose up -d --build
```

Docker app 固定使用 `http://127.0.0.1:3000/login`，端口来自 `.env` 的 `APP_PORT=3000`。本机开发固定使用 `3001`，所以 Docker app 和 dev server 可以同时运行。

HTTP 本地部署不需要 HTTPS cookie。`SESSION_COOKIE_SECURE` 留空时应用会按请求协议自动判断：`http://127.0.0.1` 不加 `Secure`，HTTPS 或反向代理传入 `x-forwarded-proto=https` 时会加 `Secure`。
