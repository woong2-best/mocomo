import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { PostShareCard } from "@/api/messages";

const cache = new Map<string, PostShareCard | "fail">();
const inflight = new Map<string, Promise<PostShareCard | null>>();

/** In-memory share-card cache — avoids N× spinner when remounting bubbles. */
export function getCachedPostShareCard(postId: string): PostShareCard | "fail" | null {
  return cache.get(postId) ?? null;
}

export async function loadPostShareCard(
  postId: string,
  signal?: AbortSignal
): Promise<PostShareCard | null> {
  const hit = cache.get(postId);
  if (hit === "fail") return null;
  if (hit) return hit;

  const existing = inflight.get(postId);
  if (existing) return existing;

  const task = (async () => {
    const ac = new AbortController();
    const onAbort = () => ac.abort();
    signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => ac.abort(), 5000);
    try {
      const res = await apiRequest<{ ok?: boolean; post?: PostShareCard }>(
        MobileApi.postShareCard(postId),
        { auth: true, signal: ac.signal }
      );
      if (res?.ok && res.post) {
        cache.set(postId, res.post);
        return res.post;
      }
      cache.set(postId, "fail");
      return null;
    } catch {
      cache.set(postId, "fail");
      return null;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      inflight.delete(postId);
    }
  })();

  inflight.set(postId, task);
  return task;
}

export function prefetchPostShareCards(postIds: string[]) {
  for (const id of postIds) {
    if (!id || cache.has(id) || inflight.has(id)) continue;
    void loadPostShareCard(id);
  }
}
