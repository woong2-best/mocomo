import type { Server, Socket } from "socket.io";
import type { PrismaClient } from "@prisma/client";
import { isValidRoomCode } from "../../src/lib/sketch-quiz-words";
import { hashLiveJoinPassword, verifyLiveJoinPassword } from "../../src/lib/live-password";
import {
  minigameCreate,
  minigameJoin,
  minigameLeave,
  minigameMatchCancel,
  minigameMatchEnqueue,
  minigameMove,
  minigameReady,
  minigameSpectate,
  minigameStart,
  minigameUpdateSocket,
  roomKey,
  tryMatchFromQueue,
} from "./store";

type AuthedSocket = Socket & { data: { userId?: string } };

export function registerMinigameHandlers(
  io: Server,
  socket: AuthedSocket,
  userId: string,
  prisma: PrismaClient
) {
  socket.on(
    "minigame_create",
    async (
      data: {
        gameId?: string;
        roomId?: string;
        username?: string;
        password?: string;
        requireFollow?: boolean;
        accessMode?: "private" | "public";
        ruleMode?: "free" | "renju";
      },
      ack?: (r: unknown) => void
    ) => {
      const gameId = data.gameId?.trim();
      const roomId = data.roomId?.trim().toUpperCase();
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      if (!gameId || !roomId || !isValidRoomCode(roomId)) {
        ack?.({ ok: false, error: "유효하지 않은 요청입니다." });
        return;
      }
      let passwordHash: string | undefined;
      if (data.password?.trim()) {
        passwordHash = await hashLiveJoinPassword(data.password);
      }
      const result = minigameCreate(gameId, roomId, userId, username, socket.id, {
        accessMode: data.accessMode ?? "private",
        passwordHash,
        requireFollow: !!data.requireFollow,
        ruleMode: data.ruleMode,
      });
      if (!result.ok) {
        ack?.(result);
        return;
      }
      socket.join(roomKey(gameId, roomId));
      ack?.({ ok: true, state: result.state });
      io.to(roomKey(gameId, roomId)).emit("minigame_state", { gameId, state: result.state });
    }
  );

  socket.on(
    "minigame_join",
    async (
      data: { gameId?: string; roomId?: string; username?: string; password?: string },
      ack?: (r: unknown) => void
    ) => {
      const gameId = data.gameId?.trim();
      const roomId = data.roomId?.trim().toUpperCase();
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      if (!gameId || !roomId || !isValidRoomCode(roomId)) {
        ack?.({ ok: false, error: "유효하지 않은 요청입니다." });
        return;
      }
      const result = await minigameJoin(gameId, roomId, userId, username, socket.id, {
        password: data.password,
        verifyPassword: verifyLiveJoinPassword,
        canJoinRoom: async (room, joinerId) => {
          if (joinerId === room.hostId) return true;
          const follow = await prisma.follow.findUnique({
            where: {
              followerId_followingId: { followerId: joinerId, followingId: room.hostId },
            },
          });
          return !!follow;
        },
      });
      if (!result.ok) {
        ack?.(result);
        return;
      }
      socket.join(roomKey(gameId, roomId));
      minigameUpdateSocket(gameId, roomId, userId, socket.id);
      ack?.({ ok: true, state: result.state });
    }
  );

  socket.on(
    "minigame_spectate",
    (
      data: { gameId?: string; roomId?: string; username?: string },
      ack?: (r: unknown) => void
    ) => {
      const gameId = data.gameId?.trim();
      const roomId = data.roomId?.trim().toUpperCase();
      const username = data.username?.trim().slice(0, 32) || "관전자";
      if (!gameId || !roomId) {
        ack?.({ ok: false, error: "유효하지 않은 요청입니다." });
        return;
      }
      const result = minigameSpectate(gameId, roomId, userId, username, socket.id);
      if (!result.ok) {
        ack?.(result);
        return;
      }
      socket.join(roomKey(gameId, roomId));
      ack?.({ ok: true, state: result.state });
    }
  );

  socket.on(
    "minigame_match",
    (data: { gameId?: string; username?: string }, ack?: (r: unknown) => void) => {
      const gameId = data.gameId?.trim();
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      if (!gameId) {
        ack?.({ ok: false, error: "게임 ID가 필요합니다." });
        return;
      }

      let result = minigameMatchEnqueue(gameId, userId, username, socket.id);
      if (!result.ok) {
        ack?.(result);
        return;
      }

      if (result.status === "waiting") {
        const matched = tryMatchFromQueue(gameId);
        if (matched) {
          result = {
            ok: true,
            status: "matched",
            roomId: matched.roomId,
            state: matched.state,
            socketIds: matched.socketIds,
            autoStarted: matched.autoStarted,
          };
        } else {
          ack?.({ ok: true, status: "waiting", queueSize: result.queueSize });
          return;
        }
      }

      if (result.status !== "matched") return;

      const { roomId, state, socketIds, autoStarted } = result;
      for (const sid of socketIds) {
        const peer = io.sockets.sockets.get(sid);
        if (peer) {
          peer.join(roomKey(gameId, roomId));
          if (sid !== socket.id) {
            peer.emit("minigame_matched", { gameId, roomId, state, autoStarted });
          }
        }
      }
      socket.join(roomKey(gameId, roomId));
      ack?.({ ok: true, status: "matched", roomId, state, autoStarted });
      io.to(roomKey(gameId, roomId)).emit("minigame_state", { gameId, state });
    }
  );

  socket.on("minigame_match_cancel", (data: { gameId?: string }) => {
    const gameId = data?.gameId?.trim();
    if (gameId) minigameMatchCancel(gameId, userId);
  });

  socket.on("minigame_leave", (data: { gameId?: string; roomId?: string }) => {
    const gameId = data?.gameId?.trim();
    const roomId = data?.roomId?.trim().toUpperCase();
    if (!gameId || !roomId) return;
    socket.leave(roomKey(gameId, roomId));
    minigameLeave(gameId, roomId, userId);
  });

  socket.on(
    "minigame_ready",
    (data: { gameId?: string; roomId?: string; ready?: boolean }, ack?: (r: unknown) => void) => {
      const gameId = data?.gameId?.trim();
      const roomId = data?.roomId?.trim().toUpperCase();
      if (!gameId || !roomId) return;
      const result = minigameReady(gameId, roomId, userId, !!data.ready);
      ack?.(result);
    }
  );

  socket.on("minigame_start", (data: { gameId?: string; roomId?: string }, ack?: (r: unknown) => void) => {
    const gameId = data?.gameId?.trim();
    const roomId = data?.roomId?.trim().toUpperCase();
    if (!gameId || !roomId) return;
    const result = minigameStart(gameId, roomId, userId);
    ack?.(result);
    if (result.ok && "state" in result) {
      io.to(roomKey(gameId, roomId)).emit("minigame_state", { gameId, state: result.state });
    }
  });

  socket.on(
    "minigame_move",
    (data: { gameId?: string; roomId?: string; move?: unknown }, ack?: (r: unknown) => void) => {
      const gameId = data?.gameId?.trim();
      const roomId = data?.roomId?.trim().toUpperCase();
      if (!gameId || !roomId) return;
      const result = minigameMove(gameId, roomId, userId, data.move);
      ack?.(result);
    }
  );
}
