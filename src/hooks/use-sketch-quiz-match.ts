"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSocket } from "@/components/providers/app-socket-provider";

export function useSketchQuizMatch(userId: string | undefined, username: string) {
  const router = useRouter();
  const { socket, socketReady } = useAppSocket();
  const [matching, setMatching] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const matchingRef = useRef(false);

  useEffect(() => {
    if (!socket || !matchingRef.current) return;

    const onMatched = (payload: { roomId: string }) => {
      matchingRef.current = false;
      setMatching(false);
      router.push(`/sketch-quiz/${payload.roomId}?join=1&public=1`);
    };

    socket.on("sketch_quiz_matched", onMatched);
    return () => {
      socket.off("sketch_quiz_matched", onMatched);
    };
  }, [socket, router]);

  const startMatch = useCallback(() => {
    if (!socket || !socketReady || !userId) {
      setError("로그인 및 실시간 연결이 필요합니다.");
      return;
    }
    setError(null);
    setMatching(true);
    matchingRef.current = true;

    socket.emit(
      "sketch_quiz_match",
      { username },
      (res: {
        ok?: boolean;
        status?: "waiting" | "matched";
        queueSize?: number;
        roomId?: string;
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
          return;
        }
        if (res.status === "matched" && res.roomId) {
          matchingRef.current = false;
          setMatching(false);
          router.push(`/sketch-quiz/${res.roomId}?join=1&public=1`);
        }
      }
    );
  }, [socket, socketReady, userId, username, router]);

  const cancelMatch = useCallback(() => {
    matchingRef.current = false;
    setMatching(false);
    setQueueSize(0);
    socket?.emit("sketch_quiz_match_cancel");
  }, [socket]);

  useEffect(() => {
    return () => {
      if (matchingRef.current) socket?.emit("sketch_quiz_match_cancel");
    };
  }, [socket]);

  return { matching, queueSize, error, startMatch, cancelMatch, socketReady };
}
