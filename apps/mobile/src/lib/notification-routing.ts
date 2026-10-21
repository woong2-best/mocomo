export type NotificationRouteInput = {
  type?: string;
  link?: string | null;
  actor?: { username?: string | null; name?: string | null; image?: string | null } | null;
};

export function resolveNotificationPath(input: NotificationRouteInput): string | null {
  const raw = input.link?.trim();
  if (raw && raw !== "#") {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  const type = input.type ?? "";
  const username = input.actor?.username?.trim();
  if (username && (type === "follow" || type === "follow_request" || type === "profile")) {
    return `/u/${username}`;
  }
  return null;
}

export type MobileNotificationRoute =
  | { name: "MessageRoom"; params: { roomId: string; title?: string } }
  | { name: "PostDetail"; params: { id: string } }
  | { name: "UserProfile"; params: { username: string; name?: string | null; image?: string | null } }
  | { name: "LiveDetail"; params: { id: string } }
  | { name: "MarketplaceDetail"; params: { id: string } };

export function resolveMobileNotificationRoute(
  input: NotificationRouteInput
): MobileNotificationRoute | null {
  const path = resolveNotificationPath(input);
  if (!path) return null;

  const roomId = path.match(/^\/messages\/([^/?#]+)/)?.[1];
  if (roomId) {
    return { name: "MessageRoom", params: { roomId } };
  }

  const postId = path.match(/\/post\/([^/?#]+)/)?.[1];
  if (postId) {
    return { name: "PostDetail", params: { id: postId } };
  }

  const username = path.match(/^\/u\/([^/?#]+)/)?.[1];
  if (username) {
    return {
      name: "UserProfile",
      params: {
        username,
        name: input.actor?.name ?? null,
        image: input.actor?.image ?? null,
      },
    };
  }

  const marketId = path.match(/^\/market\/([^/?#]+)/)?.[1];
  if (marketId && marketId !== "orders" && marketId !== "my" && marketId !== "verify") {
    return { name: "MarketplaceDetail", params: { id: marketId } };
  }

  const liveId = path.match(/^\/voice\/([^/?#]+)/)?.[1];
  if (liveId) {
    return { name: "LiveDetail", params: { id: liveId } };
  }

  const type = input.type ?? "";
  if (
    (type === "dm" || type === "dm_group" || type === "mention") &&
    input.actor?.username
  ) {
    return { name: "UserProfile", params: { username: input.actor.username } };
  }

  return null;
}
