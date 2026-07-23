const VIEWED_KEY = "mocomo:post-views";

function readViewed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeViewed(ids: Set<string>) {
  try {
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / private mode */
  }
}

/** 세션당 1회만 조회 기록. 성공 시 true */
export async function recordPostViewOnce(postId: string): Promise<boolean> {
  if (!postId || typeof window === "undefined") return false;
  const viewed = readViewed();
  if (viewed.has(postId)) return false;
  viewed.add(postId);
  writeViewed(viewed);

  try {
    const res = await fetch(`/api/posts/${postId}/view`, { method: "POST" });
    if (!res.ok) {
      viewed.delete(postId);
      writeViewed(viewed);
      return false;
    }
    return true;
  } catch {
    viewed.delete(postId);
    writeViewed(viewed);
    return false;
  }
}
