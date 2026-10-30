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
