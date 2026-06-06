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
import type { PresenceChangePayload, RoomPresencePayload } from "@/lib/chat-presence";
import { useAppSocket } from "@/components/providers/app-socket-provider";

type ChatSocketContextValue = {
  socket: ReturnType<typeof useAppSocket>["socket"];
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
  const { socket, socketReady, realtimeOff } = useAppSocket();
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
    if (!socket) {
      setOnlineUserIds(new Set());
      return;
    }

    const joinRoom = () => {
      socket.emit("join_room", roomId);
    };

    const onRoomPresence = (payload: RoomPresencePayload) => {
      if (!Array.isArray(payload?.onlineUserIds)) return;
      setOnlineUserIds(new Set(payload.onlineUserIds.filter(Boolean)));
    };

    const onPresenceChange = (payload: PresenceChangePayload) => {
      if (!payload?.userId) return;
      if (payload.roomId && payload.roomId !== roomId) return;
      applyPresence(payload.userId, !!payload.online);
    };

    const onNewMessage = (msg: unknown) => {
      messageHandlersRef.current.forEach((h) => h(msg));
    };

    const onConnect = () => {
      joinRoom();
    };

    socket.on("connect", onConnect);
    socket.on("room_presence", onRoomPresence);
    socket.on("presence_change", onPresenceChange);
    socket.on("new_message", onNewMessage);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("room_presence", onRoomPresence);
      socket.off("presence_change", onPresenceChange);
      socket.off("new_message", onNewMessage);
      socket.emit("leave_room", roomId);
    };
  }, [socket, roomId, applyPresence]);

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
