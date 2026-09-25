/**
 * Disk + memory snapshot of people the user follows, for the message picker.
 * Paint the last list immediately; the query revalidates in the background.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";
import { fetchFollowingForDm, type MessageUserHit } from "@/api/messages";

const STORAGE_KEY = "mocomo.mobile-following-dm.v1";

export const FOLLOWING_DM_QUERY_KEY = ["mobile-following-for-dm"] as const;
export const FOLLOWING_DM_STALE_MS = 60_000;

export type FollowingDmCache = { users: MessageUserHit[] };

type Stored = {
  savedAt: number;
  users: MessageUserHit[];
};

const memory: { data: FollowingDmCache | null; savedAt: number } = {
  data: null,
  savedAt: 0,
};

function isUser(value: unknown): value is MessageUserHit {
  if (!value || typeof value !== "object") return false;
  const row = value as MessageUserHit;
  return typeof row.id === "string" && typeof row.username === "string";
}

export function getFollowingDmMemory(): FollowingDmCache | null {
  return memory.data;
}

export async function loadFollowingDmBootstrap(): Promise<{
  users: MessageUserHit[];
  savedAt: number;
} | null> {
  if (memory.data) return { users: memory.data.users, savedAt: memory.savedAt };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed?.users) || !parsed.users.every(isUser)) return null;
    memory.data = { users: parsed.users };
    memory.savedAt = parsed.savedAt || 0;
    return { users: parsed.users, savedAt: memory.savedAt };
  } catch {
    return null;
  }
}

export async function saveFollowingDmBootstrap(users: MessageUserHit[]): Promise<void> {
  memory.data = { users };
  memory.savedAt = Date.now();
  try {
    const payload: Stored = { savedAt: memory.savedAt, users };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Disk full — memory still serves this session.
  }
}

export async function clearFollowingDmBootstrap(): Promise<void> {
  memory.data = null;
  memory.savedAt = 0;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function followingDmQueryOptions() {
  return {
    queryKey: FOLLOWING_DM_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchFollowingForDm();
      await saveFollowingDmBootstrap(res.users);
      return res;
    },
    staleTime: FOLLOWING_DM_STALE_MS,
    gcTime: 30 * 60_000,
  };
}

export function readFollowingDmUsers(queryClient: QueryClient): MessageUserHit[] | null {
  return (
    queryClient.getQueryData<FollowingDmCache>(FOLLOWING_DM_QUERY_KEY)?.users ??
    memory.data?.users ??
    null
  );
}

function writeFollowingDmUsers(queryClient: QueryClient, users: MessageUserHit[]) {
  queryClient.setQueryData(FOLLOWING_DM_QUERY_KEY, { users });
  void saveFollowingDmBootstrap(users);
}

/** Drop someone from the message picker cache. No-op until a list exists. */
export async function removeFollowingDmUser(queryClient: QueryClient, userId: string) {
  await queryClient.cancelQueries({ queryKey: FOLLOWING_DM_QUERY_KEY });
  const prev = readFollowingDmUsers(queryClient);
  if (!prev || !prev.some((u) => u.id === userId)) return prev;
  writeFollowingDmUsers(
    queryClient,
    prev.filter((u) => u.id !== userId)
  );
  return prev;
}

/** Insert a newly followed person at the top. No-op until a list exists. */
export async function upsertFollowingDmUser(queryClient: QueryClient, user: MessageUserHit) {
  await queryClient.cancelQueries({ queryKey: FOLLOWING_DM_QUERY_KEY });
  const prev = readFollowingDmUsers(queryClient);
  if (!prev || prev.some((u) => u.id === user.id)) return prev;
  writeFollowingDmUsers(queryClient, [user, ...prev]);
  return prev;
}

export function restoreFollowingDmUsers(queryClient: QueryClient, users: MessageUserHit[] | null) {
  if (!users) return;
  writeFollowingDmUsers(queryClient, users);
}
