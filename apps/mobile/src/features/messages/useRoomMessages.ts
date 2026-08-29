import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  fetchRoomMessages,
  sendRoomMessage,
  waitRoomMessages,
  type ChatMessage,
  type DmRoomPayload,
} from "@/api/messages";
import { parseChatPostShare } from "@/lib/chat-post-share";
import { prefetchPostShareCards } from "@/features/messages/share-card-cache";

export function useRoomMessages(roomId: string) {
  const [room, setRoom] = useState<DmRoomPayload["room"] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const afterRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    const last = incoming[incoming.length - 1];
    if (last) afterRef.current = last.createdAt;

    const shareIds = incoming
      .map((m) => parseChatPostShare(m.content)?.postId)
      .filter((id): id is string => !!id);
    prefetchPostShareCards(shareIds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    setRoom(null);
    void (async () => {
      try {
        const page = await fetchRoomMessages(roomId);
        if (cancelled) return;
        setRoom(page.room);
        setMessages(page.messages);
        setNextBefore(page.nextBefore);
        afterRef.current =
          page.messages.length > 0
            ? page.messages[page.messages.length - 1]!.createdAt
            : null;
        const shareIds = page.messages
          .map((m) => parseChatPostShare(m.content)?.postId)
          .filter((id): id is string => !!id);
        prefetchPostShareCards(shareIds);
      } catch {
        if (!cancelled) setError("대화를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (loading || error) return;

    let cancelled = false;
    // Delay long-poll so share-card / image fetches aren't starved on mobile HTTP/1.1
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
    setNextBefore(page.nextBefore);
    setMessages((prev) => {
      const map = new Map(page.messages.map((m) => [m.id, m]));
      for (const m of prev) map.set(m.id, m);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
    const shareIds = page.messages
      .map((m) => parseChatPostShare(m.content)?.postId)
      .filter((id): id is string => !!id);
    prefetchPostShareCards(shareIds);
  }, [nextBefore, roomId]);

  const send = useCallback(
    async (
      content: string,
      attachments?: { url: string; type: "IMAGE" | "VIDEO" | "AUDIO" | "GIF"; name?: string }[],
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
    const page = await fetchRoomMessages(roomId);
    setRoom(page.room);
    setMessages(page.messages);
    setNextBefore(page.nextBefore);
    if (page.messages.length > 0) {
      afterRef.current = page.messages[page.messages.length - 1]!.createdAt;
    }
  }, [roomId]);

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
