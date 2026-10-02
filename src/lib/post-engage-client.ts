export const STAR_CHANGED_EVENT = "mocomo:star-changed";

export async function postEngage(postId: string, action: "like" | "repost" | "star") {
  const res = await fetch(`/api/posts/${postId}/${action}`, {
    method: "POST",
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "Request failed."
    );
  }
  return body as Record<string, unknown>;
}

export function notifyStarChanged(id: string, starred: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(STAR_CHANGED_EVENT, { detail: { id, postId: id, starred } })
  );
}

export async function engageStar(postId: string): Promise<boolean> {
  const data = await postEngage(postId, "star");
  const starred = !!data.starred;
  notifyStarChanged(postId, starred);
  return starred;
}
