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

/** 허브 화면: cold-start wake는 백그라운드. 통화·메시지 경로는 헬스 확인 뒤에 연결 */
async function prepareSocketServer(socketUrl: string, immediate: boolean): Promise<void> {
  if (!immediate) {
    void wakeSocketServer(socketUrl);
    return;
  }
  const woke = await wakeSocketServer(socketUrl);
  if (woke) return;
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await wakeSocketServer(socketUrl);
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
    let holdTimer: number | undefined;
    let lastAuthRefresh = 0;

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
        // Polling first so a cold Render websocket 503 does not fill the console.
        // A healthy server still upgrades to websocket.
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2500,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
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

      activeSocket.on("connect_error", (error: { message?: string; description?: unknown }) => {
        const now = Date.now();
        if (now - lastAuthRefresh > 30_000) {
          lastAuthRefresh = now;
          void refreshAuth();
        }
        const message = String(error?.message ?? "");
        const description = error?.description;
        const status =
          typeof description === "number"
            ? description
            : description &&
                typeof description === "object" &&
                "status" in description &&
                typeof (description as { status?: unknown }).status === "number"
              ? (description as { status: number }).status
              : null;
        const rateLimited = status === 429 || /429|too many/i.test(message);
        const unavailable = status === 503 || /503|unavailable/i.test(message);
        if ((!rateLimited && !unavailable) || !activeSocket || activeSocket.connected) return;
        // Socket.IO is already retrying. A second connect() here is what turns 503 into 429.
        activeSocket.io.reconnection(false);
        if (holdTimer) window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(() => {
          if (disposed || !activeSocket || activeSocket.connected) return;
          activeSocket.io.reconnection(true);
          activeSocket.connect();
        }, rateLimited ? 30_000 : 8_000);
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
