import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { verifySocketAuthToken } from "../src/lib/socket-auth-token";
import { sanitizeChatAttachments } from "../src/lib/chat-attachments";
import { chatMessageInclude } from "../src/lib/chat-message-serialize";
import { notifyChatMessageSocket } from "./chat-notify";
import {
  initSketchQuizStore,
  sketchQuizCreate,
  sketchQuizJoin,
  sketchQuizLeave,
  sketchQuizCloseRoom,
  sketchQuizStart,
  sketchQuizStroke,
  sketchQuizClear,
  sketchQuizGuess,
  sketchQuizUpdateSocket,
  sketchQuizReplayWord,
  sketchQuizMatchEnqueue,
  sketchQuizMatchCancel,
} from "./sketch-quiz-store";
import { isValidRoomCode } from "../src/lib/sketch-quiz-words";
import { hashLiveJoinPassword, verifyLiveJoinPassword } from "../src/lib/live-password";
import { registerLiveSupportHandlers } from "./live-support";
import { initMinigameStore, minigameMatchCancelAll } from "./minigames/store";
import { registerMinigameHandlers } from "./minigames/register-handlers";
import { registerAptWorldHandlers } from "./apt-world-store";
import { registerAptHomeHandlers } from "./apt-home-store";
import { loadWordChainDictionaryFromDisk } from "./word-chain/load-dictionary";

const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || process.env.SOCKET_PORT || "3001", 10);
const ALLOW_LEGACY =
  process.env.NODE_ENV !== "production" && process.env.SOCKET_ALLOW_LEGACY_USER_ID === "true";

type AuthedSocket = Socket & { data: { userId?: string; chatRooms?: Set<string> } };

/** userId → 활성 소켓 연결 수 (탭 여러 개) */
const onlineConnectionCount = new Map<string, number>();

function isUserOnline(userId: string) {
  return (onlineConnectionCount.get(userId) ?? 0) > 0;
}

function setUserOnline(userId: string, online: boolean) {
  const prev = onlineConnectionCount.get(userId) ?? 0;
  const next = online ? prev + 1 : Math.max(0, prev - 1);
  if (next <= 0) onlineConnectionCount.delete(userId);
  else onlineConnectionCount.set(userId, next);
  return { wasOnline: prev > 0, isOnline: next > 0 };
}

function emitPresenceToRoom(roomId: string, userId: string, online: boolean) {
  io.to(`room:${roomId}`).emit("presence_change", { userId, online });
}

/** 앱 접속 시 DM·그룹 상대에게 실시간 접속 상태 전달 */
async function broadcastPresenceToMemberRooms(userId: string, online: boolean) {
  try {
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    const roomIds = memberships.map((m) => m.roomId);
    if (!roomIds.length) return;

    for (const roomId of roomIds) {
      emitPresenceToRoom(roomId, userId, online);
    }

    const partners = await prisma.chatMember.findMany({
      where: { roomId: { in: roomIds }, userId: { not: userId } },
      select: { userId: true, roomId: true },
    });
    for (const partner of partners) {
      io.to(`user:${partner.userId}`).emit("presence_change", {
        userId,
        online,
        roomId: partner.roomId,
      });
    }
  } catch {
    /* DB 일시 오류 — 채팅은 계속 */
  }
}

async function emitRoomPresenceSnapshot(socket: AuthedSocket, roomId: string) {
  const members = await prisma.chatMember.findMany({
    where: { roomId },
    select: { userId: true },
  });
  const onlineUserIds = members.map((m) => m.userId).filter((id) => isUserOnline(id));
  socket.emit("room_presence", { onlineUserIds });
}

function resolveUserId(socket: AuthedSocket): string | null {
  const token = socket.handshake.auth.token as string | undefined;
  const fromToken = verifySocketAuthToken(token);
  if (fromToken) return fromToken;
  if (ALLOW_LEGACY) {
    const legacy = socket.handshake.auth.userId as string | undefined;
    return legacy?.trim() || null;
  }
  return null;
}

