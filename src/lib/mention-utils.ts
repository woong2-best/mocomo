/** Extract @username mentions (deduped). Usernames are 3–20 ascii letters, numbers, underscore. */
export function extractMentionUsernames(text: string): string[] {
  const matches = text.matchAll(/(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of matches) {
    const handle = match[1];
    if (!handle) continue;
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(handle);
  }
  return out;
}

export function getMentionContext(
  text: string,
  cursor: number
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s([{（［])@([A-Za-z0-9_]*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return { query, start: cursor - query.length - 1 };
}

export function insertMentionToken(
  text: string,
  start: number,
  cursor: number,
  username: string
): { next: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(cursor);
  const spacer = after.startsWith(" ") ? "" : " ";
  const token = `@${username}${spacer}`;
  return {
    next: `${before}${token}${after}`,
    caret: start + token.length,
  };
}
