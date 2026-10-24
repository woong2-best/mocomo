/** One hop: reply-to-reply stores under the root, never a third level. */
export function rootCommentId(clicked: {
  id: string;
  parentId: string | null;
}): string {
  return clicked.parentId ?? clicked.id;
}

/** Walk parentId until the top-level comment (guards old nested rows). */
export function walkReplyRoot(
  startId: string,
  byId: Map<string, { id: string; parentId: string | null }>
): string {
  let current = startId;
  const seen = new Set<string>();
  for (let i = 0; i < 8; i++) {
    if (seen.has(current)) return current;
    seen.add(current);
    const row = byId.get(current);
    if (!row?.parentId) return current;
    current = row.parentId;
  }
  return current;
}
