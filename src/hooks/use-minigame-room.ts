"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type { MinigamePublicState, MinigameChatMessage } from "@/lib/minigames/shared-types";
import {
  readGameCreateOptions,
  readGameJoinOptions,
  type GameCreateOptions,
  type GameJoinOptions,
} from "@/lib/games-lobby";

type AckResult =
  | { ok: true; state?: MinigamePublicState }
  | { ok: false; error: string };

export function useMinigameRoom(
  gameId: string,
  roomId: string,
  userId: string | undefined,
  username: string,
  mode: "create" | "join" | "spectate"
) {
  const { socket, socketReady } = useAppSocket();
  const [state, setState] = useState<MinigamePublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const joinedRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<MinigameChatMessage[]>([]);
  const roomCode = roomId.toUpperCase();

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
      if (mode === "spectate") {
        const result = await emitAck("minigame_spectate", { gameId, roomId: roomCode, username });
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

      const createOpts: GameCreateOptions = readGameCreateOptions(gameId) ?? {};
      const joinOpts: GameJoinOptions = readGameJoinOptions(gameId) ?? {};

      if (mode === "join") {
        const result = await emitAck("minigame_join", {
          gameId,
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

      const joinedExisting = await emitAck("minigame_join", {
        gameId,
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

      const created = await emitAck("minigame_create", {
        gameId,
        roomId: roomCode,
        username,
        password: createOpts.password,
        requireFollow: createOpts.requireFollow,
        ruleMode: createOpts.ruleMode,
        timeControl: createOpts.timeControl,
        spectatorChat: createOpts.spectatorChat,
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
  }, [socket, socketReady, userId, gameId, roomCode, username, mode, emitAck]);

  useEffect(() => {
    if (!socket || !joined) return;

    const onState = (payload: { gameId?: string; state?: MinigamePublicState }) => {
      if (payload.gameId !== gameId || !payload.state) return;
      if (payload.state.roomId !== roomCode) return;
      setState(payload.state);
      if (payload.state.recentChat) setChatMessages(payload.state.recentChat);
    };

    const onChat = (payload: { gameId?: string; roomId?: string; message?: MinigameChatMessage }) => {
      if (payload.gameId !== gameId || payload.roomId !== roomCode || !payload.message) return;
      setChatMessages((prev) => [...prev.slice(-29), payload.message!]);
    };

    socket.on("minigame_state", onState);
    socket.on("minigame_chat", onChat);
    return () => {
      socket.off("minigame_state", onState);
      socket.off("minigame_chat", onChat);
    };
  }, [socket, joined, gameId, roomCode]);

  useEffect(() => {
    return () => {
      if (joinedRef.current && socket) {
        socket.emit("minigame_leave", { gameId, roomId: roomCode });
      }
    };
  }, [socket, gameId, roomCode]);

  const setReady = useCallback(
    async (ready: boolean) => {
      const result = await emitAck("minigame_ready", { gameId, roomId: roomCode, ready });
      if (!result.ok) setError(result.error);
    },
    [emitAck, gameId, roomCode]
  );

  const startGame = useCallback(async () => {
    const result = await emitAck("minigame_start", { gameId, roomId: roomCode });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    if (result.state) setState(result.state);
    return true;
  }, [emitAck, gameId, roomCode]);

  const sendMove = useCallback(
    async (move: unknown) => {
      const result = await emitAck("minigame_move", { gameId, roomId: roomCode, move });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      if (result.state) setState(result.state);
      return true;
    },
    [emitAck, gameId, roomCode]
  );

  const sendChat = useCallback(
    async (text: string) => {
      if (!socket) return;
      socket.emit("minigame_chat", { gameId, roomId: roomCode, text, username });
    },
    [socket, gameId, roomCode, username]
  );

  const requestRematch = useCallback(async () => {
    const result = await emitAck("minigame_rematch", { gameId, roomId: roomCode });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    if (result.state) setState(result.state);
    return true;
  }, [emitAck, gameId, roomCode]);

  const isHost = state?.hostId === userId;

  return {
    state,
    error,
    joined,
    isHost,
    setReady,
    startGame,
    sendMove,
    sendChat,
    requestRematch,
    chatMessages,
    setError,
  };
}
