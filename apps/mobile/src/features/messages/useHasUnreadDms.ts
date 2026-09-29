import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchDmInbox, waitDmInbox, type DmInboxRoom } from "@/api/messages";
import { getDmInboxMemory, saveDmInboxBootstrap } from "@/api/dm-bootstrap-cache";

export const DM_INBOX_QUERY_KEY = ["mobile-dm-inbox"] as const;

/** Same rule as the blue dot beside a nickname: unread and actually in the inbox. */
export function dmRoomIsUnread(room: { unread?: boolean; lastMessageAt: string | null }) {
  return room.unread === true && room.lastMessageAt != null;
}

let inboxLiveSubscribers = 0;
let inboxLiveAbort: AbortController | null = null;
let inboxLiveLoop: Promise<void> | null = null;
let inboxLiveClient: QueryClient | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureInboxLiveLoop() {
  if (inboxLiveLoop) return;
  let since = new Date(Date.now() - 4000).toISOString();
  inboxLiveLoop = (async () => {
    while (inboxLiveSubscribers > 0) {
      if (AppState.currentState !== "active") {
        await sleep(1000);
        continue;
      }
      inboxLiveAbort = new AbortController();
      try {
        const res = await waitDmInbox(since, inboxLiveAbort.signal);
        if (inboxLiveSubscribers <= 0) return;
        if (res.serverTime) since = res.serverTime;
        if (res.changed && res.rooms && inboxLiveClient) {
          const rooms: DmInboxRoom[] = res.rooms;
          inboxLiveClient.setQueryData(DM_INBOX_QUERY_KEY, { rooms });
          void saveDmInboxBootstrap(rooms.filter((room) => room.lastMessageAt != null));
        }
      } catch {
        if (inboxLiveSubscribers <= 0) return;
        await sleep(1500);
      }
    }
  })().finally(() => {
    inboxLiveLoop = null;
    if (inboxLiveSubscribers > 0) ensureInboxLiveLoop();
  });
}

/** One long-poll for the mailbox, shared by every screen that reads unread state. */
export function useDmInboxLive() {
  const queryClient = useQueryClient();
  const clientRef = useRef(queryClient);
  clientRef.current = queryClient;

  useEffect(() => {
    inboxLiveClient = clientRef.current;
    inboxLiveSubscribers += 1;
    ensureInboxLiveLoop();
    return () => {
      inboxLiveSubscribers -= 1;
      if (inboxLiveSubscribers <= 0) {
        inboxLiveSubscribers = 0;
        inboxLiveAbort?.abort();
      }
    };
  }, [queryClient]);
}

export function useHasUnreadDms() {
  useDmInboxLive();
  const query = useQuery({
    queryKey: DM_INBOX_QUERY_KEY,
    queryFn: fetchDmInbox,
    staleTime: 20_000,
    refetchInterval: 45_000,
    initialData: () => getDmInboxMemory() ?? undefined,
  });

  return useMemo(
    () => (query.data?.rooms ?? []).some((room) => dmRoomIsUnread(room)),
    [query.data?.rooms]
  );
}