const RELAY_SECRET = process.env.SOCKET_RELAY_SECRET?.trim();

const httpServer = createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    const origin = req.headers.origin;
    const allowed = socketCorsOrigins();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (
      origin &&
      (allowed.includes(origin) || origin.endsWith(".vercel.app"))
    ) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Vary"] = "Origin";
    }
    res.writeHead(200, headers);
    res.end(JSON.stringify({ ok: true, service: "mocomo-socket" }));
    return;
  }
  if (req.method === "POST" && req.url === "/relay/chat-message") {
    if (!RELAY_SECRET || req.headers["x-relay-secret"] !== RELAY_SECRET) {
      res.writeHead(401);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          roomId?: string;
          message?: { id?: string; createdAt?: string };
        };
        if (body.roomId && body.message?.id) {
          io.to(`room:${body.roomId}`).emit("new_message", body.message);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/relay/live-ended") {
    if (!RELAY_SECRET || req.headers["x-relay-secret"] !== RELAY_SECRET) {
      res.writeHead(401);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          channelId?: string;
        };
        if (body.channelId) {
          io.to(`live:${body.channelId}`).emit("live_ended", { channelId: body.channelId });
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/relay/live-chat-message") {
    if (!RELAY_SECRET || req.headers["x-relay-secret"] !== RELAY_SECRET) {
      res.writeHead(401);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          channelId?: string;
          message?: {
            id?: string;
            userId?: string;
            username?: string;
            content?: string;
            at?: number;
          };
        };
        if (body.channelId && body.message?.id && body.message.username) {
          io.to(`live:${body.channelId}`).emit("live_chat_message", body.message);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/relay/live-support-event") {
    if (!RELAY_SECRET || req.headers["x-relay-secret"] !== RELAY_SECRET) {
      res.writeHead(401);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          channelId?: string;
          event?: { id?: string; username?: string };
        };
        if (body.channelId && body.event?.id) {
          io.to(`live:${body.channelId}`).emit("live_support_event", body.event);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/relay/live-mission-updated") {
    if (!RELAY_SECRET || req.headers["x-relay-secret"] !== RELAY_SECRET) {
      res.writeHead(401);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          channelId?: string;
          mission?: { id?: string };
        };
        if (body.channelId && body.mission?.id) {
          io.to(`live:${body.channelId}`).emit("live_mission_updated", body.mission);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/relay/live-poll-updated") {
    if (!RELAY_SECRET || req.headers["x-relay-secret"] !== RELAY_SECRET) {
      res.writeHead(401);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          channelId?: string;
          poll?: { id?: string };
        };
        if (body.channelId && body.poll?.id) {
          io.to(`live:${body.channelId}`).emit("live_poll_updated", body.poll);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

function socketCorsOrigins(): string[] {
  const raw =
    process.env.SOCKET_CORS_ORIGINS ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowed = socketCorsOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      if (origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS blocked"));
    },
    credentials: true,
  },
});

initSketchQuizStore(io);
initMinigameStore(io, prisma);
loadWordChainDictionaryFromDisk();

/** 채널별 영상 위 채팅 오버레이 표시 여부 */
const liveChatOverlayByChannel = new Map<string, boolean>();

/** 채널별 방송 오버레이(텍스트·룰렛) — 전역 상태 (연결마다 분리하면 동기화 깨짐) */
const liveOverlayByChannel = new Map<string, { version: number; widgets: unknown[] }>();

io.on("connection", (socket: AuthedSocket) => {
  const userId = resolveUserId(socket);
  if (!userId) {
    socket.disconnect(true);
    return;
  }
  socket.data.userId = userId;
  socket.data.chatRooms = new Set();
  socket.join(`user:${userId}`);

  const cameOnline = setUserOnline(userId, true);
  if (!cameOnline.wasOnline && cameOnline.isOnline) {
    void broadcastPresenceToMemberRooms(userId, true);
  }

  socket.on("join_room", async (roomId: string) => {
    if (!roomId || roomId.length > 64) return;
    const member = await prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) return;
    socket.join(`room:${roomId}`);
    socket.data.chatRooms?.add(roomId);
    await emitRoomPresenceSnapshot(socket, roomId);
    emitPresenceToRoom(roomId, userId, true);
  });

  socket.on("leave_room", (roomId: string) => {
    socket.leave(`room:${roomId}`);
    socket.data.chatRooms?.delete(roomId);
  });

  socket.on("send_message", async (data: {
    roomId: string;
    senderId?: string;
    content?: string;
    replyToId?: string;
    mentions?: string[];
    attachments?: { url: string; type: string; name?: string }[];
  }) => {
    const senderId = userId;
    if (!data.roomId || data.roomId.length > 64) return;
    const content = (data.content ?? "").slice(0, 4000).trim();
    const attachments = sanitizeChatAttachments(data.attachments);
    if (!content && !attachments.length) {
      socket.emit("error", { message: "첨부 파일 URL이 유효하지 않습니다." });
      return;
    }

    try {
      const member = await prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId: data.roomId, userId: senderId } },
      });
      if (!member) return;

      if (data.replyToId) {
        const parent = await prisma.message.findFirst({
          where: { id: data.replyToId, roomId: data.roomId },
          select: { id: true },
        });
        if (!parent) return;
      }

      const message = await prisma.message.create({
        data: {
          roomId: data.roomId,
          senderId,
          content: content || null,
          replyToId: data.replyToId,
          mentions: Array.isArray(data.mentions) ? data.mentions.slice(0, 20) : [],
          attachments: attachments.length
            ? { create: attachments.map((a) => ({ url: a.url, type: a.type, name: a.name })) }
            : undefined,
        },
        include: chatMessageInclude,
      });
      const room = await prisma.chatRoom.findUnique({
        where: { id: data.roomId },
        select: { type: true },
      });
      await prisma.chatRoom.update({
        where: { id: data.roomId },
        data: { updatedAt: new Date() },
      });
      if (room) {
        void notifyChatMessageSocket(prisma, {
          roomId: data.roomId,
          senderId,
          content,
          roomType: room.type,
          mentionUserIds: Array.isArray(data.mentions) ? data.mentions : [],
        });
      }
      const payload = {
        ...message,
        createdAt: message.createdAt.toISOString(),
      };
      io.to(`room:${data.roomId}`).emit("new_message", payload);
      for (const mentionId of data.mentions ?? []) {
        if (typeof mentionId === "string" && mentionId.length < 64) {
          io.to(`user:${mentionId}`).emit("mention", { roomId: data.roomId, message });
        }
      }
    } catch {
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("typing", (data: { roomId: string; username?: string }) => {
    if (!data.roomId) return;
    socket.to(`room:${data.roomId}`).emit("typing", {
      roomId: data.roomId,
      userId,
      username: data.username ?? userId,
    });
  });

  socket.on("read_message", async (data: { messageId: string }) => {
    if (!data.messageId) return;
    await prisma.messageRead.upsert({
      where: { messageId_userId: { messageId: data.messageId, userId } },
      create: { messageId: data.messageId, userId },
      update: { readAt: new Date() },
    });
  });

  socket.on("join_voice", async (data: string | { channelId?: string; displayName?: string }) => {
    const channelId = typeof data === "string" ? data : data?.channelId;
    const displayName = typeof data === "object" ? data?.displayName : undefined;
    if (!channelId) return;

    const room = `voice:${channelId}`;
    const existing = await io.in(room).fetchSockets();
    const peerIds = existing
      .map((s) => (s as AuthedSocket).data.userId)
      .filter((id): id is string => !!id && id !== userId);

    socket.join(room);
    socket.emit("voice_peers", { channelId, peerIds });
    socket.to(room).emit("voice_peer_joined", { channelId, userId, displayName });
  });

  socket.on("leave_voice", (channelId: string) => {
    if (!channelId) return;
    socket.leave(`voice:${channelId}`);
    socket.to(`voice:${channelId}`).emit("voice_peer_left", { channelId, userId });
  });

  socket.on(
    "community_voice_signal",
    (data: { channelId?: string; toUserId?: string; payload?: unknown }) => {
      const channelId = data.channelId?.trim();
      const toUserId = data.toUserId?.trim();
      if (!channelId || !toUserId || toUserId === userId || !data.payload) return;
      io.to(`user:${toUserId}`).emit("community_voice_signal", {
        channelId,
        fromUserId: userId,
        payload: data.payload,
      });
    }
  );

  socket.on("voice_state", (data: {
    channelId: string;
    isMuted?: boolean;
    cameraOn?: boolean;
    screenOn?: boolean;
  }) => {
    if (!data.channelId) return;
    io.to(`voice:${data.channelId}`).emit("voice_state_update", {
      channelId: data.channelId,
      userId,
      isMuted: data.isMuted,
      cameraOn: data.cameraOn,
      screenOn: data.screenOn,
    });
  });

  const liveRoomCounts = new Map<string, number>();

  function emitLiveViewers(channelId: string) {
    io.in(`live:${channelId}`).fetchSockets().then((sockets) => {
      const count = sockets.length;
      liveRoomCounts.set(channelId, count);
      io.to(`live:${channelId}`).emit("live_viewers", count);
    });
  }

  socket.on("join_live", async (channelId: string) => {
    if (!channelId || channelId.length > 64) return;
    socket.join(`live:${channelId}`);
    try {
      const channel = await prisma.voiceChannel.findUnique({
        where: { id: channelId },
        select: { createdBy: true, isLive: true },
      });
      if (channel?.isLive) {
        const role = channel.createdBy === userId ? "HOST" : "VIEWER";
        await prisma.voiceMember.upsert({
          where: { channelId_userId: { channelId, userId } },
          create: { channelId, userId, role, lastSeenAt: new Date() },
          update: { lastSeenAt: new Date() },
        });
      }
    } catch {
      /* ignore */
    }
    emitLiveViewers(channelId);
    const overlay = liveOverlayByChannel.get(channelId);
    if (overlay) {
      socket.emit("live_overlay_state", { channelId, state: overlay });
    }
    if (liveChatOverlayByChannel.has(channelId)) {
      socket.emit("live_chat_overlay_state", {
        channelId,
        enabled: liveChatOverlayByChannel.get(channelId),
      });
    }
  });

  socket.on("leave_live", (channelId: string) => {
    socket.leave(`live:${channelId}`);
    emitLiveViewers(channelId);
  });

  socket.on(
    "live_overlay_publish",
    async (data: { channelId?: string; state?: { version?: number; widgets?: unknown[] } }) => {
      const channelId = data.channelId?.trim();
      if (!channelId || channelId.length > 64 || !data.state?.widgets) return;
      try {
        const channel = await prisma.voiceChannel.findUnique({
          where: { id: channelId },
          select: { createdBy: true },
        });
        if (!channel || channel.createdBy !== userId) return;
        const state = {
          version: typeof data.state.version === "number" ? data.state.version : Date.now(),
          widgets: data.state.widgets,
        };
        liveOverlayByChannel.set(channelId, state);
        io.to(`live:${channelId}`).emit("live_overlay_state", { channelId, state });
      } catch {
        /* ignore */
      }
    }
  );

  socket.on(
    "live_chat_overlay_publish",
    async (data: { channelId?: string; enabled?: boolean }) => {
      const channelId = data.channelId?.trim();
      if (!channelId || channelId.length > 64 || typeof data.enabled !== "boolean") return;
      try {
        const channel = await prisma.voiceChannel.findUnique({
          where: { id: channelId },
          select: { createdBy: true },
        });
        if (!channel || channel.createdBy !== userId) return;
        liveChatOverlayByChannel.set(channelId, data.enabled);
        io.to(`live:${channelId}`).emit("live_chat_overlay_state", {
          channelId,
          enabled: data.enabled,
        });
      } catch {
        /* ignore */
      }
    }
  );

  socket.on(
    "live_chat_relay",
    async (data: {
      channelId: string;
      message: {
        id: string;
        userId: string;
        username: string;
        content: string;
        at: number;
        image?: string | null;
        supportTierSent?: string;
      };
    }) => {
      if (!data.channelId || !data.message?.id) return;
      if (data.message.userId !== userId) return;
      const channel = await prisma.voiceChannel.findUnique({
        where: { id: data.channelId },
        select: { isLive: true },
      });
      if (!channel?.isLive) return;
      const member = await prisma.voiceMember.findUnique({
        where: { channelId_userId: { channelId: data.channelId, userId } },
      });
      if (!member) {
        await prisma.voiceMember.upsert({
          where: { channelId_userId: { channelId: data.channelId, userId } },
          create: { channelId: data.channelId, userId, role: "VIEWER", lastSeenAt: new Date() },
          update: { lastSeenAt: new Date() },
        });
      }
      io.to(`live:${data.channelId}`).emit("live_chat_message", data.message);
    }
  );

  registerLiveSupportHandlers(io, socket, userId, prisma);
  registerMinigameHandlers(io, socket, userId, prisma);
  registerAptWorldHandlers(io, socket, userId);
  registerAptHomeHandlers(io, socket, userId);

  socket.on("webrtc_signal", (data: { channelId: string; to: string; signal: unknown }) => {
    if (!data.to || !data.channelId) return;
    io.to(`user:${data.to}`).emit("webrtc_signal", {
      from: userId,
      channelId: data.channelId,
      signal: data.signal,
    });
  });

  socket.on(
    "call_invite",
    async (data: {
      callId: string;
      call?: {
        id: string;
        signalingRoomId: string;
        chatRoomId: string | null;
        callType: string;
        status: string;
        caller: { id: string; username: string; image: string | null };
        callee: { id: string; username: string; image: string | null };
      };
    }) => {
      if (!data.callId) return;
      try {
        if (
          data.call?.id === data.callId &&
          data.call.caller.id === userId &&
          data.call.status === "RINGING" &&
          data.call.callee?.id
        ) {
          io.to(`user:${data.call.callee.id}`).emit("call_incoming", data.call);
          return;
        }

        const call = await prisma.voiceCall.findUnique({
          where: { id: data.callId },
          select: {
            id: true,
            signalingRoomId: true,
            chatRoomId: true,
            callType: true,
            status: true,
            calleeId: true,
            caller: { select: { id: true, username: true, image: true } },
            callee: { select: { id: true, username: true, image: true } },
          },
        });
        if (!call || call.caller.id !== userId || call.status !== "RINGING") return;
        io.to(`user:${call.calleeId}`).emit("call_incoming", {
          id: call.id,
          signalingRoomId: call.signalingRoomId,
          chatRoomId: call.chatRoomId,
          callType: call.callType,
          status: call.status,
          caller: call.caller,
          callee: call.callee,
        });
      } catch {
        socket.emit("error", { message: "Failed to invite call" });
      }
    }
  );

  socket.on(
    "call_accept",
    (data: { callId: string; callerId?: string; calleeId?: string }) => {
      if (!data.callId || data.calleeId !== userId || !data.callerId) return;
      io.to(`user:${data.callerId}`).emit("call_accepted", { callId: data.callId });
      io.to(`user:${data.calleeId}`).emit("call_accepted", { callId: data.callId });
    }
  );

  socket.on("call_decline", (data: { callId: string; peerId?: string }) => {
    if (!data.callId || !data.peerId || data.peerId === userId) return;
    io.to(`user:${data.peerId}`).emit("call_declined", { callId: data.callId });
  });

  socket.on("call_end", (data: { callId: string; peerId?: string }) => {
    if (!data.callId || !data.peerId || data.peerId === userId) return;
    io.to(`user:${data.peerId}`).emit("call_ended", { callId: data.callId });
  });

  socket.on(
    "call_signal",
    async (data: { callId?: string; toUserId?: string; payload?: unknown }) => {
      if (!data.callId || !data.toUserId || !data.payload) return;
      try {
        const call = await prisma.voiceCall.findUnique({
          where: { id: data.callId },
          select: { callerId: true, calleeId: true, status: true },
        });
        if (!call) return;
        if (call.callerId !== userId && call.calleeId !== userId) return;
        if (call.callerId !== data.toUserId && call.calleeId !== data.toUserId) return;
        if (call.status !== "RINGING" && call.status !== "ACTIVE") return;
        io.to(`user:${data.toUserId}`).emit("call_signal", {
          callId: data.callId,
          fromUserId: userId,
          payload: data.payload,
        });
      } catch {
        socket.emit("error", { message: "Failed to relay call signal" });
      }
    }
  );

  /** DM/Community Activity — invite / sync (채팅 화면을 벗어나지 않음) */
  socket.on(
    "activity_invite",
    (data: {
      sessionId?: string;
      activityId?: string;
      title?: string;
      contextType?: string;
      contextId?: string;
      from?: { id: string; username: string; image?: string | null };
      toUserId?: string;
      minigameRoomId?: string | null;
    }) => {
      if (!data.sessionId || !data.activityId || !data.toUserId || !data.from) return;
      if (data.from.id !== userId) return;
      io.to(`user:${data.toUserId}`).emit("activity_incoming", data);
    }
  );

  socket.on(
    "activity_accept",
    (data: {
      sessionId?: string;
      activityId?: string;
      players?: unknown;
      hostId?: string;
      gameState?: unknown;
      minigameRoomId?: string | null;
      toUserId?: string;
      fromUserId?: string;
    }) => {
      if (!data.sessionId || !data.toUserId || data.fromUserId !== userId) return;
      io.to(`user:${data.toUserId}`).emit("activity_accepted", data);
      io.to(`user:${userId}`).emit("activity_accepted", data);
    }
  );

  socket.on(
    "activity_decline",
    (data: { sessionId?: string; toUserId?: string; fromUserId?: string }) => {
      if (!data.sessionId || !data.toUserId || data.fromUserId !== userId) return;
      io.to(`user:${data.toUserId}`).emit("activity_declined", { sessionId: data.sessionId });
    }
  );

  socket.on(
    "activity_state",
    (data: {
      sessionId?: string;
      toUserId?: string;
      gameState?: unknown;
      phase?: string;
      result?: string | null;
    }) => {
      if (!data.sessionId || !data.toUserId) return;
      io.to(`user:${data.toUserId}`).emit("activity_state", data);
    }
  );

  socket.on(
    "activity_end",
    (data: {
      sessionId?: string;
      toUserId?: string;
      fromUserId?: string;
      result?: string | null;
    }) => {
      if (!data.sessionId || data.fromUserId !== userId) return;
      if (data.toUserId) {
        io.to(`user:${data.toUserId}`).emit("activity_ended", {
          sessionId: data.sessionId,
          result: data.result ?? "left",
        });
      }
    }
  );

  socket.on(
    "sketch_quiz_create",
    async (
      data: {
        roomId?: string;
        username?: string;
        password?: string;
        requireFollow?: boolean;
        accessMode?: "private" | "public";
      },
      ack?: (r: unknown) => void
    ) => {
      const roomId = data.roomId?.trim().toUpperCase();
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      if (!roomId || !isValidRoomCode(roomId)) {
        ack?.({ ok: false, error: "유효하지 않은 방 코드입니다." });
        return;
      }
      let passwordHash: string | undefined;
      if (data.password?.trim()) {
        passwordHash = await hashLiveJoinPassword(data.password);
      }
      const result = sketchQuizCreate(roomId, userId, username, socket.id, {
        accessMode: data.accessMode ?? "private",
        passwordHash,
        requireFollow: !!data.requireFollow,
      });
      if (!result.ok) {
        ack?.(result);
        return;
      }
      socket.join(`sketch:${roomId}`);
      ack?.({ ok: true, state: result.state });
      io.to(`sketch:${roomId}`).emit("sketch_quiz_state", result.state);
    }
  );

  socket.on(
    "sketch_quiz_join",
    async (
      data: { roomId?: string; username?: string; password?: string },
      ack?: (r: unknown) => void
    ) => {
      const roomId = data.roomId?.trim().toUpperCase();
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      if (!roomId || !isValidRoomCode(roomId)) {
        ack?.({ ok: false, error: "유효하지 않은 방 코드입니다." });
        return;
      }
      const result = await sketchQuizJoin(roomId, userId, username, socket.id, {
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
      socket.join(`sketch:${roomId}`);
      sketchQuizUpdateSocket(roomId, userId, socket.id);
      ack?.({ ok: true, state: result.state });
      io.to(`sketch:${roomId}`).emit("sketch_quiz_state", result.state);
      sketchQuizReplayWord(roomId, userId);
    }
  );

  socket.on(
    "sketch_quiz_match",
    (data: { username?: string }, ack?: (r: unknown) => void) => {
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      const result = sketchQuizMatchEnqueue(userId, username, socket.id);
      if (!result.ok) {
        ack?.(result);
        return;
      }
      if (result.status === "waiting") {
        ack?.({ ok: true, status: "waiting", queueSize: result.queueSize });
        return;
      }

      const roomId = result.roomId;
      const state = result.state;
      for (const sid of result.socketIds) {
        const peer = io.sockets.sockets.get(sid);
        if (peer) {
          peer.join(`sketch:${roomId}`);
          if (sid !== socket.id) {
            peer.emit("sketch_quiz_matched", {
              roomId,
              state,
              autoStarted: result.autoStarted,
            });
          }
        }
      }
      socket.join(`sketch:${roomId}`);
      ack?.({
        ok: true,
        status: "matched",
        roomId,
        state,
        autoStarted: result.autoStarted,
      });
      io.to(`sketch:${roomId}`).emit("sketch_quiz_state", state);
    }
  );

  socket.on("sketch_quiz_match_cancel", () => {
    sketchQuizMatchCancel(userId);
  });

  socket.on("sketch_quiz_leave", (roomId: string) => {
    const id = roomId?.trim().toUpperCase();
    if (!id) return;
    socket.leave(`sketch:${id}`);
    sketchQuizLeave(id, userId);
  });

  socket.on("sketch_quiz_close", (roomId: string, ack?: (r: unknown) => void) => {
    const id = roomId?.trim().toUpperCase();
    if (!id) return;
    const result = sketchQuizCloseRoom(id, userId);
    if (result.ok) socket.leave(`sketch:${id}`);
    ack?.(result);
  });

  socket.on("sketch_quiz_start", (roomId: string, ack?: (r: unknown) => void) => {
    const id = roomId?.trim().toUpperCase();
    if (!id) return;
    const result = sketchQuizStart(id, userId);
    ack?.(result);
  });

  socket.on(
    "sketch_quiz_stroke",
    (data: { roomId?: string; stroke?: { id: string; points: { x: number; y: number }[]; color: string; width: number } }) => {
      const roomId = data.roomId?.trim().toUpperCase();
      if (!roomId || !data.stroke?.points?.length) return;
      sketchQuizStroke(roomId, userId, data.stroke);
    }
  );

  socket.on("sketch_quiz_clear", (roomId: string) => {
    const id = roomId?.trim().toUpperCase();
    if (!id) return;
    sketchQuizClear(id, userId);
  });

  socket.on(
    "sketch_quiz_guess",
    (data: { roomId?: string; text?: string; username?: string }) => {
      const roomId = data.roomId?.trim().toUpperCase();
      const text = data.text?.trim();
      const username = data.username?.trim().slice(0, 32) || "플레이어";
      if (!roomId || !text) return;
      sketchQuizGuess(roomId, userId, username, text);
    }
  );

  socket.on("disconnect", () => {
    sketchQuizMatchCancel(userId);
    minigameMatchCancelAll(userId);
    const wentOffline = setUserOnline(userId, false);
    if (wentOffline.wasOnline && !wentOffline.isOnline) {
      void broadcastPresenceToMemberRooms(userId, false);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[MoCoMo] Socket.IO server on :${PORT} (auth token required)`);
});
