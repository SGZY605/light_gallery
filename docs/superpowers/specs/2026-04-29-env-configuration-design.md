# 环境变量配置设计

## 目标

把所有运行时配置统一到 `.env`。开发者复制 `.env.example` 为 `.env`，按本机环境调整取值后，就可以使用下面的流程启动本地开发环境：

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
npm run dev
```

## 架构

`.env.example` 是所有配置项的模板来源，覆盖 Docker Compose、Prisma、数据种子脚本、Playwright、Next.js 运行时代码和 OSS 上传逻辑所需的环境变量。

Docker Compose 通过 `.env` 做变量插值，并把 Postgres 容器端口暴露到宿主机，使宿主机上的 Prisma CLI 可以通过 `DATABASE_URL` 连接数据库。

应用代码继续沿用现有的 `process.env` 读取方式。本次改动不新增配置抽象层，因为需求重点是统一配置入口、补全文档和默认值，而不是改变运行时配置机制。

## 文件

- `.env.example`：完整的中文注释配置模板。
- `docker-compose.yml`：统一从 `.env` 读取变量，并暴露 Postgres 宿主机端口。
- `docs/docker-deploy.md`：记录本地开发启动流程和 Docker app 启动流程。
- `tests/unit/env-example.test.ts`：保证配置模板覆盖项目需要的关键配置项。

## 测试

单元测试验证 `.env.example` 包含必需变量，并验证 Docker Compose 没有把本地 Postgres 访问隐藏在未暴露的容器端口后面。

完整验证包含 lint、单元测试、Prisma schema 推送、数据种子执行和开发服务 HTTP 冒烟检查。
