"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import type { RemoteHomePlayer } from "@/lib/apt/bondee/remote-chibi-players-layer";
import type { InstrumentKind } from "@/lib/apt/bondee/instruments/types";
import type { AptHomeInstrumentNote } from "@/lib/apt/home-socket-types";

export function useAptHomeSocket(homeOwnerId: string | null) {
  const { socket, socketReady } = useAppSocket();
  const { data: session } = useSession();
  const [peers, setPeers] = useState<RemoteHomePlayer[]>([]);
  const joined = useRef(false);
  const ownerRef = useRef(homeOwnerId);
  ownerRef.current = homeOwnerId;

  const remoteNoteHandlers = useRef<Set<(note: AptHomeInstrumentNote) => void>>(new Set());

  const onRemoteNote = useCallback((handler: (note: AptHomeInstrumentNote) => void) => {
    remoteNoteHandlers.current.add(handler);
    return () => remoteNoteHandlers.current.delete(handler);
  }, []);

  const emitMove = useCallback(
    (x: number, z: number, pose: string, activity: string) => {
      if (!socket?.connected) return;
      socket.emit("apt_home_move", { x, z, pose, activity });
    },
    [socket]
  );

  const emitInstrumentNote = useCallback(
    (kind: InstrumentKind, midi: number, padIndex?: number) => {
      if (!socket?.connected || !ownerRef.current) return;
      socket.emit("apt_home_instrument_note", {
        kind,
        midi,
        padIndex,
        homeOwnerId: ownerRef.current,
      });
    },
    [socket]
  );

  useEffect(() => {
    if (!socket || !socketReady || !session?.user?.id || !homeOwnerId) return;

    const username = session.user.name ?? session.user.username ?? "유저";

    const onJoin = (p: RemoteHomePlayer) => {
      setPeers((prev) => (prev.some((x) => x.userId === p.userId) ? prev : [...prev, p]));
    };
    const onMove = (p: RemoteHomePlayer) => {
      setPeers((prev) => prev.map((x) => (x.userId === p.userId ? { ...x, ...p } : x)));
    };
    const onLeave = ({ userId }: { userId: string }) => {
      setPeers((prev) => prev.filter((x) => x.userId !== userId));
    };
    const onNote = (note: AptHomeInstrumentNote) => {
      if (note.userId === session.user.id) return;
      for (const h of remoteNoteHandlers.current) h(note);
    };

    socket.on("apt_home_peer_join", onJoin);
    socket.on("apt_home_peer_move", onMove);
    socket.on("apt_home_peer_leave", onLeave);
    socket.on("apt_home_instrument_note", onNote);

    if (!joined.current) {
      joined.current = true;
      socket.emit("apt_home_join", { homeOwnerId, username }, (res: { ok?: boolean; peers?: RemoteHomePlayer[] }) => {
        if (res?.peers) setPeers(res.peers);
      });
    }

    return () => {
      socket.off("apt_home_peer_join", onJoin);
      socket.off("apt_home_peer_move", onMove);
      socket.off("apt_home_peer_leave", onLeave);
      socket.off("apt_home_instrument_note", onNote);
      if (joined.current) {
        socket.emit("apt_home_leave");
        joined.current = false;
      }
      setPeers([]);
    };
  }, [socket, socketReady, session, homeOwnerId]);

  return { peers, emitMove, emitInstrumentNote, onRemoteNote };
}
