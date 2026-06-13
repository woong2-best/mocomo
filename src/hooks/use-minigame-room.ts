"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type { MinigamePublicState, MinigameChatMessage } from "@/lib/minigames/shared-types";
import {
  peekGameCreateOptions,
  clearGameCreateOptions,
  peekGameJoinOptions,
  clearGameJoinOptions,
  type GameCreateOptions,
} from "@/lib/games-lobby";
import { resolveSocketUrl } from "@/lib/socket-url";
import { SOCKET_ACK_MS, SOCKET_WAIT_MS, wakeSocketServer } from "@/lib/socket-timing";

type AckResult =
  | { ok: true; state?: MinigamePublicState }
  | { ok: false; error: string };

const ACK_MS = SOCKET_ACK_MS;

export function useMinigameRoom(
  gameId: string,
  roomId: string,
  userId: string | undefined,
  username: string,
  mode: "create" | "join" | "spectate",
  onRoomClosed?: () => void
) {
  const { socket, socketReady, realtimeOff, connectionFailed } = useAppSocket();
  const onRoomClosedRef = useRef(onRoomClosed);
  onRoomClosedRef.current = onRoomClosed;
  const [state, setState] = useState<MinigamePublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const joinedRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<MinigameChatMessage[]>([]);
  const roomCode = roomId.toUpperCase();

  const waitForSocket = useCallback(async () => {
    const deadline = Date.now() + SOCKET_WAIT_MS;
    while (Date.now() < deadline) {
      if (socket?.connected && socketReady) return socket;
      await new Promise((r) => setTimeout(r, 200));
    }
    return socket?.connected ? socket : null;
  }, [socket, socketReady]);

  const emitAck = useCallback(
    (event: string, payload: unknown, target?: Socket | null): Promise<AckResult> =>
      new Promise((resolve) => {
        const active = target ?? socket;
        if (!active?.connected) {
          resolve({ ok: false, error: "실시간 연결이 없습니다." });
          return;
        }
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, error: "서버 응답이 없습니다. Render 소켓 서버를 확인해 주세요." });
        }, ACK_MS);
        active.emit(event, payload, (res: AckResult) => {
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
    clearGameCreateOptions(gameId);
  }, [gameId]);

  const joinRoom = useCallback(
    async (password: string | undefined, active: Socket) => {
      const result = await emitAck(
        "minigame_join",
        {
          gameId,
          roomId: roomCode,
          username,
          password: password?.trim() || undefined,
        },
        active
      );
      if (!result.ok) {
        if (result.error.includes("비밀번호")) setNeedsPassword(true);
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
    async (createOpts: GameCreateOptions, active: Socket) => {
      const created = await emitAck(
        "minigame_create",
        {
          gameId,
          roomId: roomCode,
          username,
          password: createOpts.password,
          requireFollow: createOpts.requireFollow,
          ruleMode: createOpts.ruleMode,
          timeControl: createOpts.timeControl,
          spectatorChat: createOpts.spectatorChat,
          accessMode: "private",
        },
        active
      );
      if (created.ok && created.state) {
        applyJoinSuccess(created.state);
        return true;
      }
      if (!created.ok && created.error?.includes("이미 사용")) {
        return joinRoom(createOpts.password, active);
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
      setNeedsPassword(false);

      const socketUrl = resolveSocketUrl();
      if (!socketUrl) {
        setConnecting(false);
        setError("실시간 서버 URL이 설정되지 않았습니다.");
        return;
      }

      await wakeSocketServer(socketUrl);
      const active = await waitForSocket();
      if (!active) {
        setConnecting(false);
        setError(
          "실시간 서버에 연결할 수 없습니다. Render(mocomo-socket)가 sleep 상태일 수 있습니다. 「다시 연결」을 누르거나 1분 정도 기다려 주세요."
        );
        return;
      }

      if (mode === "spectate") {
        const result = await emitAck(
          "minigame_spectate",
          { gameId, roomId: roomCode, username },
          active
        );
        if (!result.ok) {
          setError(result.error);
          setConnecting(false);
          return;
        }
        if (result.state) applyJoinSuccess(result.state);
        return;
      }

      if (mode === "create") {
        const createOpts = peekGameCreateOptions(gameId) ?? {};
        if (!createOpts.password && !password) {
          setError("방 만들기 정보가 없습니다. 로비에서 다시 방 만들기를 눌러 주세요.");
          setConnecting(false);
          return;
        }
        await createRoom(
          { ...createOpts, password: password ?? createOpts.password },
          active
        );
        return;
      }

      const stored = peekGameJoinOptions(gameId);
      await joinRoom(password ?? stored?.password, active);
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

    const onClosed = (payload: { gameId?: string; roomId?: string }) => {
      if (payload.gameId !== gameId || payload.roomId !== roomCode) return;
      joinedRef.current = false;
      setJoined(false);
      setState(null);
      onRoomClosedRef.current?.();
    };

    socket.on("minigame_state", onState);
    socket.on("minigame_chat", onChat);
    socket.on("minigame_closed", onClosed);
    return () => {
      socket.off("minigame_state", onState);
      socket.off("minigame_chat", onChat);
      socket.off("minigame_closed", onClosed);
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
      void (async () => {
        const active = await waitForSocket();
        if (!active) {
          setConnecting(false);
          setError("실시간 서버에 연결할 수 없습니다.");
          return;
        }
        if (mode === "create") await createRoom({ password }, active);
        else await joinRoom(password, active);
      })();
    },
    [waitForSocket, mode, createRoom, joinRoom]
  );

  const retryConnection = useCallback(() => {
    setError(null);
    setConnecting(true);
    const url = resolveSocketUrl();
    if (url) void wakeSocketServer(url);
    setAttempt((n) => n + 1);
  }, []);

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

  const leaveRoom = useCallback(() => {
    joinedRef.current = false;
    setJoined(false);
    if (socket?.connected) {
      socket.emit("minigame_leave", { gameId, roomId: roomCode });
    }
  }, [socket, gameId, roomCode]);

  const closeRoom = useCallback(async () => {
    const result = await emitAck("minigame_close", { gameId, roomId: roomCode });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    joinedRef.current = false;
    setJoined(false);
    setState(null);
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
    realtimeOff: realtimeOff || connectionFailed,
    setReady,
    startGame,
    sendMove,
    sendChat,
    requestRematch,
    chatMessages,
    setError,
    retryJoinWithPassword,
    retryConnection,
    leaveRoom,
    closeRoom,
  };
}
