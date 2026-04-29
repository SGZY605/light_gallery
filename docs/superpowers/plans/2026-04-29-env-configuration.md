# 环境变量配置实施计划

> **给自动化执行者的要求：**如果后续继续按本计划执行，必须逐项完成并复核。步骤使用复选框语法记录状态。

**目标：**让 `.env.example` 成为本地开发和 Docker 开发的完整中文注释配置模板。

**架构：**保留现有运行时代码里的环境变量读取方式，把配置发现和默认值说明集中到 `.env.example`。Docker Compose 从 `.env` 读取变量，暴露 Postgres 宿主机端口，并把同一组配置传入 app 容器。

**技术栈：**Next.js 15、Prisma 5、Docker Compose、Vitest、PostgreSQL。

---

### 任务 1：配置覆盖测试

**文件：**
- 新建：`tests/unit/env-example.test.ts`

- [x] **步骤 1：编写失败测试**

创建 Vitest 测试，读取 `.env.example` 和 `docker-compose.yml`，断言项目需要的环境变量都存在于示例文件中，并断言 Postgres 通过 `127.0.0.1:${POSTGRES_PORT}:5432` 暴露给宿主机。

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- tests/unit/env-example.test.ts`

实现前预期：失败。原因是 `.env.example` 缺少 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_PORT`、`APP_PORT`、`APP_HOSTNAME`、`DB_INIT_MAX_ATTEMPTS`、`DB_INIT_RETRY_DELAY_SECONDS`、`OSS_ALLOWED_MIME_PREFIX`、`OSS_UPLOAD_PREFIX` 和 `NEXT_PUBLIC_OSS_PUBLIC_BASE_URL` 等配置项。

- [x] **步骤 3：实现最小配置改动**

更新 `.env.example` 和 `docker-compose.yml`，使配置模板完整，并让 Postgres 通过宿主机端口访问。

- [x] **步骤 4：运行测试并确认通过**

运行：`npm test -- tests/unit/env-example.test.ts`

实现后预期：通过。

### 任务 2：文档

**文件：**
- 修改：`docs/docker-deploy.md`

- [x] **步骤 1：更新文档**

记录复制 `.env.example` 为 `.env` 的方式、本地开发命令顺序，以及 Docker app 启动命令。

- [x] **步骤 2：验证文档包含必需命令**

运行：`rg "docker compose up -d postgres|npx prisma db push|npm run db:seed|npm run dev" docs/docker-deploy.md`

预期：四条命令都存在。

### 任务 3：完整验证和提交

**文件：**
- 验证所有变更文件。

- [x] **步骤 1：运行单元测试和 lint**

运行：`npm test` 和 `npm run lint`。

预期：单元测试通过；lint 没有错误，可能保留既有 `<img>` 使用警告。

- [x] **步骤 2：运行本地开发启动流程**

运行：

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
npm run dev
```

预期：Postgres 启动，Prisma 成功推送 schema，seed 完成，Next dev server 返回 HTTP 200。

- [x] **步骤 3：提交到 main**

运行 `git status --short --branch`，确认分支为 `main`，然后 stage 相关文件并提交。
