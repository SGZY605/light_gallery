# Share Photo Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create share links from an explicit selected photo set, with tag filtering only controlling the selection dialog visibility, and allow deleting expired or revoked share records.

**Architecture:** Add a `ShareImage` join model so share contents are fixed at creation time. Move selection behavior into a small pure helper plus a client dialog component, then update server actions, API routes, and public share queries to use `imageIds` while keeping the existing token, expiration, revocation, and download semantics.

**Tech Stack:** Next.js 15 App Router, React 18, Prisma 5, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Selection Helper

**Files:**
- Create: `src/lib/shares/selection.ts`
- Create: `tests/unit/share-selection.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for filtering, visible-only select-all, and single-image toggles.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/unit/share-selection.test.ts`

Expected: FAIL because `src/lib/shares/selection.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create pure functions:

- `filterShareSelectionImages(images, selectedTagIds)`
- `toggleShareSelection(selectedImageIds, imageId)`
- `selectVisibleShareImages(selectedImageIds, visibleImages)`

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/unit/share-selection.test.ts`

Expected: PASS.

### Task 2: Share Image Query Model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/pre-schema-sync.sql`
- Modify: `src/lib/shares/query.ts`
- Modify: `tests/integration/share-query.test.ts`

- [ ] **Step 1: Write failing query tests**

Update tests so `getImagesForShare()` expects `share.images` to drive returned images, with owner and deleted guards.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/integration/share-query.test.ts`

Expected: FAIL because `getImagesForShare()` still queries by tags.

- [ ] **Step 3: Implement query and schema**

Add `ShareImage` to Prisma schema and update `getImagesForShare()` to use a share lookup including image links.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/integration/share-query.test.ts`

Expected: PASS.

### Task 3: Create And Delete Share Routes

**Files:**
- Modify: `src/app/api/shares/route.ts`
- Create: `src/app/api/shares/[id]/route.ts`
- Modify: `src/app/dashboard/shares/page.tsx`
- Modify: `tests/integration/share-query.test.ts`

- [ ] **Step 1: Write failing contract tests**

Assert API and dashboard source include `imageIds`, user-owned image validation, `images.create`, and delete-only-unavailable state checks.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/integration/share-query.test.ts`

Expected: FAIL because routes still use `tagIds` as required content.

- [ ] **Step 3: Implement server changes**

Update create logic to validate `imageIds`; add delete action/API for expired or revoked shares.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/integration/share-query.test.ts`

Expected: PASS.

### Task 4: Share Selection Dialog UI

**Files:**
- Create: `src/components/share-photo-selector.tsx`
- Modify: `src/app/dashboard/shares/page.tsx`
- Modify: `tests/integration/share-query.test.ts`

- [ ] **Step 1: Write failing source contract tests**

Assert the dashboard passes images into `SharePhotoSelector`, renders hidden `imageIds`, and no longer requires tag checkboxes as the share content source.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/integration/share-query.test.ts`

Expected: FAIL because the component is not wired.

- [ ] **Step 3: Implement component and page wiring**

Build a client component with tag filters, square thumbnails, per-image checkboxes, visible-only select-all, selected count, and hidden `imageIds` inputs.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/unit/share-selection.test.ts tests/integration/share-query.test.ts`

Expected: PASS.

### Task 5: Verification

**Files:**
- Verify implementation state.

- [ ] **Step 1: Generate Prisma client**

Run: `npm run db:generate`

Expected: PASS.

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- tests/unit/share-selection.test.ts tests/unit/share-tokens.test.ts tests/integration/share-query.test.ts`

Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.
