import { db } from "@/lib/db";
import { platformPostWhere } from "@/lib/post-scope";

/** Keep a just-posted item at the top of the author's own first page. */
export const VIEWER_RECENT_POST_WINDOW_MS = 30 * 60 * 1000;
export const VIEWER_RECENT_POST_LIMIT = 5;

export function mergeViewerRecentIds(
  recentIds: string[],
  existingIds: string[],
  limit?: number
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...recentIds, ...existingIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

export async function fetchViewerRecentPostIds(userId: string): Promise<string[]> {
  const rows = await db.post.findMany({
    where: {
      authorId: userId,
      ...platformPostWhere,
      createdAt: { gte: new Date(Date.now() - VIEWER_RECENT_POST_WINDOW_MS) },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: VIEWER_RECENT_POST_LIMIT,
  });
  return rows.map((row) => row.id);
}
