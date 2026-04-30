# Upload Queue Tag Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-image tag editing for ready upload queue items while keeping top-level upload tags as live batch defaults.

**Architecture:** Extract the batch-default plus per-item override rules into a small pure helper module, then wire `UploadDropzone` to store queue item overrides instead of full tag snapshots. Reuse the same helper for queue rendering and upload payload construction so the UI and server requests stay aligned.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Queue tag helper tests

**Files:**
- Create: `tests/unit/upload-queue-tags.test.ts`
- Create: `src/lib/uploads/queue-tags.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  buildQueueTagPayload,
  createQueueTagDraft,
  getEffectiveQueueTags,
  toggleQueueItemExistingTag
} from "@/lib/uploads/queue-tags";

it("applies batch defaults to each queue item", () => {
  const draft = createQueueTagDraft();

  expect(
    getEffectiveQueueTags({
      defaultTagIds: ["tag-1"],
      defaultTagNames: ["Travel"],
      draft
    })
  ).toEqual({
    tagIds: ["tag-1"],
    tagNames: ["Travel"]
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/upload-queue-tags.test.ts`

Expected: FAIL because `@/lib/uploads/queue-tags` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type QueueTagDraft = {
  addedTagIds: string[];
  removedDefaultTagIds: string[];
  addedTagNames: string[];
  removedDefaultTagNames: string[];
};

export function createQueueTagDraft(): QueueTagDraft {
  return {
    addedTagIds: [],
    removedDefaultTagIds: [],
    addedTagNames: [],
    removedDefaultTagNames: []
  };
}
```

Then extend the helper until the following behaviors pass:

- batch defaults appear in the effective result
- single-item edits can add an existing tag
- single-item edits can remove one batch-default existing tag
- top-level default removal naturally drops out of the effective result
- string tags are trimmed, deduplicated, and empties are removed
- upload payload uses the same effective result as the queue display

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/upload-queue-tags.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/upload-queue-tags.test.ts src/lib/uploads/queue-tags.ts
git commit -m "test: cover upload queue tag override rules"
```

### Task 2: Upload dropzone queue-state integration

**Files:**
- Modify: `src/components/upload-dropzone.tsx`
- Reuse: `src/lib/uploads/queue-tags.ts`

- [ ] **Step 1: Write the failing test**

Add one focused failing assertion in `tests/unit/upload-queue-tags.test.ts` for the UI-facing toggle semantics:

```ts
it("keeps a single-image removal when other batch defaults change", () => {
  const draft = toggleQueueItemExistingTag({
    tagId: "tag-1",
    isDefaultSelected: true,
    draft: createQueueTagDraft()
  });

  expect(
    getEffectiveQueueTags({
      defaultTagIds: ["tag-1", "tag-2"],
      defaultTagNames: [],
      draft
    })
  ).toEqual({
    tagIds: ["tag-2"],
    tagNames: []
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/upload-queue-tags.test.ts`

Expected: FAIL because the helper does not yet preserve this override correctly.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/upload-dropzone.tsx` to:

- extend `UploadQueueItem` with `QueueTagDraft`
- initialize each queued item with `createQueueTagDraft()`
- compute `defaultTagNames` from `newTagNames`
- render per-item tag pills plus a per-item new-tag input for `ready` / `failed`
- use helper functions for every item-level toggle instead of open-coded array mutation
- build upload `tagIds` / `tagNames` from `buildQueueTagPayload`

Use the helper in both rendering and upload:

```ts
const effectiveTags = getEffectiveQueueTags({
  defaultTagIds,
  defaultTagNames,
  draft: item.tagDraft
});

formData.append("tagIds", JSON.stringify(effectiveTags.tagIds));
formData.append("tagNames", JSON.stringify(effectiveTags.tagNames));
```

- [ ] **Step 4: Run targeted tests to verify it passes**

Run: `npm test -- tests/unit/upload-queue-tags.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/upload-dropzone.tsx src/lib/uploads/queue-tags.ts tests/unit/upload-queue-tags.test.ts
git commit -m "feat: support per-image upload queue tags"
```

### Task 3: Regression verification

**Files:**
- Verify existing upload and unit coverage

- [ ] **Step 1: Run upload-related tests**

Run: `npm test -- tests/unit/upload-queue-tags.test.ts tests/integration/upload-proxy.test.ts tests/integration/upload-complete.test.ts`

Expected: PASS

- [ ] **Step 2: Run full suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 3: Run build verification**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Commit final implementation state**

```bash
git status --short
git add src/components/upload-dropzone.tsx src/lib/uploads/queue-tags.ts tests/unit/upload-queue-tags.test.ts docs/superpowers/plans/2026-04-30-upload-queue-tag-overrides.md
git commit -m "feat: add upload queue tag overrides"
```
