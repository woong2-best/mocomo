import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

const viewed = new Set<string>();

/** 앱 세션당 1회만 조회 기록. 성공 시 갱신된 viewCount 반환 */
export async function recordPostViewOnce(postId: string): Promise<number | null> {
  if (!postId || viewed.has(postId)) return null;
  viewed.add(postId);

  try {
    const res = await apiRequest<{ ok: boolean; viewCount?: number }>(MobileApi.postView(postId), {
      method: "POST",
      auth: true,
    });
    if (!res.ok) {
      viewed.delete(postId);
      return null;
    }
    return typeof res.viewCount === "number" ? res.viewCount : null;
  } catch {
    viewed.delete(postId);
    return null;
  }
}

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.max(0, n));
}
