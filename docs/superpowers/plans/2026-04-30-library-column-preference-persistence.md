# Library Column Preference Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each user's library column count preference at the account level so returning to `/dashboard/library` restores the previously saved layout.

**Architecture:** Add `libraryColumnCount` directly to `User`, read it on the server as the library page's initial column count, and save updates through a small authenticated API route after client-side debounce. Keep the grid reactive locally and treat persistence as a quiet background sync rather than a blocking workflow.

**Tech Stack:** Next.js 15 App Router, React 18, Prisma 5, TypeScript, Vitest

---

### Task 1: Persisted Preference Contracts

**Files:**
- Modify: `tests/unit/library-column-control.test.ts`
- Create: `tests/integration/library-column-preference-route.test.ts`

- [ ] **Step 1: Write the failing tests**

Extend the unit/source contract tests to require:

```ts
expect(pageSource).toContain("initialColumnCount={user.libraryColumnCount}");
expect(shellSource).toContain("initialColumnCount: number");
expect(shellSource).toContain("useState(initialColumnCount)");
expect(shellSource).toContain('fetch("/api/users/library-preference"');
expect(shellSource).toContain("setTimeout");
```

Add integration tests for the new route:

```ts
expect(response.status).toBe(200);
expect(userUpdateMock).toHaveBeenCalledWith({
  where: { id: "user-1" },
  data: { libraryColumnCount: 8 },
  select: { libraryColumnCount: true }
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- tests/unit/library-column-control.test.ts tests/integration/library-column-preference-route.test.ts`

Expected: FAIL because the library page does not yet pass a persisted initial value and the new API route does not exist.

- [ ] **Step 3: Keep the tests focused on real behavior**

The route tests should also assert:

- `401` when no current user exists
- out-of-range values are clamped before `db.user.update`
- only the current user's record is updated

- [ ] **Step 4: Re-run the tests to confirm they still fail for the expected reasons**

Run: `npm test -- tests/unit/library-column-control.test.ts tests/integration/library-column-preference-route.test.ts`

Expected: FAIL with missing implementation, not malformed tests.

### Task 2: Schema And Persistence Route

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/pre-schema-sync.sql`
- Create: `src/app/api/users/library-preference/route.ts`
- Test: `tests/integration/library-column-preference-route.test.ts`

- [ ] **Step 1: Add the schema field**

Update `User`:

```prisma
model User {
  id                 String  @id @default(cuid())
  email              String  @unique
  name               String
  passwordHash       String
  role               UserRole @default(MEMBER)
  libraryColumnCount Int      @default(4)
  ...
}
```

- [ ] **Step 2: Add the pre-schema sync SQL**

Append a guarded column add:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'libraryColumnCount'
  ) THEN
    ALTER TABLE "User"
    ADD COLUMN "libraryColumnCount" INTEGER NOT NULL DEFAULT 4;
  END IF;
END $$;
```

- [ ] **Step 3: Implement the authenticated route**

Create `src/app/api/users/library-preference/route.ts` with:

```ts
const schema = z.object({
  columnCount: z.number()
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const libraryColumnCount = clampLibraryColumnCount(parsed.data.columnCount);
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { libraryColumnCount },
    select: { libraryColumnCount: true }
  });

  return NextResponse.json(updatedUser);
}
```

- [ ] **Step 4: Run the route tests to verify GREEN**

Run: `npm test -- tests/integration/library-column-preference-route.test.ts`

Expected: PASS.

### Task 3: Library Page Wiring And Debounced Save

**Files:**
- Modify: `src/app/dashboard/library/page.tsx`
- Modify: `src/components/library-page-shell.tsx`
- Test: `tests/unit/library-column-control.test.ts`

- [ ] **Step 1: Update the failing source-contract expectations**

The tests must now require:

- `DashboardLibraryPage` passes `initialColumnCount={user.libraryColumnCount}`
- `LibraryPageShellProps` includes `initialColumnCount`
- state starts from `useState(initialColumnCount)`
- `useEffect` schedules a debounced save to `/api/users/library-preference`

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: FAIL because the library page still bootstraps from the static default and never persists.

- [ ] **Step 3: Implement the page and shell updates**

Update `page.tsx` to pass the server value:

```tsx
<LibraryPageShell
  initialColumnCount={user.libraryColumnCount}
  ...
/>
```

Update `library-page-shell.tsx` to debounce a background save:

```tsx
const [columnCount, setColumnCount] = useState(initialColumnCount);

useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    void fetch("/api/users/library-preference", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnCount })
    });
  }, 300);

  return () => window.clearTimeout(timeoutId);
}, [columnCount]);
```

The effect should avoid an immediate no-op save on first render by comparing against the initial value.

- [ ] **Step 4: Run the unit tests to verify GREEN**

Run: `npm test -- tests/unit/library-column-control.test.ts`

Expected: PASS.

### Task 4: Verification

**Files:**
- Verify implementation state only.

- [ ] **Step 1: Run the new focused tests**

Run: `npm test -- tests/unit/library-column-control.test.ts tests/integration/library-column-preference-route.test.ts`

Expected: PASS.

- [ ] **Step 2: Run related regression tests**

Run: `npm test -- tests/unit/share-selection.test.ts tests/integration/share-query.test.ts`

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS. Existing Next `<img>` warnings may remain.
