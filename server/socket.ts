import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXTAUTH_URL || "http://localhost:3000", credentials: true },
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth.userId as string | undefined;
  if (userId) socket.join(`user:${userId}`);

  socket.on("join_room", (roomId: string) => {
    socket.join(`room:${roomId}`);
  });

  socket.on("leave_room", (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on("send_message", async (data: {
    roomId: string;
    senderId: string;
    content?: string;
    replyToId?: string;
    mentions?: string[];
  }) => {
    try {
      const message = await prisma.message.create({
        data: {
          roomId: data.roomId,
          senderId: data.senderId,
          content: data.content,
          replyToId: data.replyToId,
          mentions: data.mentions ?? [],
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
        io.to(`user:${mentionId}`).emit("mention", { roomId: data.roomId, message });
      }
    } catch (err) {
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("typing", (data: { roomId: string; userId: string; username: string }) => {
    socket.to(`room:${data.roomId}`).emit("typing", data);
  });

  socket.on("read_message", async (data: { messageId: string; userId: string }) => {
    await prisma.messageRead.upsert({
      where: { messageId_userId: { messageId: data.messageId, userId: data.userId } },
      create: { messageId: data.messageId, userId: data.userId },
      update: { readAt: new Date() },
    });
    socket.to(`room:${data.messageId}`).emit("message_read", data);
  });

  socket.on("voice_state", (data: {
    channelId: string;
    userId: string;
    isMuted?: boolean;
    cameraOn?: boolean;
    screenOn?: boolean;
  }) => {
    io.to(`voice:${data.channelId}`).emit("voice_state_update", data);
  });

  socket.on("join_voice", (channelId: string) => {
    socket.join(`voice:${channelId}`);
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
    socket.join(`live:${channelId}`);
    emitLiveViewers(channelId);
  });

  socket.on("leave_live", (channelId: string) => {
    socket.leave(`live:${channelId}`);
    emitLiveViewers(channelId);
  });

  socket.on(
    "live_chat",
    (data: {
      channelId: string;
      userId: string;
      username: string;
      content: string;
      image?: string | null;
    }) => {
      const payload = { ...data, at: Date.now() };
      io.to(`live:${data.channelId}`).emit("live_chat_message", payload);
    }
  );

  socket.on("webrtc_signal", (data: { channelId: string; to: string; signal: unknown }) => {
    io.to(`user:${data.to}`).emit("webrtc_signal", {
      from: userId,
      channelId: data.channelId,
      signal: data.signal,
    });
  });

  socket.on("call_invite", async (data: { callId: string }) => {
    if (!userId || !data.callId) return;
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
        status: call.status,
        caller: call.caller,
        callee: call.callee,
      });
    } catch {
      socket.emit("error", { message: "Failed to invite call" });
    }
  });

  socket.on("call_accept", async (data: { callId: string }) => {
    if (!userId || !data.callId) return;
    const call = await prisma.voiceCall.findUnique({ where: { id: data.callId } });
    if (!call || call.calleeId !== userId) return;
    io.to(`user:${call.callerId}`).emit("call_accepted", { callId: data.callId });
    io.to(`user:${call.calleeId}`).emit("call_accepted", { callId: data.callId });
  });

  socket.on("call_decline", async (data: { callId: string }) => {
    if (!userId || !data.callId) return;
    const call = await prisma.voiceCall.findUnique({ where: { id: data.callId } });
    if (!call) return;
    const otherId = call.callerId === userId ? call.calleeId : call.callerId;
    io.to(`user:${otherId}`).emit("call_declined", { callId: data.callId });
  });

  socket.on("call_end", async (data: { callId: string }) => {
    if (!userId || !data.callId) return;
    const call = await prisma.voiceCall.findUnique({ where: { id: data.callId } });
    if (!call) return;
    const otherId = call.callerId === userId ? call.calleeId : call.callerId;
    io.to(`user:${otherId}`).emit("call_ended", { callId: data.callId });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[MoCoMo] Socket.IO server on :${PORT}`);
});
