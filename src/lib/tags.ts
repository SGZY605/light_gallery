export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function slugifyTagName(name: string): string {
  const normalizedValue = normalizeTagName(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const slug = normalizedValue.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "tag";
}
