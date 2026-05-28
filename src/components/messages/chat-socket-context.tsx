"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import type { PresenceChangePayload, RoomPresencePayload } from "@/lib/chat-presence";

type ChatSocketContextValue = {
  socket: Socket | null;
  socketReady: boolean;
  realtimeOff: boolean;
  onlineUserIds: ReadonlySet<string>;
  isUserOnline: (userId: string) => boolean;
  subscribeMessages: (handler: (msg: unknown) => void) => () => void;
};

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

export function ChatSocketProvider({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [realtimeOff, setRealtimeOff] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const messageHandlersRef = useRef<Set<(msg: unknown) => void>>(new Set());

  const applyPresence = useCallback((userId: string, online: boolean) => {
    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      if (online) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const subscribeMessages = useCallback((handler: (msg: unknown) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url || url.includes("localhost")) {
      setRealtimeOff(true);
      setSocketReady(false);
      setSocket(null);
      return;
    }

    let disposed = false;
    let activeSocket: Socket | null = null;

    import("socket.io-client").then(async ({ io }) => {
      if (disposed) return;
      const { fetchSocketAuthToken } = await import("@/lib/socket-client");
      const token = await fetchSocketAuthToken();
      if (disposed || !token) {
        setRealtimeOff(true);
        return;
      }

      activeSocket = io(url, { auth: { token }, transports: ["websocket", "polling"] });

      activeSocket.on("connect", () => {
        if (disposed) return;
        setSocket(activeSocket);
        setSocketReady(true);
        setRealtimeOff(false);
        activeSocket?.emit("join_room", roomId);
      });

      activeSocket.on("disconnect", () => {
        setSocketReady(false);
      });

      activeSocket.on("room_presence", (payload: RoomPresencePayload) => {
        if (disposed || !Array.isArray(payload?.onlineUserIds)) return;
        setOnlineUserIds(new Set(payload.onlineUserIds.filter(Boolean)));
      });

      activeSocket.on("presence_change", (payload: PresenceChangePayload) => {
        if (disposed || !payload?.userId) return;
        applyPresence(payload.userId, !!payload.online);
      });

      activeSocket.on("new_message", (msg: unknown) => {
        messageHandlersRef.current.forEach((h) => h(msg));
      });
    });

    return () => {
      disposed = true;
      setSocketReady(false);
      setSocket(null);
      activeSocket?.emit("leave_room", roomId);
      activeSocket?.disconnect();
    };
  }, [roomId, applyPresence]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds]
  );

  const value = useMemo(
    () => ({
      socket,
      socketReady,
      realtimeOff,
      onlineUserIds,
      isUserOnline,
      subscribeMessages,
    }),
    [socket, socketReady, realtimeOff, onlineUserIds, isUserOnline, subscribeMessages]
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    return {
      socket: null,
      socketReady: false,
      realtimeOff: true,
      onlineUserIds: new Set<string>() as ReadonlySet<string>,
      isUserOnline: () => false,
      subscribeMessages: () => () => undefined,
    };
  }
  return ctx;
}
