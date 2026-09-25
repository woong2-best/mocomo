import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDmInbox } from "@/api/messages";
import { getDmInboxMemory } from "@/api/dm-bootstrap-cache";

export const DM_INBOX_QUERY_KEY = ["mobile-dm-inbox"] as const;

/** Same rule as the blue dot beside a nickname: unread and actually in the inbox. */
export function dmRoomIsUnread(room: { unread?: boolean; lastMessageAt: string | null }) {
  return room.unread === true && room.lastMessageAt != null;
}

export function useHasUnreadDms() {
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
