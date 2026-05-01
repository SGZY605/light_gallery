# Photo Entry Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add refresh-time entry animations to the gallery grid and albums thumbnails.

**Architecture:** Use CSS keyframes and CSS custom properties for index-based stagger timing. Keep the gallery animation in `ImageGrid`, keep album animation in `AlbumPhotoTile`, and pass `entryIndex` from album list call sites. The gallery and album tiles now share the same soft entry timing.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest source-contract tests.

---

## File Structure

- Modify `tests/unit/image-grid-hover.test.ts` to add failing source-contract assertions for the gallery soft entry class, index CSS variable, and shared global keyframes.
- Modify `tests/unit/albums-view.test.ts` to add failing source-contract assertions for album soft entry behavior and index propagation.
- Modify `src/components/image-grid.tsx` to set `gallery-entry-tile` and `--entry-index` on each gallery tile.
- Modify `src/components/album-photo-tile.tsx` to accept `entryIndex`, set `album-entry-tile`, and set `--entry-index`.
- Modify `src/components/albums-browser.tsx`, `src/app/dashboard/albums/favorites/page.tsx`, and `src/app/dashboard/albums/memories/[memoryId]/page.tsx` to pass list indexes to `AlbumPhotoTile`.
- Modify `src/app/globals.css` to define gallery and album entry keyframes/classes plus `prefers-reduced-motion`.

## Task 1: Gallery Soft Entry Contract

**Files:**
- Modify: `tests/unit/image-grid-hover.test.ts`
- Modify: `src/components/image-grid.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing test**

Add assertions that `ImageGrid` uses `gallery-entry-tile`, sets `--entry-index`, and global CSS points the gallery tile at `album-soft-entry`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/unit/image-grid-hover.test.ts`

Expected: FAIL because the new class/keyframes are not implemented yet.

- [ ] **Step 3: Implement minimal gallery entry behavior**

Add a typed CSS custom property on the gallery tile wrapper and define the gallery keyframes/class in `globals.css`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/unit/image-grid-hover.test.ts`

Expected: PASS.

## Task 2: Album Soft Entry Contract

**Files:**
- Modify: `tests/unit/albums-view.test.ts`
- Modify: `src/components/album-photo-tile.tsx`
- Modify: `src/components/albums-browser.tsx`
- Modify: `src/app/dashboard/albums/favorites/page.tsx`
- Modify: `src/app/dashboard/albums/memories/[memoryId]/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing test**

Add assertions that `AlbumPhotoTile` accepts `entryIndex = 0`, uses `album-entry-tile`, sets `--entry-index`, global CSS defines `album-soft-entry`, and album list call sites pass `entryIndex`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/unit/albums-view.test.ts`

Expected: FAIL because the prop, class, CSS, and index propagation are not implemented yet.

- [ ] **Step 3: Implement minimal album entry behavior**

Add `entryIndex` to `AlbumPhotoTile`, apply the CSS variable and class, and pass indexes from album grids and preview mosaics.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/unit/albums-view.test.ts`

Expected: PASS.

## Task 3: Final Verification

**Files:**
- Verify all modified source and test files.

- [ ] **Step 1: Run focused regression tests**

Run: `npm test -- tests/unit/image-grid-hover.test.ts tests/unit/albums-view.test.ts`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Inspect git diff**

Run: `git diff -- src/components/image-grid.tsx src/components/album-photo-tile.tsx src/components/albums-browser.tsx src/app/dashboard/albums/favorites/page.tsx src/app/dashboard/albums/memories/[memoryId]/page.tsx src/app/globals.css tests/unit/image-grid-hover.test.ts tests/unit/albums-view.test.ts`

Expected: Diff only contains entry animation code, tests, and plan.
