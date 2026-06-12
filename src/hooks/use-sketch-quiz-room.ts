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
  readGameCreateOptions,
  readGameJoinOptions,
  type GameCreateOptions,
  type GameJoinOptions,
} from "@/lib/games-lobby";

const GAME_ID = "sketch-quiz";

type AckResult =
  | { ok: true; state?: SketchQuizPublicState }
  | { ok: false; error: string };

export function useSketchQuizRoom(
  roomId: string,
  userId: string | undefined,
  username: string,
  mode: "create" | "join"
) {
  const { socket, socketReady } = useAppSocket();
  const [state, setState] = useState<SketchQuizPublicState | null>(null);
  const [secretWord, setSecretWord] = useState<SketchQuizWordPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const strokesRef = useRef<SketchStroke[]>([]);
  const joinedRef = useRef(false);

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
        if (!socket) {
          resolve({ ok: false, error: "실시간 연결이 없습니다." });
          return;
        }
        socket.emit(event, payload, (res: AckResult) => {
          resolve(res ?? { ok: false, error: "응답 없음" });
        });
      }),
    [socket]
  );

  useEffect(() => {
    if (!socket || !socketReady || !userId || joinedRef.current) return;

    let cancelled = false;

    void (async () => {
      const createOpts: GameCreateOptions = readGameCreateOptions(GAME_ID) ?? {};
      const joinOpts: GameJoinOptions = readGameJoinOptions(GAME_ID) ?? {};

      if (mode === "join") {
        const result = await emitAck("sketch_quiz_join", {
          roomId: roomCode,
          username,
          password: joinOpts.password,
        });
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.state) setState(result.state);
        joinedRef.current = true;
        setJoined(true);
        return;
      }

      const joinedExisting = await emitAck("sketch_quiz_join", {
        roomId: roomCode,
        username,
        password: joinOpts.password,
      });
      if (cancelled) return;
      if (joinedExisting.ok) {
        if (joinedExisting.state) setState(joinedExisting.state);
        joinedRef.current = true;
        setJoined(true);
        return;
      }

      const created = await emitAck("sketch_quiz_create", {
        roomId: roomCode,
        username,
        password: createOpts.password,
        requireFollow: createOpts.requireFollow,
        accessMode: "private",
      });
      if (cancelled) return;
      if (!created.ok) {
        setError(created.error);
        return;
      }
      if (created.state) setState(created.state);
      joinedRef.current = true;
      setJoined(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [socket, socketReady, userId, roomCode, username, mode, emitAck]);

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
    timeLeft,
    isHost,
    isDrawer,
    startGame,
    sendStroke,
    clearCanvas,
    sendGuess,
    socketReady,
  };
}
