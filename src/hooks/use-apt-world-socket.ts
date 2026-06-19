"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type { RemoteWorldPlayer } from "@/lib/apt/house/remote-players-layer";

export function useAptWorldSocket(lat: number, lng: number) {
  const { socket, socketReady } = useAppSocket();
  const { data: session } = useSession();
  const [peers, setPeers] = useState<RemoteWorldPlayer[]>([]);
  const joined = useRef(false);

  const emitMove = useCallback(
    (x: number, z: number, mode: string, activity: string) => {
      if (!socket?.connected) return;
      socket.emit("apt_world_move", { x, z, mode, activity });
    },
    [socket]
  );

  useEffect(() => {
    if (!socket || !socketReady || !session?.user?.id) return;

    const username = session.user.name ?? session.user.username ?? "유저";

    const onJoin = (p: RemoteWorldPlayer) => {
      setPeers((prev) => (prev.some((x) => x.userId === p.userId) ? prev : [...prev, p]));
    };
    const onMove = (p: RemoteWorldPlayer) => {
      setPeers((prev) => prev.map((x) => (x.userId === p.userId ? { ...x, ...p } : x)));
    };
    const onLeave = ({ userId }: { userId: string }) => {
      setPeers((prev) => prev.filter((x) => x.userId !== userId));
    };

    socket.on("apt_world_peer_join", onJoin);
    socket.on("apt_world_peer_move", onMove);
    socket.on("apt_world_peer_leave", onLeave);

    if (!joined.current) {
      joined.current = true;
      socket.emit("apt_world_join", { lat, lng, username }, (res: { ok?: boolean; peers?: RemoteWorldPlayer[] }) => {
        if (res?.peers) setPeers(res.peers);
      });
    }

    return () => {
      socket.off("apt_world_peer_join", onJoin);
      socket.off("apt_world_peer_move", onMove);
      socket.off("apt_world_peer_leave", onLeave);
      if (joined.current) {
        socket.emit("apt_world_leave");
        joined.current = false;
      }
      setPeers([]);
    };
  }, [socket, socketReady, session, lat, lng]);

  return { peers, emitMove };
}
