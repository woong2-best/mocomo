import type { Server, Socket } from "socket.io";

import type { AptHomeInstrumentNote, AptHomePeerDto } from "@/lib/apt/home-socket-types";

export type AptHomePeer = AptHomePeerDto & { socketId: string };

const homePeers = new Map<string, AptHomePeer>();

function homeRoomFor(ownerId: string) {
  return `apt:home:${ownerId}`;
}

function homeSnapshot(ownerId: string, excludeUserId?: string): AptHomePeer[] {
  return [...homePeers.values()].filter(
    (p) => p.homeOwnerId === ownerId && p.userId !== excludeUserId
  );
}

export function registerAptHomeHandlers(io: Server, socket: Socket, userId: string) {
  socket.on(
    "apt_home_join",
    (
      data: { homeOwnerId?: string; username?: string; x?: number; z?: number },
      ack?: (r: { ok: boolean; peers?: AptHomePeer[] }) => void
    ) => {
      const homeOwnerId = (data?.homeOwnerId || userId).slice(0, 64);
      const username = (data?.username || "유저").slice(0, 24);

      const prev = homePeers.get(userId);
      if (prev) socket.leave(homeRoomFor(prev.homeOwnerId));

      const peer: AptHomePeer = {
        userId,
        username,
        x: Number(data?.x) || 0,
        z: Number(data?.z) || 0,
        pose: "stand",
        activity: "idle",
        homeOwnerId,
        socketId: socket.id,
      };
      homePeers.set(userId, peer);
      socket.join(homeRoomFor(homeOwnerId));

      const list = homeSnapshot(homeOwnerId, userId);
      socket.to(homeRoomFor(homeOwnerId)).emit("apt_home_peer_join", peer);
      ack?.({ ok: true, peers: list });
    }
  );

  socket.on(
    "apt_home_move",
    (data: { x?: number; z?: number; pose?: string; activity?: string }) => {
      const peer = homePeers.get(userId);
      if (!peer) return;
      peer.x = Number(data?.x) ?? peer.x;
      peer.z = Number(data?.z) ?? peer.z;
      peer.pose = (data?.pose || peer.pose).slice(0, 24);
      peer.activity = (data?.activity || peer.activity).slice(0, 24);
      socket.to(homeRoomFor(peer.homeOwnerId)).emit("apt_home_peer_move", {
        userId: peer.userId,
        username: peer.username,
        x: peer.x,
        z: peer.z,
        pose: peer.pose,
        activity: peer.activity,
      });
    }
  );

  socket.on(
    "apt_home_instrument_note",
    (data: { kind?: string; midi?: number; padIndex?: number; homeOwnerId?: string }) => {
      const peer = homePeers.get(userId);
      if (!peer) return;
      const payload: AptHomeInstrumentNote = {
        userId: peer.userId,
        username: peer.username,
        kind: (data?.kind || "piano").slice(0, 32),
        midi: Number(data?.midi) || 60,
        padIndex: data?.padIndex,
        homeOwnerId: peer.homeOwnerId,
      };
      socket.to(homeRoomFor(peer.homeOwnerId)).emit("apt_home_instrument_note", payload);
    }
  );

  socket.on("apt_home_leave", () => {
    const peer = homePeers.get(userId);
    if (!peer) return;
    socket.to(homeRoomFor(peer.homeOwnerId)).emit("apt_home_peer_leave", { userId });
    socket.leave(homeRoomFor(peer.homeOwnerId));
    homePeers.delete(userId);
  });

  const onDisconnect = () => {
    const peer = homePeers.get(userId);
    if (!peer) return;
    io.to(homeRoomFor(peer.homeOwnerId)).emit("apt_home_peer_leave", { userId });
    homePeers.delete(userId);
  };

  socket.on("disconnect", onDisconnect);
}
