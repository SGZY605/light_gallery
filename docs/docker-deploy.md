# 开发和 Docker 部署

## 前置条件

- Docker Desktop 或其他 Docker 引擎正在运行。
- 应用端口 `3000` 可用，除非你修改 `APP_PORT`。
- 宿主机上的 Postgres 端口 `55432` 可用，除非你修改 `POSTGRES_PORT`。

## 环境变量

1. 复制 `.env.example` 为 `.env`。
2. 阅读 `.env` 中的中文注释，并按本机或部署环境调整取值。
3. 生产环境至少需要修改这些值：
   - `SESSION_SECRET`
   - `SEED_ADMIN_PASSWORD`
   - `POSTGRES_PASSWORD`
   - `OSS_REGION`
   - `OSS_BUCKET`
   - `OSS_ACCESS_KEY_ID`
   - `OSS_ACCESS_KEY_SECRET`
   - `OSS_PUBLIC_BASE_URL`
   - `OSS_UPLOAD_BASE_URL`

`.env` 已被 git 忽略。真实密钥只应保存在 `.env` 或部署平台的密钥管理系统中。

`DATABASE_URL` 用于宿主机上运行的本地命令，例如 `npx prisma db push`。在 Windows/Docker Desktop 环境中保持 host 为 `127.0.0.1`，避免 Prisma 尝试 IPv6 `localhost`。

`DOCKER_DATABASE_URL` 用于容器化 app。它的 host 必须保持为 Docker Compose 服务名 `postgres`。

## 本地开发启动

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
npm run dev
```

打开 `http://localhost:3000`，或使用 `APP_PORT` 配置的端口。

## Docker app 启动

```bash
docker compose up -d --build
```

app 容器会自动：

- 等待 Postgres 健康检查通过
- 运行旧管理员数据迁移和 `prisma db push`
- 创建受保护管理员账号 `admin@example.com` 并初始化默认标签
- 在端口 `3000` 启动 Next.js

打开 `http://localhost:3000`，或使用 `APP_PORT` 配置的端口。

## 查看日志

```bash
docker compose logs -f app
docker compose logs -f postgres
```

## 停止服务

```bash
docker compose down
```

如果还要删除数据库 volume：

```bash
docker compose down -v
```
