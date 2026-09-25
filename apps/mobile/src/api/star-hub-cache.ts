/**
 * Disk + memory snapshot of STAR bookmarks.
 * The list paints from this cache immediately; the Australia fetch only
 * replaces it when the visible list actually changed.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";
import type { FeedPost } from "@/api/feed";
import {
  clearAllStarBookmarks,
  fetchStarHub,
  type StarHubCreator,
  type StarHubResponse,
} from "@/api/discovery";
import { togglePostStar } from "@/api/social";
import { resolveVideoPoster } from "@/lib/video-poster";
import { prefetchImageUrls } from "@/perf/image";

const KEY_PREFIX = "mocomo.mobile-star-hub.v1";
/** Keep a just-toggled row if a lagged read replica answers first. */
const HOLD_MS = 8_000;
const WARM_COVERS = 18;

export const STAR_HUB_ALL_QUERY_KEY = ["mobile-star-hub", null] as const;

export function starHubQueryKey(creatorId: string | null) {
  return ["mobile-star-hub", creatorId] as const;
}

type Stored = {
  savedAt: number;
  userId: string;
  data: StarHubResponse;
};

type StarIntent = {
  post: FeedPost;
  starred: boolean;
};

type QuerySnapshot = [readonly unknown[], unknown][];

type Snapshot = {
  hub: StarHubResponse | null;
  savedAt: number;
  queries: QuerySnapshot;
};

const memory: { data: StarHubResponse | null; savedAt: number } = {
  data: null,
  savedAt: 0,
};

const filtered = new Map<string, StarHubResponse>();
let filteredSource: StarHubResponse | null = null;
const pending = new Map<string, StarIntent>();
const holds = new Map<string, StarIntent & { until: number }>();
let clearing = false;
let hubEpoch = 0;
let boundUserId: string | null = null;
let persistChain: Promise<void> = Promise.resolve();

function storageKey(userId: string) {
  return `${KEY_PREFIX}.${userId}`;
}

function resetMemory() {
  memory.data = null;
  memory.savedAt = 0;
  filtered.clear();
  filteredSource = null;
  pending.clear();
  holds.clear();
  clearing = false;
  hubEpoch += 1;
}

function isHub(value: unknown): value is StarHubResponse {
  if (!value || typeof value !== "object") return false;
  const hub = value as StarHubResponse;
  return Array.isArray(hub.items) && Array.isArray(hub.creators) && typeof hub.total === "number";
}

/** Cover URL shared with the feed image cache. */
export function starCoverUrl(post: FeedPost): string | null {
  const media = post.media?.[0];
  if (!media) return null;
  const isVideo = media.type === "VIDEO" || post.postType === "VIDEO";
  if (isVideo) return resolveVideoPoster(media) || media.url?.trim() || null;
  return media.url?.trim() || media.posterUrl?.trim() || null;
}

function warmCovers(hub: StarHubResponse) {
  const urls: string[] = [];
  for (const post of hub.items) {
    const url = starCoverUrl(post);
    if (!url) continue;
    urls.push(url);
    if (urls.length >= WARM_COVERS) break;
  }
  prefetchImageUrls(urls, WARM_COVERS);
}

function visibleStarSignature(hub: StarHubResponse): string {
  const items = hub.items
    .map((post) => {
      const media = post.media?.[0];
      const cover = media
        ? `${media.posterUrl ?? ""}|${media.url ?? ""}|${media.type ?? ""}|${media.duration ?? ""}|${media.streamUid ?? ""}|${media.hlsUrl ?? ""}`
        : "";
      return `${post.id}|${post.postType}|${post.title ?? ""}|${(post.content ?? "").slice(0, 80)}|${cover}`;
    })
    .join("\n");
  const creators = hub.creators
    .map((creator) => `${creator.id}|${creator.count}|${creator.username}|${creator.name ?? ""}|${creator.image ?? ""}`)
    .join("\n");
  return `${hub.total}\n${creators}\n${items}`;
}

/** Filter chips stay on the full creator strip; only the grid rows change. */
function starHubView(hub: StarHubResponse, creatorId: string | null): StarHubResponse {
  if (!creatorId) return hub;
  return {
    items: hub.items.filter((post) => post.author?.id === creatorId),
    creators: hub.creators,
    total: hub.total,
  };
}

