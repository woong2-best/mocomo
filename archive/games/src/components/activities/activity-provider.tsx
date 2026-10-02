"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import { sendMessage } from "@/actions/chat";
import { getActivityById } from "@/lib/activities/registry";
import {
  communityLobbyPassword,
  dmLobbyPassword,
  isDmDirectEmbedGame,
  usesLobbyFlow,
} from "@/lib/activities/picker-utils";
import { applyTttMove, createTttState, tttResultForPlayer, type TttGameState } from "@/lib/activities/tic-tac-toe";
import { generateRoomCode } from "@/lib/sketch-quiz-words";
import { encodeGameShareMessage, type GameShareMode } from "@/lib/chat-game-share";
import { saveGameCreateOptions, saveGameJoinOptions } from "@/lib/games-lobby";
import type {
  ActivityContextType,
  ActivityEndResult,
  ActivityInvitePayload,
  ActivityPlayer,
  ActivitySession,
  ActivitySessionPhase,
} from "@/lib/activities/types";

type ActivityContextValue = {
  contextType: ActivityContextType;
  contextId: string;
  roomId?: string;
  peerUserId?: string;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  session: ActivitySession | null;
  incoming: ActivityInvitePayload | null;
  inviteActivity: (activityId: string, roomCode?: string) => void;
  pickActivity: (activityId: string) => Promise<void>;
  acceptInvite: () => void;
  declineInvite: () => void;
  leaveActivity: () => void;
  playAgain: () => void;
  backToChat: () => void;
  publishGameState: (gameState: Record<string, unknown>) => void;
  applyLocalGameEvent: (event: string, payload: unknown) => void;
  myResult: ActivityEndResult;
};

const ActivityCtx = createContext<ActivityContextValue | null>(null);

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useActivity() {
  const ctx = useContext(ActivityCtx);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}

export function useActivityOptional() {
  return useContext(ActivityCtx);
}

