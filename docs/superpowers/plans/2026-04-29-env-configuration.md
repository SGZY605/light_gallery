# Env Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `.env.example` the complete, Chinese-commented configuration template for local and Docker development.

**Architecture:** Keep runtime configuration reads in place and centralize discoverability in `.env.example`. Docker Compose reads `.env` for interpolation, exposes Postgres to the host, and passes the same values into app containers.

**Tech Stack:** Next.js 15, Prisma 5, Docker Compose, Vitest, PostgreSQL.

---

### Task 1: Configuration Coverage Test

**Files:**
- Create: `tests/unit/env-example.test.ts`

- [x] **Step 1: Write the failing test**

Create a Vitest test that reads `.env.example` and `docker-compose.yml`, then asserts that all environment keys used by the repo are present in the example and that Postgres exposes `${POSTGRES_PORT}:5432`.

- [x] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/env-example.test.ts`

Expected before implementation: FAIL because `.env.example` lacks keys such as `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `APP_PORT`, `APP_HOSTNAME`, `DB_INIT_MAX_ATTEMPTS`, `DB_INIT_RETRY_DELAY_SECONDS`, `OSS_ALLOWED_MIME_PREFIX`, `OSS_UPLOAD_PREFIX`, and `NEXT_PUBLIC_OSS_PUBLIC_BASE_URL`.

- [ ] **Step 3: Implement the minimal configuration changes**

Update `.env.example` and `docker-compose.yml` to satisfy the test.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/unit/env-example.test.ts`

Expected after implementation: PASS.

### Task 2: Documentation

**Files:**
- Modify: `docs/docker-deploy.md`

- [ ] **Step 1: Update docs**

Document copying `.env.example` to `.env`, the local development command sequence, and the Docker app startup command.

- [ ] **Step 2: Verify docs mention the required commands**

Run: `rg "docker compose up -d postgres|npx prisma db push|npm run db:seed|npm run dev" docs/docker-deploy.md`

Expected: all four commands are present.

### Task 3: Full Verification and Commit

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run unit and lint checks**

Run: `npm test` and `npm run lint`.

- [ ] **Step 2: Run local development startup flow**

Run:

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
npm run dev
```

Expected: Postgres starts, Prisma pushes schema, seed completes, and Next dev server serves HTTP 200.

- [ ] **Step 3: Commit on main**

Run `git status --short --branch`, confirm branch is `main`, stage relevant files, and commit.
