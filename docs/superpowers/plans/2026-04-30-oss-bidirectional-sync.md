# OSS Bidirectional Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep each user's local image records aligned with their OSS objects, and let users delete a detail-page image from both places.

**Architecture:** Add a small signed OSS REST client for object metadata, delete, and prefix listing. Put synchronization policy in `src/lib/images/sync.ts`; routes and pages only call that service. The settings page exposes an explicit full sync action, while image detail deletion calls a DELETE route that removes the OSS object before marking the local record deleted.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Vitest, Alibaba Cloud OSS REST API.

---

### Task 1: OSS Client

**Files:**
- Create: `src/lib/oss/client.ts`
- Test: `tests/unit/oss-client.test.ts`

- [ ] Write failing tests for V1 Authorization header construction, object metadata lookup, object deletion, and XML list parsing.
- [ ] Implement `headOssObject`, `deleteOssObject`, and `listOssObjects`.
- [ ] Run `npm test -- tests/unit/oss-client.test.ts`.

### Task 2: Sync Service

**Files:**
- Create: `src/lib/images/sync.ts`
- Test: `tests/unit/image-oss-sync.test.ts`

- [ ] Write failing tests for local-only soft deletion, OSS-only import, and soft-deleted record restoration.
- [ ] Implement `syncUserImagesWithOss` and `deleteOwnedImageEverywhere`.
- [ ] Run `npm test -- tests/unit/image-oss-sync.test.ts`.

### Task 3: API And UI Entry Points

**Files:**
- Modify: `src/app/api/images/[id]/route.ts`
- Modify: `src/components/image-detail-view.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`
- Test: `tests/integration/image-delete-route.test.ts`
- Test: `tests/unit/settings-page-contract.test.ts`

- [ ] Write failing tests for DELETE route ownership and OSS-first deletion.
- [ ] Add the DELETE route and wire the detail-page small delete button with a confirmation dialog.
- [ ] Add the settings-page sync server action and button.
- [ ] Run the targeted API and source-contract tests.

### Task 4: Verification

**Files:**
- All modified files

- [ ] Run targeted tests.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
