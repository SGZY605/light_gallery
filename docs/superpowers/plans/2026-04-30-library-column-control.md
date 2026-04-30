# Library Column Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-left floating slider control on the library page so users can adjust the gallery column count from 3 to 8, with the grid updating live and the control matching the existing top-right filter bar behavior.

**Architecture:** Keep `src/app/dashboard/library/page.tsx` as the server-side data loader and move page-level UI state into a small client shell. Add a dedicated column control component plus a tiny column-count helper, and make `ImageGrid` consume a controlled `columnCount` instead of hardcoded responsive column classes.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Framer Motion, Tailwind CSS, Vitest

---

### Task 1: Column Count Helper And Contracts

**Files:**
- Create: `src/lib/library/columns.ts`
- Create: `tests/unit/library-column-control.test.ts`

- [ ] **Step 1: Write the failing tests**

Add helper tests for the shared defaults and clamp behavior, plus source-contract checks for the new shell and controlled grid wiring.

```ts
expect(DEFAULT_LIBRARY_COLUMN_COUNT).toBe(4);
expect(clampLibraryColumnCount()).toBe(4);
expect(clampLibraryColumnCount(2)).toBe(3);
expect(clampLibraryColumnCount(9)).toBe(8);
expect(clampLibraryColumnCount(6)).toBe(6);
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: FAIL because the helper and new components do not exist yet.

- [ ] **Step 3: Write the minimal helper and component contracts**

Create:

```ts
export const DEFAULT_LIBRARY_COLUMN_COUNT = 4;
export const MIN_LIBRARY_COLUMN_COUNT = 3;
export const MAX_LIBRARY_COLUMN_COUNT = 8;

export function clampLibraryColumnCount(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_LIBRARY_COLUMN_COUNT;
  }

  return Math.min(MAX_LIBRARY_COLUMN_COUNT, Math.max(MIN_LIBRARY_COLUMN_COUNT, Math.round(value)));
}
```

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: PASS.

### Task 2: Library Client Shell And Floating Control

**Files:**
- Create: `src/components/library-page-shell.tsx`
- Create: `src/components/library-column-control.tsx`
- Modify: `src/components/library-filter-bar.tsx`
- Modify: `src/app/dashboard/library/page.tsx`
- Test: `tests/unit/library-column-control.test.ts`

- [ ] **Step 1: Extend the failing contract test**

Assert:

- `page.tsx` renders `LibraryPageShell`
- `library-page-shell.tsx` holds `useState(DEFAULT_LIBRARY_COLUMN_COUNT)`
- `library-page-shell.tsx` renders both `LibraryColumnControl` and `LibraryFilterBar`
- `library-column-control.tsx` contains a `type="range"` slider with `min={MIN_LIBRARY_COLUMN_COUNT}` and `max={MAX_LIBRARY_COLUMN_COUNT}`
- `library-column-control.tsx` sets `transformOrigin: "left"`

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: FAIL because the client shell and column control are not wired yet.

- [ ] **Step 3: Implement the client shell and floating control**

Key code shape:

```tsx
const [columnCount, setColumnCount] = useState(DEFAULT_LIBRARY_COLUMN_COUNT);

<div className="sticky top-0 z-20 flex items-start justify-between pb-2 pt-1">
  <LibraryColumnControl columnCount={columnCount} onColumnCountChange={setColumnCount} />
  <LibraryFilterBar query={query} selectedTagIds={selectedTagIds} tags={tags} />
</div>
<ImageGrid columnCount={columnCount} images={images} publicBaseUrl={publicBaseUrl} />
```

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: PASS.

### Task 3: Controlled Grid Columns

**Files:**
- Modify: `src/components/image-grid.tsx`
- Test: `tests/unit/library-column-control.test.ts`

- [ ] **Step 1: Extend the failing contract test**

Assert:

- `ImageGrid` accepts `columnCount?: number`
- `ImageGrid` resolves the count through `clampLibraryColumnCount`
- the root columns container uses `style={{ columnCount: resolvedColumnCount }}`
- the old `columns-2 md:columns-3 xl:columns-4` string is gone

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: FAIL because the grid still hardcodes responsive column classes.

- [ ] **Step 3: Implement the controlled columns**

Key code shape:

```tsx
const resolvedColumnCount = clampLibraryColumnCount(columnCount);

<div className="gap-0.5" style={{ columnCount: resolvedColumnCount }}>
```

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: PASS.

### Task 4: Verification

**Files:**
- Verify implementation state only.

- [ ] **Step 1: Run focused unit tests**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: PASS.

- [ ] **Step 2: Run broader related tests**

Run: `npm test -- tests/unit/share-selection.test.ts tests/integration/share-query.test.ts`

Expected: PASS, proving the earlier share-page work still holds.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS. Existing non-blocking Next `<img>` guidance warnings may still appear.

- [ ] **Step 4: Start the dev server for manual review**

Run: `npm run dev`

Expected: the local development server starts and exposes a usable URL for browser testing.
