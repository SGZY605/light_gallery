# Admin Role Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `OWNER` and disabled-user model with `ADMIN` and `MEMBER`, while making `admin@example.com` the protected default administrator.

**Architecture:** Use a small protected-admin rules module in application code, a separate Prisma seed helper for runtime-safe seeding, and a pre-schema-sync SQL script to migrate legacy database state before `prisma db push`. Keep user management behavior in server actions on the users dashboard page, backed by pure helper functions that can be unit tested.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, Vitest, Docker Compose

---

### Task 1: Define Failing Tests for the New Permission Model

**Files:**
- Modify: `tests/unit/permissions.test.ts`
- Modify: `tests/unit/seed-owner.test.ts`
- Create: `tests/unit/protected-admin.test.ts`
- Modify: `tests/integration/location-override.test.ts`
- Modify: `tests/integration/upload-complete.test.ts`

- [ ] **Step 1: Write failing tests for `ADMIN`/`MEMBER` only**
- [ ] **Step 2: Run the targeted test suite to verify failures**
- [ ] **Step 3: Update test fixtures from `OWNER` to `ADMIN` and add protected-admin cases**
- [ ] **Step 4: Re-run the targeted tests and keep them failing only for missing implementation**

### Task 2: Refactor Shared Auth and Seed Rules

**Files:**
- Create: `src/lib/auth/protected-admin.ts`
- Create: `prisma/seed-admin.ts`
- Modify: `prisma/seed.ts`
- Delete: `prisma/seed-owner.ts`

- [ ] **Step 1: Add protected-admin helper functions and constants**
- [ ] **Step 2: Add Prisma seed helper with fixed admin email and configurable password**
- [ ] **Step 3: Update seed script to enforce protected admin as `ADMIN`**
- [ ] **Step 4: Run unit tests for seed and protected-admin helpers**

### Task 3: Remove `OWNER` and Status from Schema and Runtime Paths

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/pre-schema-sync.sql`
- Modify: `docker-entrypoint.sh`
- Modify: `src/lib/auth/permissions.ts`
- Modify: `src/lib/auth/session.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Remove old enums and references from Prisma schema**
- [ ] **Step 2: Add idempotent pre-sync SQL for legacy account migration**
- [ ] **Step 3: Update entrypoint to run SQL migration before `db push`**
- [ ] **Step 4: Update runtime auth and role-label logic**
- [ ] **Step 5: Run targeted tests and fix regressions**

### Task 4: Rebuild User Management Features Around the New Rules

**Files:**
- Modify: `src/app/dashboard/users/page.tsx`

- [ ] **Step 1: Add reset-password server action**
- [ ] **Step 2: Replace disable action with delete action**
- [ ] **Step 3: Prevent deleting or demoting the protected admin**
- [ ] **Step 4: Update Chinese UI copy to reflect create, role change, password reset, and delete actions**
- [ ] **Step 5: Run targeted tests or add helper-level tests for protected-admin behavior**

### Task 5: Update Config and Verify End to End

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `tests/e2e/gallery.spec.ts`
- Modify: `docs/docker-deploy.md`

- [ ] **Step 1: Rename seed env vars from owner to admin where applicable**
- [ ] **Step 2: Run `npm test` and confirm all tests pass**
- [ ] **Step 3: Run `docker compose up --build -d --pull never`**
- [ ] **Step 4: Verify `/login`, protected admin login, and dashboard access**
- [ ] **Step 5: Verify `taka@example.com` is absent and `admin@example.com` is present in the running database**
