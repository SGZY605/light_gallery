import { describe, expect, it } from "vitest";
import {
  buildQueueTagPayload,
  createQueueTagDraft,
  getEffectiveQueueTags,
  getEditableQueueTagNames,
  toggleQueueItemExistingTag,
  toggleQueueItemNamedTag
} from "@/lib/uploads/queue-tags";

describe("upload queue tag helpers", () => {
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

  it("adds and removes a single-image existing tag outside the batch defaults", () => {
    const added = toggleQueueItemExistingTag({
      tagId: "tag-2",
      defaultSelected: false,
      draft: createQueueTagDraft()
    });

    expect(
      getEffectiveQueueTags({
        defaultTagIds: ["tag-1"],
        defaultTagNames: [],
        draft: added
      })
    ).toEqual({
      tagIds: ["tag-1", "tag-2"],
      tagNames: []
    });

    const removed = toggleQueueItemExistingTag({
      tagId: "tag-2",
      defaultSelected: false,
      draft: added
    });

    expect(
      getEffectiveQueueTags({
        defaultTagIds: ["tag-1"],
        defaultTagNames: [],
        draft: removed
      })
    ).toEqual({
      tagIds: ["tag-1"],
      tagNames: []
    });
  });

  it("keeps a single-image removal when other batch defaults change", () => {
    const draft = toggleQueueItemExistingTag({
      tagId: "tag-1",
      defaultSelected: true,
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

    expect(
      getEffectiveQueueTags({
        defaultTagIds: ["tag-2"],
        defaultTagNames: [],
        draft
      })
    ).toEqual({
      tagIds: ["tag-2"],
      tagNames: []
    });
  });

  it("toggles per-image text tags and keeps editable candidates for removed batch names", () => {
    const removedDefault = toggleQueueItemNamedTag({
      tagName: " Travel ",
      defaultSelected: true,
      draft: createQueueTagDraft()
    });

    expect(
      getEffectiveQueueTags({
        defaultTagIds: [],
        defaultTagNames: ["Travel", "Family"],
        draft: removedDefault
      })
    ).toEqual({
      tagIds: [],
      tagNames: ["Family"]
    });

    expect(
      getEditableQueueTagNames({
        defaultTagNames: ["Travel", "Family"],
        draft: removedDefault
      })
    ).toEqual(["Travel", "Family"]);

    const addedCustom = toggleQueueItemNamedTag({
      tagName: "  Night Walk  ",
      defaultSelected: false,
      draft: removedDefault
    });

    expect(
      getEffectiveQueueTags({
        defaultTagIds: [],
        defaultTagNames: ["Travel", "Family"],
        draft: addedCustom
      })
    ).toEqual({
      tagIds: [],
      tagNames: ["Family", "Night Walk"]
    });
  });

  it("builds upload payload from the same effective queue tags", () => {
    const existingDraft = toggleQueueItemExistingTag({
      tagId: "tag-3",
      defaultSelected: false,
      draft: createQueueTagDraft()
    });
    const draft = toggleQueueItemNamedTag({
      tagName: " travel ",
      defaultSelected: true,
      draft: existingDraft
    });

    expect(
      buildQueueTagPayload({
        defaultTagIds: ["tag-1"],
        defaultTagNames: ["Travel", "Travel", "  ", "Family"],
        draft
      })
    ).toEqual({
      tagIds: ["tag-1", "tag-3"],
      tagNames: ["Family"]
    });
  });
});
