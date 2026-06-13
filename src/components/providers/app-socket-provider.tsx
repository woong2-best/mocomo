"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
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
};

const AppSocketContext = createContext<AppSocketContextValue>({
  socket: null,
  socketReady: false,
  realtimeOff: true,
  connectionFailed: false,
});

/** 로그인 사용자 — 앱 어디서든 접속 중 표시·실시간 채팅용 단일 소켓 */
export function AppSocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [realtimeOff, setRealtimeOff] = useState(() => !resolveSocketUrl());
  const [connectionFailed, setConnectionFailed] = useState(false);

  useEffect(() => {
    const socketUrl = resolveSocketUrl();
    if (!socketUrl || status !== "authenticated" || !userId) {
      setRealtimeOff(true);
      setConnectionFailed(false);
      setSocketReady(false);
      setSocket(null);
      return;
    }

    setRealtimeOff(false);
    setConnectionFailed(false);

    let disposed = false;
    let activeSocket: Socket | null = null;
    let tokenRefreshTimer: number | undefined;
    let connectTimeout: number | undefined;

    import("socket.io-client").then(async ({ io }) => {
      if (disposed) return;
      await wakeSocketServer(socketUrl);
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
        reconnectionDelay: 600,
        reconnectionDelayMax: 3000,
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
      });

      activeSocket.on("connect_error", () => {
        void refreshAuth().then((ok) => {
          if (ok && activeSocket && !activeSocket.connected) {
            activeSocket.connect();
          }
        });
      });

      activeSocket.io.on("reconnect", () => {
        if (disposed) return;
        setConnectionFailed(false);
        setSocketReady(true);
        setRealtimeOff(false);
      });
    });

    return () => {
      disposed = true;
      if (tokenRefreshTimer) window.clearInterval(tokenRefreshTimer);
      if (connectTimeout) window.clearTimeout(connectTimeout);
      setSocketReady(false);
      setSocket(null);
      activeSocket?.disconnect();
    };
  }, [userId, status]);

  const value = useMemo(
    () => ({ socket, socketReady, realtimeOff, connectionFailed }),
    [socket, socketReady, realtimeOff, connectionFailed]
  );

  return <AppSocketContext.Provider value={value}>{children}</AppSocketContext.Provider>;
}

export function useAppSocket() {
  return useContext(AppSocketContext);
}