function viewFor(creatorId: string | null): StarHubResponse | undefined {
  const hub = memory.data;
  if (!hub) return undefined;
  if (!creatorId) return hub;
  if (filteredSource !== hub) {
    filtered.clear();
    filteredSource = hub;
  }
  let view = filtered.get(creatorId);
  if (!view) {
    view = starHubView(hub, creatorId);
    filtered.set(creatorId, view);
  }
  return view;
}

function persistHub(hub: StarHubResponse) {
  const userId = boundUserId;
  if (!userId) return;
  const payload: Stored = { savedAt: memory.savedAt, userId, data: hub };
  const raw = JSON.stringify(payload);
  const key = storageKey(userId);
  persistChain = persistChain
    .then(() => AsyncStorage.setItem(key, raw))
    .catch(() => undefined);
}

/** Load this account's list into memory. Another account's disk copy is left intact. */
export async function loadStarHubBootstrap(userId: string | null): Promise<StarHubResponse | null> {
  if (userId && boundUserId === userId && memory.data) return memory.data;
  if (boundUserId !== userId) resetMemory();
  boundUserId = userId;
  if (!userId) return null;
  const epochAtRead = hubEpoch;
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (boundUserId !== userId || hubEpoch !== epochAtRead) return memory.data;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.userId !== userId || !isHub(parsed.data)) return null;
    memory.data = parsed.data;
    memory.savedAt = parsed.savedAt || 0;
    filtered.clear();
    filteredSource = null;
    return memory.data;
  } catch {
    return null;
  }
}

/** Bind the signed-in account and paint its cached list. Drops the previous account's rows. */
export async function hydrateStarHubQuery(queryClient: QueryClient, userId: string | null) {
  const userChanged = boundUserId !== userId;
  const hub = await loadStarHubBootstrap(userId);
  if (userChanged) queryClient.removeQueries({ queryKey: ["mobile-star-hub"] });
  if (hub) queryClient.setQueryData(STAR_HUB_ALL_QUERY_KEY, hub);
}

