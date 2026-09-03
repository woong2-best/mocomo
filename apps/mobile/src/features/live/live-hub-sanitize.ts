import type { LiveListItem } from "@/api/live";
import { coerceViewerCount } from "@/features/live/live-categories";

export function sanitizeLiveListItem(raw: LiveListItem): LiveListItem {
  const host = raw.host ?? {
    id: "unknown",
    username: "host",
    image: null,
    isPartner: false,
    followerCount: 0,
  };

  return {
    id: String(raw.id ?? ""),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "라이브",
    thumbnailUrl: raw.thumbnailUrl ?? null,
    viewerCount: coerceViewerCount(raw.viewerCount),
    category: typeof raw.category === "string" ? raw.category : "LIVE",
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : [],
    broadcastMode: raw.broadcastMode ?? null,
    isNsfw: Boolean(raw.isNsfw),
    contentRating: typeof raw.contentRating === "string" ? raw.contentRating : "GENERAL",
    host: {
      id: String(host.id ?? "unknown"),
      username: typeof host.username === "string" ? host.username : "host",
      image: host.image ?? null,
      isPartner: Boolean(host.isPartner),
      followerCount: coerceViewerCount(host.followerCount),
    },
  };
}

export function sanitizeLiveListItems(items: LiveListItem[] | undefined | null): LiveListItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(sanitizeLiveListItem).filter((item) => item.id.length > 0);
}
