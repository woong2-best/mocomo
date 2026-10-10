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
import { usePathname } from "next/navigation";
import type { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type { PresenceChangePayload, RoomPresencePayload } from "@/lib/chat-presence";
import { needsImmediateRealtime } from "@/lib/hub-fast-path";
import { resolveSocketUrl } from "@/lib/socket-url";
import {
  SOCKET_CONNECT_TIMEOUT_MS,
  SOCKET_IO_TIMEOUT_MS,
  wakeSocketServer,
} from "@/lib/socket-timing";

const CONNECT_TIMEOUT_MS = SOCKET_CONNECT_TIMEOUT_MS;

type AppSocketContextValue = {
  socket: Socket | null;
  socketReady: boolean;
  realtimeOff: boolean;
  connectionFailed: boolean;
  onlineUserIds: ReadonlySet<string>;
  isUserOnline: (userId: string) => boolean;
};

const AppSocketContext = createContext<AppSocketContextValue>({
  socket: null,
  socketReady: false,
  realtimeOff: true,
  connectionFailed: false,
  onlineUserIds: new Set(),
  isUserOnline: () => false,
});

/** 허브 화면: cold-start wake는 백그라운드, 소켓 연결은 즉시 (통화 수신 보장) */
async function prepareSocketServer(socketUrl: string, immediate: boolean): Promise<void> {
  if (immediate) {
    await wakeSocketServer(socketUrl);
    return;
  }
  void wakeSocketServer(socketUrl);
}

/** 로그인 사용자 — 앱 어디서든 접속 중 표시·실시간 채팅용 단일 소켓 */
export function AppSocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? "";
  const immediateRealtime = needsImmediateRealtime(pathname);
  const userId = session?.user?.id;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [realtimeOff, setRealtimeOff] = useState(() => !resolveSocketUrl());
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());

  const applyPresenceChange = useCallback((userId: string, online: boolean) => {
    setOnlineUserIds((prev) => {
      const has = prev.has(userId);
      if (online === has) return prev;
      const next = new Set(prev);
      if (online) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const mergeOnlineIds = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setOnlineUserIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (!id || next.has(id)) continue;
        next.add(id);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    const socketUrl = resolveSocketUrl();
    if (!socketUrl || status !== "authenticated" || !userId) {
      setRealtimeOff(true);
      setConnectionFailed(false);
      setSocketReady(false);
      setSocket(null);
      setOnlineUserIds(new Set());
      return;
    }

    setRealtimeOff(false);
    setConnectionFailed(false);

    let disposed = false;
    let activeSocket: Socket | null = null;
    let tokenRefreshTimer: number | undefined;
    let connectTimeout: number | undefined;
    let startTimer: number | undefined;

    const start = () => {
      void import("socket.io-client").then(async ({ io }) => {
      if (disposed) return;

      await prepareSocketServer(socketUrl, needsImmediateRealtime(pathnameRef.current));
      if (disposed) return;

      const { fetchSocketAuthToken } = await import("@/lib/socket-client");
      const token = await fetchSocketAuthToken();
      if (disposed || !token) {
        setRealtimeOff(true);
        setConnectionFailed(true);
        return;
      }

      activeSocket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1200,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.4,
        timeout: SOCKET_IO_TIMEOUT_MS,
      });

      connectTimeout = window.setTimeout(() => {
        if (disposed || activeSocket?.connected) return;
        setConnectionFailed(true);
        setSocketReady(false);
      }, CONNECT_TIMEOUT_MS);

      const refreshAuth = async () => {
        const next = await fetchSocketAuthToken();
        if (!next || !activeSocket) return false;
        activeSocket.auth = { token: next };
        return true;
      };

      tokenRefreshTimer = window.setInterval(() => {
        void refreshAuth();
      }, 4 * 60 * 1000);

      const onPresenceChange = (payload: PresenceChangePayload) => {
        if (!payload?.userId) return;
        applyPresenceChange(payload.userId, !!payload.online);
      };
      const onPresenceSnapshot = (payload: RoomPresencePayload) => {
        if (!Array.isArray(payload?.onlineUserIds)) return;
        mergeOnlineIds(payload.onlineUserIds.filter(Boolean));
      };

      activeSocket.on("presence_change", onPresenceChange);
      activeSocket.on("presence_snapshot", onPresenceSnapshot);
      activeSocket.on("room_presence", onPresenceSnapshot);

      activeSocket.on("connect", () => {
        if (disposed) return;
        if (connectTimeout) window.clearTimeout(connectTimeout);
        setConnectionFailed(false);
        setSocket(activeSocket);
        setSocketReady(true);
        setRealtimeOff(false);
      });

      activeSocket.on("disconnect", () => {
        setSocketReady(false);
        setOnlineUserIds(new Set());
      });

      activeSocket.on("connect_error", (error: { message?: string }) => {
        const rateLimited = /429|too many/i.test(String(error?.message ?? ""));
        void refreshAuth().then((ok) => {
          if (!ok || !activeSocket || activeSocket.connected) return;
          window.setTimeout(() => {
            if (!disposed && activeSocket && !activeSocket.connected) activeSocket.connect();
          }, rateLimited ? 8000 : 1500);
        });
      });

        activeSocket.io.on("reconnect", () => {
          if (disposed) return;
          setConnectionFailed(false);
          setSocketReady(true);
          setRealtimeOff(false);
        });
      });
    };

    if (immediateRealtime) {
      start();
    } else {
      startTimer = window.setTimeout(start, 2500);
    }

    return () => {
      disposed = true;
      if (startTimer) window.clearTimeout(startTimer);
      if (tokenRefreshTimer) window.clearInterval(tokenRefreshTimer);
      if (connectTimeout) window.clearTimeout(connectTimeout);
      setSocketReady(false);
      setSocket(null);
      setOnlineUserIds(new Set());
      activeSocket?.disconnect();
    };
    // Do not depend on pathname / immediateRealtime — reconnecting on every
    // hub↔chat navigation marked the user offline and wiped presence.
  }, [userId, status, applyPresenceChange, mergeOnlineIds]);

  const isUserOnline = useCallback(
    (id: string) => onlineUserIds.has(id),
    [onlineUserIds]
  );

  const value = useMemo(
    () => ({
      socket,
      socketReady,
      realtimeOff,
      connectionFailed,
      onlineUserIds,
      isUserOnline,
    }),
    [socket, socketReady, realtimeOff, connectionFailed, onlineUserIds, isUserOnline]
  );

  return <AppSocketContext.Provider value={value}>{children}</AppSocketContext.Provider>;
}

export function useAppSocket() {
  return useContext(AppSocketContext);
}
