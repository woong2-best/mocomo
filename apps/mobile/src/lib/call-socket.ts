import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import { fetchMobileSocketAuthToken } from "@/api/calls";
import { getAccessToken } from "@/auth/token-store";

let socketPromise: Promise<Socket | null> | null = null;

export async function getCallSocket(): Promise<Socket | null> {
  if (!SOCKET_URL) return null;
  if (!socketPromise) {
    socketPromise = connectCallSocket();
  }
  return socketPromise;
}

async function connectCallSocket(): Promise<Socket | null> {
  const bearer = await getAccessToken();
  if (!bearer) return null;

  const authRes = await fetchMobileSocketAuthToken().catch(() => null);
  if (!authRes?.token) return null;

  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token: authRes.token },
      reconnection: true,
      reconnectionAttempts: 8,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      resolve(null);
    }, 12_000);

    socket.on("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on("connect_error", () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

export function emitCallSignal(
  socket: Socket,
  callId: string,
  toUserId: string,
  payload: unknown
) {
  socket.emit("call_signal", { callId, toUserId, payload });
}

export function emitCallAccept(
  socket: Socket,
  callId: string,
  callerId: string,
  calleeId: string
) {
  socket.emit("call_accept", { callId, callerId, calleeId });
}

export function emitCallInvite(socket: Socket, call: unknown) {
  const payload = call as { id: string };
  socket.emit("call_invite", { callId: payload.id, call });
}
