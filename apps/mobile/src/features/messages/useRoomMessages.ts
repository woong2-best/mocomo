import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRoomMessages,
  sendRoomMessage,
  waitRoomMessages,
  type ChatMessage,
  type DmInboxRoom,
  type DmRoomPayload,
} from "@/api/messages";
import {
  dmRoomQueryKey,
  getDmRoomMemory,
  loadDmRoomBootstrap,
  markDmInboxRoomRead,
  saveDmRoomBootstrap,
} from "@/api/dm-bootstrap-cache";
import { parseChatPostShare } from "@/lib/chat-post-share";
import { prefetchPostShareCards } from "@/features/messages/share-card-cache";

function applySharePrefetch(messages: ChatMessage[]) {
  const shareIds = messages
    .map((m) => parseChatPostShare(m.content)?.postId)
    .filter((id): id is string => !!id);
  prefetchPostShareCards(shareIds);
}

export function useRoomMessages(roomId: string) {
  const queryClient = useQueryClient();
  const mem = getDmRoomMemory(roomId);
  const [diskSeed, setDiskSeed] = useState<DmRoomPayload | null>(mem);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[] | null>(null);
  const [sending, setSending] = useState(false);
  const afterRef = useRef<string | null>(
    mem?.messages.length ? mem.messages[mem.messages.length - 1]!.createdAt : null
  );
  const abortRef = useRef<AbortController | null>(null);

  // Async disk hydrate if memory miss (cold start into a deep-linked room).
  useEffect(() => {
    setLiveMessages(null);
    const warm = getDmRoomMemory(roomId);
    if (warm) {
      setDiskSeed(warm);
      afterRef.current =
        warm.messages.length > 0
          ? warm.messages[warm.messages.length - 1]!.createdAt
          : null;
      return;
    }
    setDiskSeed(null);
    let cancelled = false;
    void loadDmRoomBootstrap(roomId).then((cached) => {
      if (cancelled || !cached) return;
      setDiskSeed(cached);
      afterRef.current =
        cached.messages.length > 0
          ? cached.messages[cached.messages.length - 1]!.createdAt
          : null;
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const query = useQuery({
    queryKey: dmRoomQueryKey(roomId),
    queryFn: async () => {
      const page = await fetchRoomMessages(roomId);
      await saveDmRoomBootstrap(roomId, page);
      return page;
    },
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    initialData: () => {
      const warm = getDmRoomMemory(roomId);
      if (warm) return warm;
      return queryClient.getQueryData<DmRoomPayload>(dmRoomQueryKey(roomId));
    },
    initialDataUpdatedAt: () => {
      const warm = getDmRoomMemory(roomId);
      if (warm) return Date.now() - 1;
      const existing = queryClient.getQueryState(dmRoomQueryKey(roomId));
      return existing?.dataUpdatedAt;
    },
    placeholderData: diskSeed ?? undefined,
  });

  useEffect(() => {
    if (!query.data) return;
    const last = query.data.messages[query.data.messages.length - 1];
    if (last) {
      const t = new Date(last.createdAt).getTime();
      const cur = afterRef.current ? new Date(afterRef.current).getTime() : 0;
      if (t >= cur) afterRef.current = last.createdAt;
    }
    applySharePrefetch(query.data.messages);
    queryClient.setQueryData<{ rooms: DmInboxRoom[] }>(["mobile-dm-inbox"], (prev) => {
      if (!prev) return prev;
      const target = prev.rooms.find((room) => room.id === roomId);
      if (!target?.unread) return prev;
      return {
        rooms: prev.rooms.map((room) =>
          room.id === roomId ? { ...room, unread: false } : room
        ),
      };
    });
    markDmInboxRoomRead(roomId);
  }, [query.data, queryClient, roomId]);

  const room = query.data?.room ?? diskSeed?.room ?? null;
  const baseMessages = query.data?.messages ?? diskSeed?.messages ?? [];
  const messages = useMemo(() => {
    if (!liveMessages || liveMessages.length === 0) return baseMessages;
    const map = new Map(baseMessages.map((m) => [m.id, m]));
    for (const m of liveMessages) map.set(m.id, m);
    return [...map.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [baseMessages, liveMessages]);
  const nextBefore = query.data?.nextBefore ?? diskSeed?.nextBefore ?? null;
  const loading = !query.data && !diskSeed && query.isLoading;
  const error =
    query.isError && !query.data && !diskSeed ? "대화를 불러오지 못했습니다." : null;

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setLiveMessages((prev) => {
      const base = prev ?? queryClient.getQueryData<DmRoomPayload>(dmRoomQueryKey(roomId))?.messages ?? [];
      const map = new Map(base.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    const last = incoming[incoming.length - 1];
    if (last) afterRef.current = last.createdAt;
    applySharePrefetch(incoming);
  }, [queryClient, roomId]);

  // Persist on leave (incl. long-poll arrivals).
  const roomRef = useRef(room);
  const messagesRef = useRef(messages);
  const nextBeforeRef = useRef(nextBefore);
  roomRef.current = room;
  messagesRef.current = messages;
  nextBeforeRef.current = nextBefore;

  useEffect(() => {
    return () => {
      const r = roomRef.current;
      const msgs = messagesRef.current;
      if (!r || msgs.length === 0) return;
      void saveDmRoomBootstrap(roomId, {
        room: r,
        messages: msgs,
        nextBefore: nextBeforeRef.current,
      });
    };
  }, [roomId]);

  useEffect(() => {
    if (loading || error) return;

    let cancelled = false;
    const startTimer = setTimeout(() => {
      async function loop() {
        while (!cancelled) {
          abortRef.current?.abort();
          const ac = new AbortController();
          abortRef.current = ac;
          try {
            const res = await waitRoomMessages(roomId, afterRef.current, ac.signal);
            if (cancelled) break;
            mergeMessages(res.messages);
          } catch {
            if (cancelled) break;
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
      void loop();
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      abortRef.current?.abort();
    };
  }, [roomId, loading, error, mergeMessages]);

  const loadOlder = useCallback(async () => {
    if (!nextBefore) return;
    const page = await fetchRoomMessages(roomId, nextBefore);
    setLiveMessages((prev) => {
      const base = prev ?? queryClient.getQueryData<DmRoomPayload>(dmRoomQueryKey(roomId))?.messages ?? [];
      const map = new Map(page.messages.map((m) => [m.id, m]));
      for (const m of base) map.set(m.id, m);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    queryClient.setQueryData<DmRoomPayload>(dmRoomQueryKey(roomId), (old) =>
      old
        ? { ...old, nextBefore: page.nextBefore }
        : {
            room: page.room,
            messages: page.messages,
            nextBefore: page.nextBefore,
          }
    );
    applySharePrefetch(page.messages);
  }, [nextBefore, queryClient, roomId]);

  const send = useCallback(
    async (
      content: string,
      attachments?: {
        url: string;
        type: "IMAGE" | "VIDEO" | "AUDIO" | "GIF";
        name?: string;
        priceKrw?: number;
      }[],
      replyToId?: string
    ) => {
      const text = content.trim();
      const hasAttachments = (attachments?.length ?? 0) > 0;
      if ((!text && !hasAttachments) || sending) return;
      setSending(true);
      try {
        const res = await sendRoomMessage(roomId, {
          ...(text ? { content: text } : {}),
          ...(hasAttachments ? { attachments } : {}),
          ...(replyToId ? { replyToId } : {}),
        });
        mergeMessages([res.message]);
        if (res.contentFiltered) {
          Alert.alert(
            "안내",
            "외부 결제·연락처 유도는 이용약관상 금지됩니다. 해당 내용이 자동으로 가려졌습니다."
          );
        }
      } finally {
        setSending(false);
      }
    },
    [mergeMessages, roomId, sending]
  );

  const refresh = useCallback(async () => {
    const page = await query.refetch();
    if (page.data) {
      setLiveMessages(null);
      afterRef.current =
        page.data.messages.length > 0
          ? page.data.messages[page.data.messages.length - 1]!.createdAt
          : null;
    }
  }, [query]);

  return {
    room,
    messages,
    loading,
    error,
    sending,
    nextBefore,
    loadOlder,
    send,
    refresh,
  };
}