export function ActivityProvider({
  contextType,
  contextId,
  roomId,
  peerUserId,
  peerHint,
  children,
}: {
  contextType: ActivityContextType;
  contextId: string;
  roomId?: string;
  peerUserId?: string;
  peerHint?: ActivityPlayer;
  children: ReactNode;
}) {
  const router = useRouter();
  const { data: sessionAuth } = useSession();
  const meId = sessionAuth?.user?.id ?? "";
  const me: ActivityPlayer = {
    id: meId,
    username: sessionAuth?.user?.username ?? sessionAuth?.user?.name ?? "me",
    image: sessionAuth?.user?.image ?? null,
  };

  const { socket, socketReady } = useAppSocket();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [incoming, setIncoming] = useState<ActivityInvitePayload | null>(null);

  const setPhase = useCallback((phase: ActivitySessionPhase) => {
    setSession((s) => (s ? { ...s, phase } : s));
  }, []);

  useEffect(() => {
    if (!socket || !socketReady || !meId) return;

    const onIncoming = (payload: ActivityInvitePayload) => {
      if (payload.toUserId !== meId) return;
      if (payload.contextType !== contextType || payload.contextId !== contextId) return;
      setIncoming(payload);
      setPickerOpen(false);
    };

    const onAccepted = (payload: {
      sessionId: string;
      activityId: string;
      players: ActivityPlayer[];
      hostId: string;
      gameState?: Record<string, unknown> | null;
      minigameRoomId?: string | null;
    }) => {
      setIncoming(null);
      setSession((prev) => {
        const isHost = payload.hostId === meId;
        return {
          sessionId: payload.sessionId,
          activityId: payload.activityId,
          contextType,
          contextId,
          phase: "active",
          players: payload.players,
          hostId: payload.hostId,
          result: null,
          gameState: payload.gameState ?? prev?.gameState ?? null,
          minigameRoomId:
            payload.minigameRoomId ?? prev?.minigameRoomId ?? null,
          minigameRole: isHost ? "create" : "join",
        };
      });
    };

    const onDeclined = (payload: { sessionId: string }) => {
      setSession((s) =>
        s && s.sessionId === payload.sessionId ? { ...s, phase: "idle", result: "left" } : s
      );
      setTimeout(() => setSession(null), 400);
    };

    const onState = (payload: {
      sessionId: string;
      gameState: Record<string, unknown> | null;
      phase?: ActivitySessionPhase;
      result?: ActivityEndResult;
    }) => {
      setSession((s) => {
        if (!s || s.sessionId !== payload.sessionId) return s;
        return {
          ...s,
          gameState: payload.gameState,
          phase: payload.phase ?? s.phase,
          result: payload.result !== undefined ? payload.result : s.result,
        };
      });
    };

    const onEnded = (payload: { sessionId: string; result?: ActivityEndResult }) => {
      setSession((s) => {
        if (!s || s.sessionId !== payload.sessionId) return s;
        return { ...s, phase: "ended", result: payload.result ?? s.result };
      });
    };

    socket.on("activity_incoming", onIncoming);
    socket.on("activity_accepted", onAccepted);
    socket.on("activity_declined", onDeclined);
    socket.on("activity_state", onState);
    socket.on("activity_ended", onEnded);

    return () => {
      socket.off("activity_incoming", onIncoming);
      socket.off("activity_accepted", onAccepted);
      socket.off("activity_declined", onDeclined);
      socket.off("activity_state", onState);
      socket.off("activity_ended", onEnded);
    };
  }, [socket, socketReady, meId, contextType, contextId]);

  const inviteActivity = useCallback(
    (activityId: string, existingRoomCode?: string) => {
      const def = getActivityById(activityId);
      if (!def || !peerUserId || !meId) return;
      if (!def.playable) return;

      const sessionId = newSessionId();
      const minigameRoomId = def.minigameId
        ? (existingRoomCode ?? generateRoomCode())
        : null;
      const peer: ActivityPlayer = peerHint ?? {
        id: peerUserId,
        username: "friend",
        image: null,
      };

      const invite: ActivityInvitePayload = {
        sessionId,
        activityId,
        title: def.title,
        contextType,
        contextId,
        from: me,
        toUserId: peerUserId,
        minigameRoomId,
      };

      setPickerOpen(false);
      setSession({
        sessionId,
        activityId,
        contextType,
        contextId,
        phase: "inviting",
        players: [me, peer],
        hostId: meId,
        result: null,
        gameState: null,
        minigameRoomId,
        minigameRole: "create",
      });

      socket?.emit("activity_invite", invite);
    },
    [peerUserId, peerHint, meId, me, contextType, contextId, socket]
  );

  const shareGameToChat = useCallback(
    async (activityId: string, roomCode: string, mode: GameShareMode) => {
      if (!roomId) return;
      const content = encodeGameShareMessage({ activityId, roomCode, mode });
      try {
        await sendMessage({ roomId, content });
      } catch {
        // 채팅 카드 실패해도 게임 플로우는 계속
      }
    },
    [roomId]
  );

  const createLiarRoomCode = useCallback(async (): Promise<string | null> => {
    if (!socket || !socketReady) return null;
    const nickname =
      sessionAuth?.user?.username ?? sessionAuth?.user?.name ?? "플레이어";
    return new Promise((resolve) => {
      socket.emit(
        "liar_create_room",
        { nickname },
        (res: { ok?: boolean; code?: string }) => {
          resolve(res?.ok && res.code ? res.code : null);
        }
      );
    });
  }, [socket, socketReady, sessionAuth?.user?.username, sessionAuth?.user?.name]);

  const pickActivity = useCallback(
    async (activityId: string) => {
      const def = getActivityById(activityId);
      if (!def?.playable) return;

      const isDm = !!peerUserId;
      setPickerOpen(false);

      let roomCode = generateRoomCode();
      let mode: GameShareMode = "lobby";

      if (isDmDirectEmbedGame(def, isDm)) {
        mode = "direct";
        await shareGameToChat(def.id, roomCode, mode);
        inviteActivity(activityId, roomCode);
        return;
      }

      if (def.id === "liar-game") {
        const code = await createLiarRoomCode();
        roomCode = code ?? roomCode;
        mode = "lobby";
        await shareGameToChat(def.id, roomCode, mode);
        if (code) {
          router.push(`/liar-game?code=${encodeURIComponent(code)}`);
        } else {
          router.push("/liar-game");
        }
        return;
      }

      if (usesLobbyFlow(def, isDm)) {
        mode = "lobby";
        if (def.minigameId) {
          const password = isDm
            ? dmLobbyPassword(roomId ?? contextId)
            : communityLobbyPassword(contextId);
          saveGameCreateOptions(def.minigameId, { password });
          saveGameJoinOptions(def.minigameId, { password });
        }
        await shareGameToChat(def.id, roomCode, mode);

        if (def.id === "sketch-quiz") {
          router.push(`/sketch-quiz/${encodeURIComponent(roomCode)}?create=1`);
          return;
        }
        if (def.minigameId) {
          router.push(
            `/play/${def.minigameId}/${encodeURIComponent(roomCode)}?create=1`
          );
          return;
        }
        if (def.href) {
          router.push(def.href);
        }
        return;
      }

      if (def.href) {
        await shareGameToChat(def.id, roomCode, mode);
        router.push(def.href);
      }
    },
    [
      peerUserId,
      roomId,
      contextId,
      shareGameToChat,
      inviteActivity,
      createLiarRoomCode,
      router,
    ]
  );

  const acceptInvite = useCallback(() => {
    if (!incoming || !meId) return;
    const def = getActivityById(incoming.activityId);
    const host = incoming.from;
    const players = [host, me];
    let gameState: Record<string, unknown> | null = null;
    if (incoming.activityId === "tic-tac-toe") {
      gameState = createTttState(host.id, meId) as unknown as Record<string, unknown>;
    }
    const minigameRoomId = incoming.minigameRoomId ?? null;

    const accepted = {
      sessionId: incoming.sessionId,
      activityId: incoming.activityId,
      players,
      hostId: host.id,
      gameState,
      minigameRoomId,
      toUserId: host.id,
      fromUserId: meId,
    };

    socket?.emit("activity_accept", accepted);
    setIncoming(null);
    setSession({
      sessionId: incoming.sessionId,
      activityId: incoming.activityId,
      contextType,
      contextId,
      phase: "active",
      players,
      hostId: host.id,
      result: null,
      gameState,
      minigameRoomId,
      minigameRole: "join",
    });
    void def;
  }, [incoming, meId, me, contextType, contextId, socket]);

  const declineInvite = useCallback(() => {
    if (!incoming) return;
    socket?.emit("activity_decline", {
      sessionId: incoming.sessionId,
      toUserId: incoming.from.id,
      fromUserId: meId,
    });
    setIncoming(null);
  }, [incoming, socket, meId]);

  const leaveActivity = useCallback(() => {
    if (!session) return;
    const peer = session.players.find((p) => p.id !== meId);
    socket?.emit("activity_end", {
      sessionId: session.sessionId,
      toUserId: peer?.id,
      fromUserId: meId,
      result: "left",
    });
    setSession((s) => (s ? { ...s, phase: "ended", result: "left" } : s));
  }, [session, socket, meId]);

  const backToChat = useCallback(() => {
    setSession(null);
    setIncoming(null);
    setPickerOpen(false);
  }, []);

  const playAgain = useCallback(() => {
    if (!session || !peerUserId) return;
    inviteActivity(session.activityId);
  }, [session, peerUserId, inviteActivity]);

  const publishGameState = useCallback(
    (gameState: Record<string, unknown>, extras?: { phase?: ActivitySessionPhase; result?: ActivityEndResult }) => {
      if (!session) return;
      const peer = session.players.find((p) => p.id !== meId);
      setSession((s) =>
        s
          ? {
              ...s,
              gameState,
              phase: extras?.phase ?? s.phase,
              result: extras?.result !== undefined ? extras.result : s.result,
            }
          : s
      );
      socket?.emit("activity_state", {
        sessionId: session.sessionId,
        toUserId: peer?.id,
        gameState,
        phase: extras?.phase,
        result: extras?.result,
      });
    },
    [session, meId, socket]
  );

  const applyLocalGameEvent = useCallback(
    (event: string, payload: unknown) => {
      if (!session || session.phase !== "active" || !meId) return;
      if (session.activityId === "tic-tac-toe" && event === "move") {
        const index = typeof payload === "number" ? payload : (payload as { index?: number })?.index;
        if (typeof index !== "number") return;
        const prev = (session.gameState ?? null) as unknown as TttGameState | null;
        if (!prev) return;
        const next = applyTttMove(prev, index, meId);
        if (!next) return;
        const result = tttResultForPlayer(next, meId);
        publishGameState(next as unknown as Record<string, unknown>, {
          phase: next.winner ? "ended" : "active",
          result: next.winner ? result : null,
        });
      }
    },
    [session, meId, publishGameState]
  );

  const myResult = useMemo<ActivityEndResult>(() => {
    if (!session || session.phase !== "ended") return null;
    if (session.activityId === "tic-tac-toe" && session.gameState) {
      return tttResultForPlayer(session.gameState as unknown as TttGameState, meId);
    }
    return session.result;
  }, [session, meId]);

  const value = useMemo<ActivityContextValue>(
    () => ({
      contextType,
      contextId,
      roomId,
      peerUserId,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
      session,
      incoming,
      inviteActivity,
      pickActivity,
      acceptInvite,
      declineInvite,
      leaveActivity,
      playAgain,
      backToChat,
      publishGameState: (gs) => publishGameState(gs),
      applyLocalGameEvent,
      myResult,
    }),
    [
      contextType,
      contextId,
      roomId,
      peerUserId,
      pickerOpen,
      session,
      incoming,
      inviteActivity,
      pickActivity,
      acceptInvite,
      declineInvite,
      leaveActivity,
      playAgain,
      backToChat,
      publishGameState,
      applyLocalGameEvent,
      myResult,
    ]
  );

  return <ActivityCtx.Provider value={value}>{children}</ActivityCtx.Provider>;
}
