import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDmInbox,
  searchMessageUsers,
  type MessageUserHit,
} from "@/api/messages";
import {
  followingDmQueryOptions,
  getFollowingDmMemory,
} from "@/api/following-dm-cache";
import { getDmInboxMemory } from "@/api/dm-bootstrap-cache";

const PIN_HOSTS = new Set(["zelie", "cleo", "mio", "nangnang"]);

export type ShareRecipient = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  source: "recent" | "following" | "search" | "host";
};

function labelOf(user: Pick<ShareRecipient, "name" | "username">) {
  return (user.name?.trim() || user.username || "").trim();
}

function matchScore(user: ShareRecipient, q: string) {
  const username = user.username.toLowerCase();
  const name = (user.name ?? "").toLowerCase();
  if (username === q || name === q) return 3;
  if (username.startsWith(q) || name.startsWith(q)) return 2;
  if (username.includes(q) || name.includes(q)) return 1;
  return 0;
}

function pinHosts(list: ShareRecipient[]): ShareRecipient[] {
  const hosts: ShareRecipient[] = [];
  const rest: ShareRecipient[] = [];
  for (const row of list) {
    if (PIN_HOSTS.has(row.username.toLowerCase())) {
      hosts.push({ ...row, source: row.source === "search" ? "search" : "host" });
    } else {
      rest.push(row);
    }
  }
  hosts.sort((a, b) => a.username.localeCompare(b.username));
  return [...hosts, ...rest];
}

export function mergeShareRecipients(input: {
  rooms: {
    otherUserId: string | null;
    displayName: string;
    displayImage: string | null;
    profileUsername: string | null;
    lastMessageAt: string | null;
  }[];
  following: MessageUserHit[];
}): ShareRecipient[] {
  const seen = new Set<string>();
  const out: ShareRecipient[] = [];

  for (const room of input.rooms) {
    if (!room.otherUserId || seen.has(room.otherUserId)) continue;
    seen.add(room.otherUserId);
    out.push({
      id: room.otherUserId,
      username: room.profileUsername?.trim() || room.displayName,
      name: room.displayName,
      image: room.displayImage,
      source: "recent",
    });
  }

  for (const user of input.following) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    out.push({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      source: "following",
    });
  }

  return pinHosts(out);
}

export function filterShareRecipients(list: ShareRecipient[], rawQ: string): ShareRecipient[] {
  const q = rawQ.trim().toLowerCase().replace(/^@+/, "");
  if (!q) return list;
  return list
    .map((row) => ({ row, score: matchScore(row, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || labelOf(a.row).localeCompare(labelOf(b.row)))
    .map((x) => x.row);
}

export function useShareRecipients(enabled: boolean, query: string) {
  const inboxQuery = useQuery({
    queryKey: ["mobile-dm-inbox"],
    queryFn: fetchDmInbox,
    enabled,
    staleTime: 15_000,
    placeholderData: (previous) => previous ?? getDmInboxMemory() ?? undefined,
  });

  const followingQuery = useQuery({
    ...followingDmQueryOptions(),
    enabled,
    placeholderData: () => getFollowingDmMemory() ?? undefined,
  });

  const trimmed = query.trim().replace(/^@+/, "");
  const searchQuery = useQuery({
    queryKey: ["mobile-share-user-search", trimmed],
    queryFn: () => searchMessageUsers(trimmed),
    enabled: enabled && trimmed.length >= 1,
    staleTime: 20_000,
  });

  const merged = useMemo(() => {
    const rooms = (inboxQuery.data?.rooms ?? []).filter((r) => r.lastMessageAt != null);
    const following = followingQuery.data?.users ?? getFollowingDmMemory()?.users ?? [];
    return mergeShareRecipients({ rooms, following });
  }, [followingQuery.data?.users, inboxQuery.data?.rooms]);

  const recipients = useMemo(() => {
    if (trimmed.length >= 1) {
      const remote = (searchQuery.data?.users ?? []).map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        source: "search" as const,
      }));
      const local = filterShareRecipients(merged, trimmed);
      const seen = new Set(local.map((row) => row.id));
      return pinHosts([...local, ...remote.filter((row) => !seen.has(row.id))]);
    }
    return merged;
  }, [merged, searchQuery.data?.users, trimmed]);

  const pending =
    (inboxQuery.isPending && !inboxQuery.data && !getDmInboxMemory()) ||
    (followingQuery.isPending && !followingQuery.data && !getFollowingDmMemory());

  return {
    recipients,
    pending,
    searching: trimmed.length >= 1 && searchQuery.isFetching,
  };
}
