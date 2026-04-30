# User-Isolated OSS Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-user OSS settings and enforce user data isolation across dashboard pages, APIs, uploads, shares, and account deletion.

**Architecture:** Store user OSS settings in `UserOssConfig` and resolve OSS config from either the user's saved config or, only for the protected super administrator, `.env`. Enforce ownership in every query/mutation by scoping records to the current user ID, and use owner config for image URL generation.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, TypeScript, Vitest, Playwright.

---

### Task 1: Schema And Config Resolution

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `src/lib/oss/user-config.ts`
- Test: `tests/unit/user-oss-config.test.ts`

- [ ] Add `User.ossConfig`, `UserOssConfig`, per-user tag uniqueness, per-user image object key uniqueness, and cascade relations.
- [ ] Write failing tests for saved user config, super-admin env fallback, and member no-fallback.
- [ ] Implement pure config normalization and DB-backed config helpers.
- [ ] Run `npx prisma generate` and `npm test -- tests/unit/user-oss-config.test.ts`.
- [ ] Commit as `feat: add user scoped oss config`.

### Task 2: Settings Page And Missing Config Reminder

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Create: `src/components/oss-config-required-notice.tsx`
- Test: `tests/unit/settings-page-contract.test.ts`

- [ ] Write failing source-contract tests for settings inputs, hidden secret behavior, and dashboard reminder.
- [ ] Replace read-only env settings with current-user settings form and save action.
- [ ] Add dashboard reminder when current user has no usable OSS config.
- [ ] Run `npm test -- tests/unit/settings-page-contract.test.ts`.
- [ ] Commit as `feat: add per-user oss settings UI`.

### Task 3: Read Path Isolation

**Files:**
- Modify: `src/app/dashboard/library/page.tsx`
- Modify: `src/app/dashboard/albums/page.tsx`
- Modify: `src/app/dashboard/map/page.tsx`
- Modify: `src/app/dashboard/upload/page.tsx`
- Modify: `src/app/dashboard/library/[id]/page.tsx`
- Test: `tests/unit/user-data-isolation.test.ts`

- [ ] Write failing source-contract tests that dashboard read paths include current-user filters.
- [ ] Scope images to `uploaderId: user.id` and tags to `creatorId: user.id`.
- [ ] Resolve current user's OSS config before passing `publicBaseUrl` to image components.
- [ ] Show missing-config notice on image URL pages when config is absent.
- [ ] Run `npm test -- tests/unit/user-data-isolation.test.ts`.
- [ ] Commit as `feat: isolate dashboard read paths`.

### Task 4: Tag, Share, And Public Share Isolation

**Files:**
- Modify: `src/app/dashboard/tags/page.tsx`
- Modify: `src/app/dashboard/shares/page.tsx`
- Modify: `src/app/api/shares/route.ts`
- Modify: `src/app/api/shares/[id]/revoke/route.ts`
- Modify: `src/lib/shares/query.ts`
- Modify: `src/app/s/[token]/page.tsx`
- Test: `tests/integration/share-query.test.ts`

- [ ] Write failing tests that public shares only query images owned by the share creator.
- [ ] Scope tag CRUD, tag merge, share creation, share listing, and revocation to the current user.
- [ ] Use share creator config for public share image URLs.
- [ ] Run `npm test -- tests/integration/share-query.test.ts`.
- [ ] Commit as `feat: isolate tags and shares`.

### Task 5: Upload And Image Mutation Isolation

**Files:**
- Modify: `src/lib/uploads/persist.ts`
- Modify: `src/app/api/uploads/sign/route.ts`
- Modify: `src/app/api/uploads/proxy/route.ts`
- Modify: `src/app/api/uploads/complete/route.ts`
- Modify: `src/app/api/images/[id]/route.ts`
- Modify: `src/app/api/images/[id]/tags/route.ts`
- Modify: `src/app/api/images/[id]/location/route.ts`
- Test: `tests/integration/upload-complete.test.ts`
- Test: `tests/integration/upload-proxy.test.ts`
- Test: `tests/integration/image-detail-update-route.test.ts`
- Test: `tests/integration/location-override.test.ts`

- [ ] Write failing tests for user-scoped tags, images, upload items, and missing OSS config errors.
- [ ] Resolve OSS config per current user in upload signing and proxy routes.
- [ ] Ensure upload persistence only reads/upserts tags for the current user.
- [ ] Ensure image detail, tag, and location mutations only affect current user's images and tags.
- [ ] Run the four integration test files.
- [ ] Commit as `feat: isolate uploads and image mutations`.

### Task 6: Account Deletion Cascade

**Files:**
- Modify: `src/app/dashboard/users/page.tsx`
- Modify: `src/lib/auth/permissions.ts`
- Test: `tests/unit/permissions.test.ts`
- Test: `tests/unit/user-deletion-contract.test.ts`

- [ ] Write failing source-contract tests that user deletion deletes business data and config instead of reassigning it.
- [ ] Replace reassignment deletion logic with explicit cascading deletes inside one transaction.
- [ ] Keep protected super administrator non-deletable.
- [ ] Run `npm test -- tests/unit/permissions.test.ts tests/unit/user-deletion-contract.test.ts`.
- [ ] Commit as `feat: cascade user-owned data on delete`.

### Task 7: Full Verification

**Files:**
- All modified files

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Stop dev server if Prisma DLL is locked, run `npm run build`, then restart `npm run dev -- -p 3001`.
- [ ] Run `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test tests/e2e/gallery.spec.ts`.
- [ ] Commit any final test-only fixes.
