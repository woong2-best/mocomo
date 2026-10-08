import { useEffect, useState } from "react";
import {
  emitJoinPresenceRoom,
  emitLeavePresenceRoom,
  getCachedOnlineUserIds,
  subscribePresence,
  subscribePresenceSnapshot,
} from "@/lib/inbox-socket";

/** Live set of chat partners currently connected to Socket.IO. */
export function useChatPresenceMap() {
  const [ids, setIds] = useState<Set<string>>(() => new Set(getCachedOnlineUserIds()));

  useEffect(() => {
    const unsubSnap = subscribePresenceSnapshot((next, mode) => {
      setIds((prev) => {
        if (mode === "replace") return new Set(next);
        let changed = false;
        const merged = new Set(prev);
        for (const id of next) {
          if (!id || merged.has(id)) continue;
          merged.add(id);
          changed = true;
        }
        return changed ? merged : prev;
      });
    });
    const unsub = subscribePresence(({ userId, online }) => {
      setIds((prev) => {
        const has = prev.has(userId);
        if (online === has) return prev;
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
    return () => {
      unsub();
      unsubSnap();
    };
  }, []);

  return ids;
}

export function usePeerOnline(userId: string | null | undefined) {
  const ids = useChatPresenceMap();
  return !!userId && ids.has(userId);
}

/** Join the chat room so this client receives room_presence + stays in the room fanout. */
export function useJoinPresenceRoom(roomId: string | null | undefined) {
  useEffect(() => {
    if (!roomId) return;
    emitJoinPresenceRoom(roomId);
    return () => emitLeavePresenceRoom(roomId);
  }, [roomId]);
}
