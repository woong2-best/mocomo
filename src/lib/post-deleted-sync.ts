export const POST_DELETED_EVENT = "mocomo:post-deleted";

export type PostDeletedDetail = { postId: string };

export function notifyPostDeleted(postId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PostDeletedDetail>(POST_DELETED_EVENT, {
      detail: { postId },
    })
  );
}

export function subscribePostDeleted(
  listener: (postId: string) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const postId = (event as CustomEvent<PostDeletedDetail>).detail?.postId;
    if (postId) listener(postId);
  };
  window.addEventListener(POST_DELETED_EVENT, handler);
  return () => window.removeEventListener(POST_DELETED_EVENT, handler);
}
