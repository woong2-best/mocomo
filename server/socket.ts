import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { verifySocketAuthToken } from "../src/lib/socket-auth-token";

const prisma = new PrismaClient();
const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);
const ALLOW_LEGACY =
  process.env.NODE_ENV !== "production" && process.env.SOCKET_ALLOW_LEGACY_USER_ID === "true";

type AuthedSocket = Socket & { data: { userId?: string } };

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

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXTAUTH_URL || "http://localhost:3000", credentials: true },
});

io.on("connection", (socket: AuthedSocket) => {
  const userId = resolveUserId(socket);
  if (!userId) {
    socket.disconnect(true);
    return;
  }
  socket.data.userId = userId;
  socket.join(`user:${userId}`);

  socket.on("join_room", async (roomId: string) => {
    if (!roomId || roomId.length > 64) return;
    const member = await prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) return;
    socket.join(`room:${roomId}`);
  });

  socket.on("leave_room", (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on("send_message", async (data: {
    roomId: string;
    senderId?: string;
    content?: string;
    replyToId?: string;
    mentions?: string[];
  }) => {
    const senderId = userId;
    if (!data.roomId || data.roomId.length > 64) return;
    const content = (data.content ?? "").slice(0, 4000);
    if (!content.trim()) return;

    try {
      const member = await prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId: data.roomId, userId: senderId } },
      });
      if (!member) return;

      const message = await prisma.message.create({
        data: {
          roomId: data.roomId,
          senderId,
          content,
          replyToId: data.replyToId,
          mentions: Array.isArray(data.mentions) ? data.mentions.slice(0, 20) : [],
        },
        include: {
          sender: { select: { id: true, username: true, image: true } },
          attachments: true,
        },
      });
      await prisma.chatRoom.update({
        where: { id: data.roomId },
        data: { updatedAt: new Date() },
      });
      io.to(`room:${data.roomId}`).emit("new_message", message);
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

  socket.on("join_voice", (channelId: string) => {
    if (channelId) socket.join(`voice:${channelId}`);
  });

  socket.on("leave_voice", (channelId: string) => {
    socket.leave(`voice:${channelId}`);
  });

  const liveRoomCounts = new Map<string, number>();

  function emitLiveViewers(channelId: string) {
    io.in(`live:${channelId}`).fetchSockets().then((sockets) => {
      const count = sockets.length;
      liveRoomCounts.set(channelId, count);
      io.to(`live:${channelId}`).emit("live_viewers", count);
    });
  }

  socket.on("join_live", (channelId: string) => {
    if (!channelId) return;
    socket.join(`live:${channelId}`);
    emitLiveViewers(channelId);
  });

  socket.on("leave_live", (channelId: string) => {
    socket.leave(`live:${channelId}`);
    emitLiveViewers(channelId);
  });

  socket.on(
    "live_chat",
    (data: { channelId: string; username?: string; content?: string; image?: string | null }) => {
      if (!data.channelId) return;
      const content = (data.content ?? "").slice(0, 500).trim();
      if (!content) return;
      const payload = {
        channelId: data.channelId,
        userId,
        username: data.username ?? userId,
        content,
        image: data.image ?? null,
        at: Date.now(),
      };
      io.to(`live:${data.channelId}`).emit("live_chat_message", payload);
    }
  );

  socket.on("webrtc_signal", (data: { channelId: string; to: string; signal: unknown }) => {
    if (!data.to || !data.channelId) return;
    io.to(`user:${data.to}`).emit("webrtc_signal", {
      from: userId,
      channelId: data.channelId,
      signal: data.signal,
    });
  });

  socket.on("call_invite", async (data: { callId: string }) => {
    if (!data.callId) return;
    try {
      const call = await prisma.voiceCall.findUnique({
        where: { id: data.callId },
        include: {
          caller: { select: { id: true, username: true, image: true } },
          callee: { select: { id: true, username: true, image: true } },
        },
      });
      if (!call || call.callerId !== userId || call.status !== "RINGING") return;
      io.to(`user:${call.calleeId}`).emit("call_incoming", {
        id: call.id,
        livekitRoom: call.livekitRoom,
        chatRoomId: call.chatRoomId,
        callType: call.callType,
        status: call.status,
        caller: call.caller,
        callee: call.callee,
      });
    } catch {
      socket.emit("error", { message: "Failed to invite call" });
    }
  });

  socket.on("call_accept", async (data: { callId: string }) => {
    if (!data.callId) return;
    const call = await prisma.voiceCall.findUnique({ where: { id: data.callId } });
    if (!call || call.calleeId !== userId) return;
    io.to(`user:${call.callerId}`).emit("call_accepted", { callId: data.callId });
    io.to(`user:${call.calleeId}`).emit("call_accepted", { callId: data.callId });
  });

  socket.on("call_decline", async (data: { callId: string }) => {
    if (!data.callId) return;
    const call = await prisma.voiceCall.findUnique({ where: { id: data.callId } });
    if (!call) return;
    const otherId = call.callerId === userId ? call.calleeId : call.callerId;
    io.to(`user:${otherId}`).emit("call_declined", { callId: data.callId });
  });

  socket.on("call_end", async (data: { callId: string }) => {
    if (!data.callId) return;
    const call = await prisma.voiceCall.findUnique({ where: { id: data.callId } });
    if (!call) return;
    const otherId = call.callerId === userId ? call.calleeId : call.callerId;
    io.to(`user:${otherId}`).emit("call_ended", { callId: data.callId });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[MoCoMo] Socket.IO server on :${PORT} (auth token required)`);
});
