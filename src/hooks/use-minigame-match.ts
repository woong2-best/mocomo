"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import { resolveSocketUrl } from "@/lib/socket-url";
import { SOCKET_ACK_MS, SOCKET_WAIT_MS, wakeSocketServer } from "@/lib/socket-timing";

const MATCH_ACK_MS = SOCKET_ACK_MS;

type MatchAck = {
  ok?: boolean;
  status?: "waiting" | "matched";
  queueSize?: number;
  roomId?: string;
  autoStarted?: boolean;
  error?: string;
};

export function useMinigameMatch(
  gameId: string,
  routeBase: string,
  userId: string | undefined,
  username: string
) {
  const router = useRouter();
  const { socket, socketReady, realtimeOff } = useAppSocket();
  const [matching, setMatching] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [statusMessage, setStatusMessage] = useState("다른 유저를 찾고 있습니다…");
  const [error, setError] = useState<string | null>(null);
  const matchingRef = useRef(false);
  const socketRef = useRef(socket);
  const socketReadyRef = useRef(socketReady);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    socketReadyRef.current = socketReady;
  }, [socketReady]);

  const goToRoom = useCallback(
    (roomId: string) => {
      matchingRef.current = false;
      setMatching(false);
      router.push(`${routeBase}/${roomId}?join=1&public=1`);
    },
    [router, routeBase]
  );

  const emitMatch = useCallback(
    (targetSocket: NonNullable<typeof socket>) =>
      new Promise<MatchAck>((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, error: "매칭 서버 응답이 없습니다." });
        }, MATCH_ACK_MS);

        targetSocket.emit("minigame_match", { gameId, username }, (res: MatchAck) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(res ?? { ok: false, error: "매칭 응답이 없습니다." });
        });
      }),
    [gameId, username]
  );

  const waitForSocket = useCallback(async (): Promise<NonNullable<typeof socket> | null> => {
    const deadline = Date.now() + SOCKET_WAIT_MS;
    while (Date.now() < deadline) {
      const s = socketRef.current;
      if (s?.connected && socketReadyRef.current) return s;
      await new Promise((r) => setTimeout(r, 300));
    }
    return socketRef.current?.connected ? socketRef.current : null;
  }, []);

  useEffect(() => {
    if (!socket || !matching) return;

    const onQueue = (payload: { gameId?: string; queueSize?: number; message?: string }) => {
      if (payload.gameId !== gameId) return;
      if (payload.queueSize != null) setQueueSize(payload.queueSize);
      setStatusMessage(payload.message ?? "다른 유저를 찾고 있습니다…");
    };

    const onMatched = (payload: { gameId?: string; roomId?: string }) => {
      if (payload.gameId !== gameId || !payload.roomId || !matchingRef.current) return;
      setStatusMessage("매칭되었습니다! 게임방으로 이동합니다…");
      goToRoom(payload.roomId);
    };

    const onReconnect = () => {
      if (!matchingRef.current) return;
      void emitMatch(socket).then((res) => {
        if (!matchingRef.current) return;
        if (!res.ok) {
          setError(res.error ?? "매칭 재시도에 실패했습니다.");
          return;
        }
        if (res.status === "waiting") {
          setQueueSize(res.queueSize ?? 1);
          setStatusMessage("다른 유저를 찾고 있습니다…");
        } else if (res.status === "matched" && res.roomId) {
          goToRoom(res.roomId);
        }
      });
    };

    socket.on("minigame_match_queue", onQueue);
    socket.on("minigame_matched", onMatched);
    socket.io.on("reconnect", onReconnect);
    return () => {
      socket.off("minigame_match_queue", onQueue);
      socket.off("minigame_matched", onMatched);
      socket.io.off("reconnect", onReconnect);
    };
  }, [socket, matching, gameId, goToRoom, emitMatch]);

  const startMatch = useCallback(async () => {
    if (!userId) {
      setError("로그인이 필요합니다.");
      return;
    }
    if (realtimeOff && !socketRef.current) {
      setError("실시간 서버가 설정되지 않았습니다.");
      return;
    }

    setError(null);
    setMatching(true);
    matchingRef.current = true;
    setQueueSize(1);
    setStatusMessage("다른 유저를 찾고 있습니다…");

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    const socketUrl = resolveSocketUrl();
    if (socketUrl) await wakeSocketServer(socketUrl);

    const target = socketRef.current?.connected ? socketRef.current : await waitForSocket();
    if (!target?.connected) {
      matchingRef.current = false;
      setMatching(false);
      setError("실시간 서버에 연결할 수 없습니다.");
      return;
    }

    const res = await emitMatch(target);
    if (!matchingRef.current) return;

    if (!res.ok) {
      matchingRef.current = false;
      setMatching(false);
      setError(res.error ?? "매칭에 실패했습니다.");
      return;
    }
    if (res.status === "waiting") {
      setQueueSize(res.queueSize ?? 1);
      return;
    }
    if (res.status === "matched" && res.roomId) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("매칭 완료", { body: "게임방으로 이동합니다.", tag: "minigame-match" });
      }
      goToRoom(res.roomId);
    }
  }, [userId, realtimeOff, waitForSocket, emitMatch, goToRoom]);

  const cancelMatch = useCallback(() => {
    matchingRef.current = false;
    setMatching(false);
    setQueueSize(0);
    socketRef.current?.emit("minigame_match_cancel", { gameId });
  }, [gameId]);

  useEffect(() => {
    return () => {
      if (matchingRef.current) socketRef.current?.emit("minigame_match_cancel", { gameId });
    };
  }, [gameId]);

  return { matching, queueSize, statusMessage, error, startMatch, cancelMatch, socketReady, realtimeOff };
}
