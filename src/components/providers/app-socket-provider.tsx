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
  socketRetryDelayMs,
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
    let holdTimer: number | undefined;
    let failures = 0;

    const scheduleRetry = () => {
      if (holdTimer) window.clearTimeout(holdTimer);
      const delay = socketRetryDelayMs(failures);
      failures += 1;
      holdTimer = window.setTimeout(() => {
        if (disposed) return;
        start();
      }, delay);
    };

    const start = () => {
      void import("socket.io-client").then(async ({ io }) => {
        if (disposed) return;

        const { fetchSocketAuthToken } = await import("@/lib/socket-client");
        const token = await fetchSocketAuthToken();
        if (disposed) return;
        if (!token) {
          setConnectionFailed(true);
          scheduleRetry();
          return;
        }

        if (activeSocket) {
          activeSocket.removeAllListeners();
          activeSocket.close();
          activeSocket = null;
        }

        const socket = io(socketUrl, {
          auth: { token },
          // WebSocket only. Polling retries Render 503s as XHRs, the 503 page has no
          // CORS header, and the client then hammers until Render answers 429.
          transports: ["websocket"],
          reconnection: false,
          timeout: SOCKET_IO_TIMEOUT_MS,
        });
        activeSocket = socket;
        let gaveUp = false;

        const fail = () => {
          if (disposed || gaveUp || socket.connected) return;
          gaveUp = true;
          if (connectTimeout) window.clearTimeout(connectTimeout);
          setConnectionFailed(true);
          setSocketReady(false);
          setSocket((current) => (current === socket ? null : current));
          socket.removeAllListeners();
          socket.close();
          if (activeSocket === socket) activeSocket = null;
          scheduleRetry();
        };

        connectTimeout = window.setTimeout(() => {
          if (disposed || socket.connected) return;
          fail();
        }, CONNECT_TIMEOUT_MS);

        if (tokenRefreshTimer) window.clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = window.setInterval(() => {
          void fetchSocketAuthToken().then((next) => {
            if (!next || !activeSocket || activeSocket !== socket) return;
            activeSocket.auth = { token: next };
          });
        }, 4 * 60 * 1000);

        const onPresenceChange = (payload: PresenceChangePayload) => {
          if (!payload?.userId) return;
          applyPresenceChange(payload.userId, !!payload.online);
        };
        const onPresenceSnapshot = (payload: RoomPresencePayload) => {
          if (!Array.isArray(payload?.onlineUserIds)) return;
          mergeOnlineIds(payload.onlineUserIds.filter(Boolean));
        };

        socket.on("presence_change", onPresenceChange);
        socket.on("presence_snapshot", onPresenceSnapshot);
        socket.on("room_presence", onPresenceSnapshot);

        socket.on("connect", () => {
          if (disposed) return;
          failures = 0;
          if (connectTimeout) window.clearTimeout(connectTimeout);
          setConnectionFailed(false);
          setSocket(socket);
          setSocketReady(true);
          setRealtimeOff(false);
        });

        socket.on("disconnect", (reason) => {
          setSocketReady(false);
          setOnlineUserIds(new Set());
          if (reason === "io client disconnect") return;
          fail();
        });

        socket.on("connect_error", () => {
          fail();
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
      if (holdTimer) window.clearTimeout(holdTimer);
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
