"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type { SketchQuizPublicState } from "@/lib/sketch-quiz-types";

export function useSketchQuizMatch(userId: string | undefined, username: string) {
  const router = useRouter();
  const { socket, socketReady } = useAppSocket();
  const [matching, setMatching] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [statusMessage, setStatusMessage] = useState("다른 유저를 찾고 있습니다…");
  const [error, setError] = useState<string | null>(null);
  const matchingRef = useRef(false);

  const goToRoom = useCallback(
    (roomId: string) => {
      matchingRef.current = false;
      setMatching(false);
      router.push(`/sketch-quiz/${roomId}?join=1&public=1`);
    },
    [router]
  );

  useEffect(() => {
    if (!socket || !matching) return;

    const onQueue = (payload: { queueSize?: number; message?: string }) => {
      if (payload.queueSize != null) setQueueSize(payload.queueSize);
      if (payload.message) setStatusMessage(payload.message);
    };

    const onMatched = (payload: { roomId: string; state?: SketchQuizPublicState }) => {
      if (!payload.roomId) return;
      setStatusMessage("매칭되었습니다! 게임방으로 이동합니다…");
      goToRoom(payload.roomId);
    };

    socket.on("sketch_quiz_match_queue", onQueue);
    socket.on("sketch_quiz_matched", onMatched);
    return () => {
      socket.off("sketch_quiz_match_queue", onQueue);
      socket.off("sketch_quiz_matched", onMatched);
    };
  }, [socket, matching, goToRoom]);

  const startMatch = useCallback(() => {
    if (!socket || !socketReady || !userId) {
      setError("로그인 및 실시간 연결이 필요합니다.");
      return;
    }
    setError(null);
    setMatching(true);
    matchingRef.current = true;
    setQueueSize(1);
    setStatusMessage("다른 유저를 찾고 있습니다…");

    socket.emit(
      "sketch_quiz_match",
      { username },
      (res: {
        ok?: boolean;
        status?: "waiting" | "matched";
        queueSize?: number;
        roomId?: string;
        autoStarted?: boolean;
        error?: string;
      }) => {
        if (!res?.ok) {
          matchingRef.current = false;
          setMatching(false);
          setError(res?.error ?? "매칭에 실패했습니다.");
          return;
        }
        if (res.status === "waiting") {
          setQueueSize(res.queueSize ?? 1);
          setStatusMessage("다른 유저를 찾고 있습니다…");
          return;
        }
        if (res.status === "matched" && res.roomId) {
          setStatusMessage(
            res.autoStarted ? "매칭 완료! 게임을 시작합니다…" : "매칭 완료! 게임방으로 이동합니다…"
          );
          goToRoom(res.roomId);
        }
      }
    );
  }, [socket, socketReady, userId, username, goToRoom]);

  const cancelMatch = useCallback(() => {
    matchingRef.current = false;
    setMatching(false);
    setQueueSize(0);
    setStatusMessage("다른 유저를 찾고 있습니다…");
    socket?.emit("sketch_quiz_match_cancel");
  }, [socket]);

  useEffect(() => {
    return () => {
      if (matchingRef.current) socket?.emit("sketch_quiz_match_cancel");
    };
  }, [socket]);

  return { matching, queueSize, statusMessage, error, startMatch, cancelMatch, socketReady };
}