export async function clearStarHubBootstrap(): Promise<void> {
  const userId = boundUserId;
  boundUserId = null;
  resetMemory();
  try {
    await persistChain;
  } catch {
    // ignore queued writes; the remove below is the source of truth
  }
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

function adjustCreators(
  creators: StarHubCreator[],
  post: FeedPost,
  delta: number
): StarHubCreator[] {
  const authorId = post.author?.id;
  if (!authorId || delta === 0) return creators;
  const index = creators.findIndex((creator) => creator.id === authorId);
  if (index < 0) return creators;
  const nextCount = creators[index].count + delta;
  const next =
    nextCount > 0
      ? creators.map((creator, i) => (i === index ? { ...creator, count: nextCount } : creator))
      : creators.filter((_, i) => i !== index);
  return next.sort((a, b) => b.count - a.count);
}

function projectToggle(hub: StarHubResponse, post: FeedPost, starred: boolean): StarHubResponse {
  const exists = hub.items.some((item) => item.id === post.id);
  if (starred) {
    if (exists) {
      let changed = false;
      const items = hub.items.map((item) => {
        if (item.id !== post.id || item.starred === true) return item;
        changed = true;
        return { ...item, starred: true };
      });
      return changed ? { ...hub, items } : hub;
    }
    return {
      items: [{ ...post, starred: true }, ...hub.items],
      creators: adjustCreators(hub.creators, post, 1),
      total: hub.total + 1,
    };
  }
  if (!exists) return hub;
  return {
    items: hub.items.filter((item) => item.id !== post.id),
    creators: adjustCreators(hub.creators, post, -1),
    total: Math.max(0, hub.total - 1),
  };
}

function overlay(hub: StarHubResponse): StarHubResponse {
  if (clearing) return { items: [], creators: [], total: 0 };
  let next = hub;
  for (const intent of pending.values()) {
    next = projectToggle(next, intent.post, intent.starred);
  }
  const now = Date.now();
  for (const [id, hold] of holds) {
    if (hold.until < now) {
      holds.delete(id);
      continue;
    }
    const has = next.items.some((item) => item.id === id);
    if (hold.starred === has) continue;
    next = projectToggle(next, hold.post, hold.starred);
  }
  return next;
}

function publishHub(queryClient: QueryClient, hub: StarHubResponse) {
  hubEpoch += 1;
  memory.data = hub;
  memory.savedAt = Date.now();
  filtered.clear();
  filteredSource = null;
  queryClient.setQueryData(STAR_HUB_ALL_QUERY_KEY, hub);
  const cached = queryClient.getQueriesData<StarHubResponse>({ queryKey: ["mobile-star-hub"] });
  for (const [key] of cached) {
    const creatorId = key[1];
    if (typeof creatorId === "string" && creatorId.length > 0) {
      const view = viewFor(creatorId);
      if (view) queryClient.setQueryData(key, view);
    }
  }
  persistHub(hub);
  warmCovers(hub);
}

function acceptServerHub(queryClient: QueryClient, fresh: StarHubResponse): StarHubResponse {
  const merged = overlay(fresh);
  const prev = memory.data;
  if (prev && visibleStarSignature(prev) === visibleStarSignature(merged)) return prev;
  publishHub(queryClient, merged);
  return memory.data ?? merged;
}

function patchPage(page: unknown, ids: Set<string>, starred: boolean): unknown {
  if (!page || typeof page !== "object") return page;
  const row = page as { items?: unknown[]; starredIds?: string[] };
  let changed = false;
  let items = row.items;
  if (Array.isArray(row.items)) {
    items = row.items.map((item) => {
      if (!item || typeof item !== "object") return item;
      const entry = item as { type?: string; data?: { id?: string; starred?: boolean } };
      if (entry.type === "ad" || !entry.data?.id || !ids.has(entry.data.id)) return item;
      if (!!entry.data.starred === starred) return item;
      changed = true;
      return { ...entry, data: { ...entry.data, starred } };
    });
  }
  let starredIds = row.starredIds;
  if (Array.isArray(row.starredIds)) {
    const set = new Set(row.starredIds);
    let idsChanged = false;
    for (const id of ids) {
      if (starred && !set.has(id)) {
        set.add(id);
        idsChanged = true;
      } else if (!starred && set.has(id)) {
        set.delete(id);
        idsChanged = true;
      }
    }
    if (idsChanged) {
      starredIds = [...set];
      changed = true;
    }
  }
  if (!changed) return page;
  return { ...row, items, starredIds };
}

function patchInfinite(old: unknown, ids: Set<string>, starred: boolean): unknown {
  if (!old || typeof old !== "object" || !("pages" in old)) return old;
  const data = old as { pages: unknown[] };
  if (!Array.isArray(data.pages)) return old;
  let changed = false;
  const pages = data.pages.map((page) => {
    const next = patchPage(page, ids, starred);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? { ...data, pages } : old;
}

function patchPostDetail(old: unknown, ids: Set<string>, starred: boolean): unknown {
  if (!old || typeof old !== "object" || !("post" in old)) return old;
  const row = old as { post?: { id?: string; starred?: boolean } };
  if (!row.post?.id || !ids.has(row.post.id) || !!row.post.starred === starred) return old;
  return { ...(old as object), post: { ...row.post, starred } };
}

function patchProfile(old: unknown, ids: Set<string>, starred: boolean): unknown {
  if (!old || typeof old !== "object" || !("posts" in old)) return old;
  const row = old as { posts?: { id?: string; starred?: boolean }[] };
  if (!Array.isArray(row.posts)) return old;
  let changed = false;
  const posts = row.posts.map((post) => {
    if (!post?.id || !ids.has(post.id) || !!post.starred === starred) return post;
    changed = true;
    return { ...post, starred };
  });
  return changed ? { ...(old as object), posts } : old;
}

function patchFlags(queryClient: QueryClient, ids: Set<string>, starred: boolean) {
  if (ids.size === 0) return;
  queryClient.setQueriesData({ queryKey: ["mobile-feed"] }, (old) => patchInfinite(old, ids, starred));
  queryClient.setQueriesData({ queryKey: ["mobile-qna-feed"] }, (old) =>
    patchInfinite(old, ids, starred)
  );
  queryClient.setQueriesData({ queryKey: ["mobile-post"] }, (old) => patchPostDetail(old, ids, starred));
  queryClient.setQueriesData({ queryKey: ["mobile-user"] }, (old) => patchProfile(old, ids, starred));
}

function capture(queryClient: QueryClient): Snapshot {
  return {
    hub: memory.data,
    savedAt: memory.savedAt,
    queries: [
      ...queryClient.getQueriesData({ queryKey: ["mobile-star-hub"] }),
      ...queryClient.getQueriesData({ queryKey: ["mobile-feed"] }),
      ...queryClient.getQueriesData({ queryKey: ["mobile-qna-feed"] }),
      ...queryClient.getQueriesData({ queryKey: ["mobile-post"] }),
      ...queryClient.getQueriesData({ queryKey: ["mobile-user"] }),
    ],
  };
}

function restore(queryClient: QueryClient, snap: Snapshot) {
  hubEpoch += 1;
  memory.data = snap.hub;
  memory.savedAt = snap.savedAt;
  filtered.clear();
  filteredSource = null;
  if (snap.hub) persistHub(snap.hub);
  else if (boundUserId) {
    const key = storageKey(boundUserId);
    persistChain = persistChain
      .then(() => AsyncStorage.removeItem(key))
      .catch(() => undefined);
  }
  for (const [key, data] of snap.queries) {
    queryClient.setQueryData(key, data);
  }
}

export function starHubQueryOptions(queryClient: QueryClient, creatorId: string | null) {
  return {
    queryKey: starHubQueryKey(creatorId),
    queryFn: async (): Promise<StarHubResponse> => {
      const epoch = hubEpoch;
      const userAtStart = boundUserId;
      const fresh = await fetchStarHub(creatorId);
      if (epoch !== hubEpoch || userAtStart !== boundUserId) {
        const cached = viewFor(creatorId);
        if (cached) return cached;
        throw new Error("STAR_HUB_SUPERSEDED");
      }
      if (creatorId) {
        const merged = starHubView(overlay(fresh), creatorId);
        const local = viewFor(creatorId);
        if (local && visibleStarSignature(local) === visibleStarSignature(merged)) return local;
        return merged;
      }
      return acceptServerHub(queryClient, fresh);
    },
    initialData: () => viewFor(creatorId),
    initialDataUpdatedAt: 0,
    staleTime: 0,
    gcTime: 30 * 60_000,
    refetchOnMount: "always" as const,
  };
}

/** Flip the icon's cache immediately. Rolls back only when the POST fails. */
export function runOptimisticStarToggle(
  queryClient: QueryClient,
  post: FeedPost,
  nextStarred: boolean
): Promise<{ starred: boolean }> {
  const snap = capture(queryClient);
  const userAtStart = boundUserId;
  const intentPost = { ...post, starred: nextStarred };
  pending.set(post.id, { post: intentPost, starred: nextStarred });
  holds.delete(post.id);
  const base = memory.data ?? { items: [], creators: [], total: 0 };
  publishHub(queryClient, projectToggle(base, intentPost, nextStarred));
  patchFlags(queryClient, new Set([post.id]), nextStarred);

  return togglePostStar(post.id)
    .then((res) => {
      if (boundUserId !== userAtStart) return res;
      pending.delete(post.id);
      holds.set(post.id, {
        post: { ...intentPost, starred: res.starred },
        starred: res.starred,
        until: Date.now() + HOLD_MS,
      });
      if (res.starred !== nextStarred) {
        const current = memory.data ?? { items: [], creators: [], total: 0 };
        publishHub(queryClient, projectToggle(current, intentPost, res.starred));
        patchFlags(queryClient, new Set([post.id]), res.starred);
      }
      return res;
    })
    .catch((err) => {
      if (boundUserId !== userAtStart) throw err;
      pending.delete(post.id);
      holds.delete(post.id);
      restore(queryClient, snap);
      throw err;
    });
}

/** Drop the saved list immediately. Restores it if DELETE fails. */
export async function commitClearStarHub(queryClient: QueryClient): Promise<void> {
  const snap = capture(queryClient);
  const userAtStart = boundUserId;
  const removedIds = new Set((snap.hub?.items ?? []).map((post) => post.id));
  clearing = true;
  pending.clear();
  holds.clear();
  publishHub(queryClient, { items: [], creators: [], total: 0 });
  patchFlags(queryClient, removedIds, false);
  try {
    await clearAllStarBookmarks();
    if (boundUserId === userAtStart) clearing = false;
  } catch (err) {
    if (boundUserId === userAtStart) {
      clearing = false;
      restore(queryClient, snap);
    }
    throw err;
  }
}
