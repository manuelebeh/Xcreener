export function parseTagsFromRow(raw: string | null): string[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
