"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type {
  SketchQuizPublicState,
  SketchQuizWordPayload,
  SketchStroke,
  SketchQuizGuess,
} from "@/lib/sketch-quiz-types";
import {
  peekGameCreateOptions,
  peekGameJoinOptions,
  clearGameJoinOptions,
} from "@/lib/games-lobby";
import { resolveSocketUrl } from "@/lib/socket-url";
import { SOCKET_ACK_MS, SOCKET_WAIT_MS, wakeSocketServer } from "@/lib/socket-timing";

const GAME_ID = "sketch-quiz";
const ACK_MS = SOCKET_ACK_MS;

type AckResult =
  | { ok: true; state?: SketchQuizPublicState }
  | { ok: false; error: string };

export function useSketchQuizRoom(
  roomId: string,
  userId: string | undefined,
  username: string,
  mode: "create" | "join"
) {
  const { socket, socketReady, realtimeOff, connectionFailed } = useAppSocket();
  const [state, setState] = useState<SketchQuizPublicState | null>(null);
  const [secretWord, setSecretWord] = useState<SketchQuizWordPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const strokesRef = useRef<SketchStroke[]>([]);
  const joinedRef = useRef(false);
  const [attempt, setAttempt] = useState(0);

  const roomCode = roomId.toUpperCase();

  useEffect(() => {
    strokesRef.current = state?.strokes ?? [];
  }, [state?.strokes]);

  useEffect(() => {
    if (state?.timeLeft != null) setTimeLeft(state.timeLeft);
  }, [state?.timeLeft]);

  const emitAck = useCallback(
    (event: string, payload: unknown): Promise<AckResult> =>
      new Promise((resolve) => {
        if (!socket?.connected) {
          resolve({ ok: false, error: "실시간 연결이 없습니다." });
          return;
        }
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, error: "서버 응답이 없습니다." });
        }, ACK_MS);
        socket.emit(event, payload, (res: AckResult) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve(res ?? { ok: false, error: "응답 없음" });
        });
      }),
    [socket]
  );

  const waitForSocket = useCallback(async () => {
    const deadline = Date.now() + SOCKET_WAIT_MS;
    while (Date.now() < deadline) {
      if (socket?.connected && socketReady) return socket;
      await new Promise((r) => setTimeout(r, 250));
    }
    return socket?.connected ? socket : null;
  }, [socket, socketReady]);

  const applyJoined = useCallback((next: SketchQuizPublicState) => {
    setState(next);
    joinedRef.current = true;
    setJoined(true);
    setConnecting(false);
    setNeedsPassword(false);
    clearGameJoinOptions(GAME_ID);
  }, []);

  const joinRoom = useCallback(
    async (password?: string) => {
      const result = await emitAck("sketch_quiz_join", {
        roomId: roomCode,
        username,
        password: password?.trim() || undefined,
      });
      if (!result.ok) {
        if (result.error.includes("비밀번호")) setNeedsPassword(true);
        setError(result.error);
        setConnecting(false);
        return false;
      }
      if (result.state) applyJoined(result.state);
      return true;
    },
    [emitAck, roomCode, username, applyJoined]
  );

  const enterRoom = useCallback(
    async (password?: string) => {
      const socketUrl = resolveSocketUrl();
      if (!socketUrl) {
        setConnecting(false);
        setError("실시간 서버 URL이 설정되지 않았습니다.");
        return;
      }

      const authError = await (await import("@/lib/socket-client")).diagnoseSocketAuth();
      if (authError) {
        setConnecting(false);
        setError(authError);
        return;
      }

      await wakeSocketServer(socketUrl);
      const active = await waitForSocket();
      if (!active) {
        setConnecting(false);
        setError(
          connectionFailed
            ? "실시간 서버 인증 실패. Vercel·Render AUTH_SECRET이 같은지 확인 후 양쪽 재배포해 주세요."
            : "실시간 서버에 연결할 수 없습니다. 「다시 연결」을 누르거나 1분 정도 기다려 주세요."
        );
        return;
      }

      if (mode === "create") {
        const createOpts = peekGameCreateOptions(GAME_ID) ?? {};
        const created = await emitAck("sketch_quiz_create", {
          roomId: roomCode,
          username,
          password: createOpts.password ?? password,
          requireFollow: createOpts.requireFollow,
          accessMode: "private",
        });
        if (created.ok && created.state) {
          applyJoined(created.state);
          return;
        }
        if (!created.ok && created.error?.includes("이미 사용")) {
          await joinRoom(createOpts.password ?? password);
          return;
        }
        setError(!created.ok ? created.error : "방을 만들 수 없습니다.");
        setConnecting(false);
        return;
      }

      const stored = peekGameJoinOptions(GAME_ID);
      await joinRoom(password ?? stored?.password);
    },
    [waitForSocket, mode, emitAck, roomCode, username, applyJoined, joinRoom, connectionFailed]
  );

  useEffect(() => {
    if (!userId || joinedRef.current) return;
    if (!resolveSocketUrl()) {
      setConnecting(false);
      setError("실시간 서버 URL이 설정되지 않았습니다.");
      return;
    }
    void enterRoom();
  }, [userId, attempt, enterRoom]);

  useEffect(() => {
    if (!socket || !joined) return;

    const onState = (next: SketchQuizPublicState) => {
      setState(next);
      strokesRef.current = next.strokes;
    };
    const onWord = (payload: SketchQuizWordPayload) => setSecretWord(payload);
    const onStroke = (stroke: SketchStroke) => {
      strokesRef.current = [...strokesRef.current, stroke];
      setState((prev) =>
        prev ? { ...prev, strokes: [...prev.strokes, stroke] } : prev
      );
    };
    const onClear = () => {
      strokesRef.current = [];
      setState((prev) => (prev ? { ...prev, strokes: [] } : prev));
    };
    const onGuess = (guess: SketchQuizGuess) => {
      setState((prev) =>
        prev
          ? { ...prev, recentGuesses: [...prev.recentGuesses, guess].slice(-30) }
          : prev
      );
    };
    const onTick = (data: { timeLeft: number }) => setTimeLeft(data.timeLeft);

    socket.on("sketch_quiz_state", onState);
    socket.on("sketch_quiz_word", onWord);
    socket.on("sketch_quiz_stroke", onStroke);
    socket.on("sketch_quiz_clear", onClear);
    socket.on("sketch_quiz_guess", onGuess);
    socket.on("sketch_quiz_tick", onTick);

    return () => {
      socket.off("sketch_quiz_state", onState);
      socket.off("sketch_quiz_word", onWord);
      socket.off("sketch_quiz_stroke", onStroke);
      socket.off("sketch_quiz_clear", onClear);
      socket.off("sketch_quiz_guess", onGuess);
      socket.off("sketch_quiz_tick", onTick);
      socket.emit("sketch_quiz_leave", roomCode);
      joinedRef.current = false;
    };
  }, [socket, joined, roomCode]);

  useEffect(() => {
    if (state?.status === "playing" && state.drawerId !== userId) {
      setSecretWord(null);
    }
  }, [state?.status, state?.drawerId, userId]);

  const startGame = useCallback(async () => {
    if (!socket) return { ok: false as const, error: "연결 없음" };
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.emit("sketch_quiz_start", roomCode, (res: { ok: boolean; error?: string }) => {
        resolve(res ?? { ok: false, error: "시작 실패" });
      });
    });
  }, [socket, roomCode]);

  const sendStroke = useCallback(
    (stroke: SketchStroke) => {
      socket?.emit("sketch_quiz_stroke", { roomId: roomCode, stroke });
    },
    [socket, roomCode]
  );

  const clearCanvas = useCallback(() => {
    socket?.emit("sketch_quiz_clear", roomCode);
  }, [socket, roomCode]);

  const sendGuess = useCallback(
    (text: string) => {
      socket?.emit("sketch_quiz_guess", { roomId: roomCode, text, username });
    },
    [socket, roomCode, username]
  );

  const isHost = state?.hostId === userId;
  const isDrawer = state?.drawerId === userId;

  return {
    state,
    secretWord,
    error,
    joined,
    connecting,
    needsPassword,
    timeLeft,
    isHost,
    isDrawer,
    startGame,
    sendStroke,
    clearCanvas,
    sendGuess,
    socketReady,
    realtimeOff: realtimeOff || connectionFailed,
    retryJoinWithPassword: (password: string) => {
      setConnecting(true);
      setError(null);
      void joinRoom(password);
    },
    retryConnection: () => {
      setError(null);
      setConnecting(true);
      const url = resolveSocketUrl();
      if (url) void wakeSocketServer(url);
      setAttempt((n) => n + 1);
    },
  };
}
