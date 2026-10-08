import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import { fetchMobileSocketAuthToken } from "@/api/calls";
import { getAccessToken } from "@/auth/token-store";

type InboxUpdate = {
  roomId?: string;
  senderId?: string | null;
};

type InboxHandler = (update: InboxUpdate) => void;
type CallSignalHandler = (fromUserId: string, callId: string, payload: unknown) => void;
type CallIncomingHandler = (callId: string) => void;
export type PresenceChange = { userId: string; online: boolean; roomId?: string };
type PresenceHandler = (change: PresenceChange) => void;
type PresenceSnapshotHandler = (
  onlineUserIds: string[],
  mode: "merge" | "replace"
) => void;

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;
const handlers = new Set<InboxHandler>();
const callSignalHandlers = new Set<CallSignalHandler>();
const callIncomingHandlers = new Set<CallIncomingHandler>();
const presenceHandlers = new Set<PresenceHandler>();
const snapshotHandlers = new Set<PresenceSnapshotHandler>();
const onlineUserIds = new Set<string>();

export function getCachedOnlineUserIds(): ReadonlySet<string> {
  return onlineUserIds;
}

function applyPresenceChange(userId: string, online: boolean, roomId?: string) {
  if (online) onlineUserIds.add(userId);
  else onlineUserIds.delete(userId);
  const change: PresenceChange = { userId, online, roomId };
  for (const handler of presenceHandlers) handler(change);
}

function applyPresenceSnapshot(ids: string[], mode: "merge" | "replace" = "merge") {
  if (mode === "replace") onlineUserIds.clear();
  for (const id of ids) {
    if (!id) continue;
    onlineUserIds.add(id);
  }
  const snapshot = [...onlineUserIds];
  for (const handler of snapshotHandlers) handler(snapshot, mode);
}

function attachInboxListener(next: Socket) {
  next.off("inbox_update");
  next.on("inbox_update", (payload: InboxUpdate) => {
    if (!payload?.roomId) return;
    for (const handler of handlers) handler(payload);
  });
  next.off("call_signal");
  next.on(
    "call_signal",
    (msg: { callId?: string; fromUserId?: string; payload?: unknown }) => {
      if (!msg?.callId || !msg.fromUserId || !msg.payload) return;
      for (const handler of callSignalHandlers) handler(msg.fromUserId, msg.callId, msg.payload);
    }
  );
  next.off("call_incoming");
  next.on("call_incoming", (call: { id?: string }) => {
    if (!call?.id) return;
    for (const handler of callIncomingHandlers) handler(call.id);
  });
  next.off("presence_change");
  next.on(
    "presence_change",
    (payload: { userId?: string; online?: boolean; roomId?: string }) => {
      if (!payload?.userId) return;
      applyPresenceChange(payload.userId, !!payload.online, payload.roomId);
    }
  );
  next.off("presence_snapshot");
  next.off("room_presence");
  const onSnapshot = (payload: { onlineUserIds?: string[] }) => {
    if (!Array.isArray(payload?.onlineUserIds)) return;
    applyPresenceSnapshot(payload.onlineUserIds.filter(Boolean));
  };
  next.on("presence_snapshot", onSnapshot);
  next.on("room_presence", onSnapshot);
  next.off("disconnect", onSocketDisconnect);
  next.on("disconnect", onSocketDisconnect);
}

function onSocketDisconnect() {
  applyPresenceSnapshot([], "replace");
}

async function connectInboxSocket(): Promise<Socket | null> {
  if (!SOCKET_URL) return null;
  if (socket?.connected) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const bearer = await getAccessToken();
    if (!bearer) return null;
    const authRes = await fetchMobileSocketAuthToken().catch(() => null);
    if (!authRes?.token) return null;

    return await new Promise<Socket | null>((resolve) => {
      const next = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        auth: { token: authRes.token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 400,
        reconnectionDelayMax: 4000,
      });
      const timer = setTimeout(() => {
        if (!next.connected) {
          next.disconnect();
          resolve(null);
        }
      }, 8000);
      next.on("connect", () => {
        clearTimeout(timer);
        socket = next;
        attachInboxListener(next);
        resolve(next);
      });
      next.on("connect_error", () => {
        /* reconnection handles retry */
      });
    });
  })().finally(() => {
    connecting = null;
  });

  return connecting;
}

export function subscribeInboxUpdates(handler: InboxHandler) {
  handlers.add(handler);
  void connectInboxSocket().catch(() => undefined);
  return () => {
    handlers.delete(handler);
  };
}

export function subscribeCallSignals(handler: CallSignalHandler) {
  callSignalHandlers.add(handler);
  void connectInboxSocket().catch(() => undefined);
  return () => {
    callSignalHandlers.delete(handler);
  };
}

export function subscribeIncomingCallSocket(handler: CallIncomingHandler) {
  callIncomingHandlers.add(handler);
  void connectInboxSocket().catch(() => undefined);
  return () => {
    callIncomingHandlers.delete(handler);
  };
}

export function subscribePresence(handler: PresenceHandler) {
  presenceHandlers.add(handler);
  void connectInboxSocket().catch(() => undefined);
  return () => {
    presenceHandlers.delete(handler);
  };
}

export function subscribePresenceSnapshot(handler: PresenceSnapshotHandler) {
  snapshotHandlers.add(handler);
  handler([...onlineUserIds], "replace");
  void connectInboxSocket().catch(() => undefined);
  return () => {
    snapshotHandlers.delete(handler);
  };
}

export function emitJoinPresenceRoom(roomId: string) {
  if (!roomId) return;
  emitWhenReady((sock) => {
    sock.emit("join_room", roomId);
  });
}

export function emitLeavePresenceRoom(roomId: string) {
  if (!roomId || !socket?.connected) return;
  socket.emit("leave_room", roomId);
}

export async function ensureInboxSocket() {
  return connectInboxSocket();
}

function emitWhenReady(run: (sock: Socket) => void) {
  void connectInboxSocket().then((sock) => {
    if (!sock?.connected) return;
    run(sock);
  });
}

export function emitAppCallSignal(callId: string, toUserId: string, payload: unknown) {
  if (!callId || !toUserId) return;
  emitWhenReady((sock) => {
    sock.emit("call_signal", { callId, toUserId, payload });
  });
}

export function emitAppCallInvite(callId: string, call: unknown) {
  if (!callId) return;
  emitWhenReady((sock) => {
    sock.emit("call_invite", { callId, call });
  });
}

export function emitAppCallAccept(callId: string, callerId: string, calleeId: string) {
  if (!callId) return;
  emitWhenReady((sock) => {
    sock.emit("call_accept", { callId, callerId, calleeId });
  });
}

export function disconnectInboxSocket() {
  handlers.clear();
  callSignalHandlers.clear();
  callIncomingHandlers.clear();
  presenceHandlers.clear();
  snapshotHandlers.clear();
  onlineUserIds.clear();
  socket?.disconnect();
  socket = null;
  connecting = null;
}
