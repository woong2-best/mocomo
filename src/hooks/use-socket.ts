"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { fetchSocketAuthToken } from "@/lib/socket-client";

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled || !token) return;
      socket = io(url, { auth: { token }, transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId]);

  return { socket: socketRef.current, connected };
}
