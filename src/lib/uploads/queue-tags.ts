export type QueueTagDraft = {
  addedTagIds: string[];
  removedDefaultTagIds: string[];
  addedTagNames: string[];
  removedDefaultTagNames: string[];
};

type QueueTagInput = {
  defaultTagIds: string[];
  defaultTagNames: string[];
  draft: QueueTagDraft;
};

type ToggleExistingTagArgs = {
  tagId: string;
  defaultSelected: boolean;
  draft: QueueTagDraft;
};

type ToggleNamedTagArgs = {
  tagName: string;
  defaultSelected: boolean;
  draft: QueueTagDraft;
};

function normalizeTagIds(tagIds: string[]): string[] {
  return Array.from(new Set(tagIds.filter(Boolean)));
}

function normalizeTagName(name: string): string {
  return name.trim();
}

function getTagNameKey(name: string): string {
  return normalizeTagName(name).toLocaleLowerCase();
}

function normalizeTagNames(tagNames: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of tagNames) {
    const normalized = normalizeTagName(name);
    if (!normalized) {
      continue;
    }

    const key = getTagNameKey(normalized);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function hasTagId(tagIds: string[], tagId: string): boolean {
  return tagIds.includes(tagId);
}

function addTagId(tagIds: string[], tagId: string): string[] {
  return normalizeTagIds([...tagIds, tagId]);
}

function removeTagId(tagIds: string[], tagId: string): string[] {
  return tagIds.filter((currentTagId) => currentTagId !== tagId);
}

function hasTagName(tagNames: string[], tagName: string): boolean {
  const key = getTagNameKey(tagName);
  return tagNames.some((currentTagName) => getTagNameKey(currentTagName) === key);
}

function addTagName(tagNames: string[], tagName: string): string[] {
  return normalizeTagNames([...tagNames, tagName]);
}

function removeTagName(tagNames: string[], tagName: string): string[] {
  const key = getTagNameKey(tagName);
  return tagNames.filter((currentTagName) => getTagNameKey(currentTagName) !== key);
}

function isExistingTagSelected(args: ToggleExistingTagArgs): boolean {
  const { defaultSelected, draft, tagId } = args;
  const added = hasTagId(draft.addedTagIds, tagId);
  const removedDefault = hasTagId(draft.removedDefaultTagIds, tagId);

  if (defaultSelected) {
    return !removedDefault || added;
  }

  return added;
}

function isNamedTagSelected(args: ToggleNamedTagArgs): boolean {
  const { defaultSelected, draft, tagName } = args;
  const added = hasTagName(draft.addedTagNames, tagName);
  const removedDefault = hasTagName(draft.removedDefaultTagNames, tagName);

  if (defaultSelected) {
    return !removedDefault || added;
  }

  return added;
}

function setExistingTagSelected(args: ToggleExistingTagArgs & { selected: boolean }): QueueTagDraft {
  const { defaultSelected, draft, selected, tagId } = args;
  const currentlySelected = isExistingTagSelected(args);

  if (selected === currentlySelected) {
    return draft;
  }

  if (selected) {
    if (defaultSelected) {
      return {
        ...draft,
        addedTagIds: removeTagId(draft.addedTagIds, tagId),
        removedDefaultTagIds: removeTagId(draft.removedDefaultTagIds, tagId)
      };
    }

    return {
      ...draft,
      addedTagIds: addTagId(draft.addedTagIds, tagId),
      removedDefaultTagIds: removeTagId(draft.removedDefaultTagIds, tagId)
    };
  }

  if (defaultSelected) {
    return {
      ...draft,
      addedTagIds: removeTagId(draft.addedTagIds, tagId),
      removedDefaultTagIds: addTagId(draft.removedDefaultTagIds, tagId)
    };
  }

  return {
    ...draft,
    addedTagIds: removeTagId(draft.addedTagIds, tagId)
  };
}

function setNamedTagSelected(args: ToggleNamedTagArgs & { selected: boolean }): QueueTagDraft {
  const normalizedName = normalizeTagName(args.tagName);
  if (!normalizedName) {
    return args.draft;
  }

  const nextArgs = {
    ...args,
    tagName: normalizedName
  };
  const { defaultSelected, draft, selected, tagName } = nextArgs;
  const currentlySelected = isNamedTagSelected(nextArgs);

  if (selected === currentlySelected) {
    return draft;
  }

  if (selected) {
    if (defaultSelected) {
      return {
        ...draft,
        addedTagNames: removeTagName(draft.addedTagNames, tagName),
        removedDefaultTagNames: removeTagName(draft.removedDefaultTagNames, tagName)
      };
    }

    return {
      ...draft,
      addedTagNames: addTagName(draft.addedTagNames, tagName),
      removedDefaultTagNames: removeTagName(draft.removedDefaultTagNames, tagName)
    };
  }

  if (defaultSelected) {
    return {
      ...draft,
      addedTagNames: removeTagName(draft.addedTagNames, tagName),
      removedDefaultTagNames: addTagName(draft.removedDefaultTagNames, tagName)
    };
  }

  return {
    ...draft,
    addedTagNames: removeTagName(draft.addedTagNames, tagName)
  };
}

export function createQueueTagDraft(): QueueTagDraft {
  return {
    addedTagIds: [],
    removedDefaultTagIds: [],
    addedTagNames: [],
    removedDefaultTagNames: []
  };
}

export function parseQueueTagNames(input: string): string[] {
  return normalizeTagNames(input.split(","));
}

export function toggleQueueItemExistingTag(args: ToggleExistingTagArgs): QueueTagDraft {
  return setExistingTagSelected({
    ...args,
    selected: !isExistingTagSelected(args)
  });
}

export function toggleQueueItemNamedTag(args: ToggleNamedTagArgs): QueueTagDraft {
  return setNamedTagSelected({
    ...args,
    selected: !isNamedTagSelected(args)
  });
}

export function selectQueueItemNamedTags(
  draft: QueueTagDraft,
  tagNames: string[],
  defaultTagNames: string[]
): QueueTagDraft {
  return normalizeTagNames(tagNames).reduce((currentDraft, tagName) => {
    const defaultSelected = hasTagName(defaultTagNames, tagName);
    return setNamedTagSelected({
      draft: currentDraft,
      tagName,
      defaultSelected,
      selected: true
    });
  }, draft);
}

export function getEditableQueueTagNames({
  defaultTagNames,
  draft
}: Pick<QueueTagInput, "defaultTagNames" | "draft">): string[] {
  return normalizeTagNames([
    ...defaultTagNames,
    ...draft.addedTagNames,
    ...draft.removedDefaultTagNames
  ]);
}

export function getEffectiveQueueTags({
  defaultTagIds,
  defaultTagNames,
  draft
}: QueueTagInput): {
  tagIds: string[];
  tagNames: string[];
} {
  const activeDefaultTagIds = normalizeTagIds(defaultTagIds).filter(
    (tagId) => !hasTagId(draft.removedDefaultTagIds, tagId)
  );
  const activeDefaultTagNames = normalizeTagNames(defaultTagNames).filter(
    (tagName) => !hasTagName(draft.removedDefaultTagNames, tagName)
  );

  return {
    tagIds: normalizeTagIds([...activeDefaultTagIds, ...draft.addedTagIds]),
    tagNames: normalizeTagNames([...activeDefaultTagNames, ...draft.addedTagNames])
  };
}

export function buildQueueTagPayload(input: QueueTagInput): {
  tagIds: string[];
  tagNames: string[];
} {
  return getEffectiveQueueTags(input);
}
