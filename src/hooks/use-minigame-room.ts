"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type { MinigamePublicState, MinigameChatMessage } from "@/lib/minigames/shared-types";
import {
  peekGameCreateOptions,
  readGameCreateOptions,
  peekGameJoinOptions,
  clearGameJoinOptions,
  type GameCreateOptions,
} from "@/lib/games-lobby";

type AckResult =
  | { ok: true; state?: MinigamePublicState }
  | { ok: false; error: string };

const SOCKET_WAIT_MS = 12_000;
const ACK_MS = 10_000;

export function useMinigameRoom(
  gameId: string,
  roomId: string,
  userId: string | undefined,
  username: string,
  mode: "create" | "join" | "spectate"
) {
  const { socket, socketReady, realtimeOff } = useAppSocket();
  const [state, setState] = useState<MinigamePublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const joinedRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<MinigameChatMessage[]>([]);
  const roomCode = roomId.toUpperCase();

  const waitForSocket = useCallback(async () => {
    const deadline = Date.now() + SOCKET_WAIT_MS;
    while (Date.now() < deadline) {
      if (socket?.connected && socketReady) return socket;
      await new Promise((r) => setTimeout(r, 250));
    }
    return socket?.connected ? socket : null;
  }, [socket, socketReady]);

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

  const applyJoinSuccess = useCallback((next: MinigamePublicState) => {
    setState(next);
    if (next.recentChat) setChatMessages(next.recentChat);
    joinedRef.current = true;
    setJoined(true);
    setNeedsPassword(false);
    setError(null);
    setConnecting(false);
    clearGameJoinOptions(gameId);
  }, [gameId]);

  const joinRoom = useCallback(
    async (password?: string) => {
      const result = await emitAck("minigame_join", {
        gameId,
        roomId: roomCode,
        username,
        password: password?.trim() || undefined,
      });
      if (!result.ok) {
        if (
          result.error.includes("비밀번호")
        ) {
          setNeedsPassword(true);
        }
        setError(result.error);
        setConnecting(false);
        return false;
      }
      if (result.state) applyJoinSuccess(result.state);
      return true;
    },
    [emitAck, gameId, roomCode, username, applyJoinSuccess]
  );

  const createRoom = useCallback(
    async (createOpts: GameCreateOptions) => {
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
      if (created.ok && created.state) {
        applyJoinSuccess(created.state);
        return true;
      }
      if (!created.ok && created.error?.includes("이미 사용")) {
        return joinRoom(createOpts.password);
      }
      setError(!created.ok ? created.error : "방을 만들 수 없습니다.");
      setConnecting(false);
      return false;
    },
    [emitAck, gameId, roomCode, username, applyJoinSuccess, joinRoom]
  );

  const enterRoom = useCallback(
    async (password?: string) => {
      if (!userId || joinedRef.current) return;
      setConnecting(true);
      setError(null);

      const activeSocket = await waitForSocket();
      if (!activeSocket) {
        setConnecting(false);
        setError("실시간 서버에 연결할 수 없습니다.");
        return;
      }

      if (mode === "spectate") {
        const result = await emitAck("minigame_spectate", { gameId, roomId: roomCode, username });
        if (!result.ok) {
          setError(result.error);
          setConnecting(false);
          return;
        }
        if (result.state) applyJoinSuccess(result.state);
        return;
      }

      if (mode === "create") {
        const createOpts = readGameCreateOptions(gameId) ?? peekGameCreateOptions(gameId) ?? {};
        const pwd = createOpts.password ?? password;
        if (pwd) await createRoom({ ...createOpts, password: pwd });
        else await createRoom(createOpts);
        return;
      }

      const stored = peekGameJoinOptions(gameId);
      const pwd = password ?? stored?.password;
      await joinRoom(pwd);
      return;
    },
    [
      userId,
      waitForSocket,
      mode,
      emitAck,
      gameId,
      roomCode,
      username,
      applyJoinSuccess,
      createRoom,
      joinRoom,
    ]
  );

  const startedRef = useRef(false);

  useEffect(() => {
    if (!userId || joinedRef.current || startedRef.current) {
      if (realtimeOff) setConnecting(false);
      return;
    }
    if (realtimeOff) {
      setConnecting(false);
      return;
    }
    if (!socketReady || !socket?.connected) return;
    startedRef.current = true;
    void enterRoom();
  }, [userId, socketReady, socket, realtimeOff, enterRoom]);

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

  const retryJoinWithPassword = useCallback(
    (password: string) => {
      setError(null);
      setConnecting(true);
      void joinRoom(password);
    },
    [joinRoom]
  );

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
    (text: string) => {
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
    connecting,
    needsPassword,
    isHost,
    realtimeOff,
    setReady,
    startGame,
    sendMove,
    sendChat,
    requestRematch,
    chatMessages,
    setError,
    retryJoinWithPassword,
  };
}
