import type { Server, Socket } from "socket.io";

export type AptWorldPeer = {
  userId: string;
  username: string;
  x: number;
  z: number;
  mode: string;
  activity: string;
  regionKey: string;
  socketId: string;
};

const peers = new Map<string, AptWorldPeer>();

function regionKey(lat: number, lng: number) {
  return `${Math.floor(lat * 2)}_${Math.floor(lng * 2)}`;
}

function roomFor(key: string) {
  return `apt:world:${key}`;
}

function snapshotFor(key: string, excludeUserId?: string): AptWorldPeer[] {
  return [...peers.values()].filter((p) => p.regionKey === key && p.userId !== excludeUserId);
}

export function registerAptWorldHandlers(io: Server, socket: Socket, userId: string) {
  socket.on(
    "apt_world_join",
    (
      data: { lat?: number; lng?: number; username?: string },
      ack?: (r: { ok: boolean; peers?: AptWorldPeer[] }) => void
    ) => {
      const lat = Number(data?.lat) || 37.5;
      const lng = Number(data?.lng) || 127;
      const username = (data?.username || "유저").slice(0, 24);
      const key = regionKey(lat, lng);

      const prev = peers.get(userId);
      if (prev) socket.leave(roomFor(prev.regionKey));

      const peer: AptWorldPeer = {
        userId,
        username,
        x: 0,
        z: 2,
        mode: "explore",
        activity: "idle",
        regionKey: key,
        socketId: socket.id,
      };
      peers.set(userId, peer);
      socket.join(roomFor(key));

      const list = snapshotFor(key, userId);
      socket.to(roomFor(key)).emit("apt_world_peer_join", peer);
      ack?.({ ok: true, peers: list });
    }
  );

  socket.on(
    "apt_world_move",
    (data: { x?: number; z?: number; mode?: string; activity?: string }) => {
      const peer = peers.get(userId);
      if (!peer) return;
      peer.x = Number(data?.x) || peer.x;
      peer.z = Number(data?.z) || peer.z;
      peer.mode = (data?.mode || peer.mode).slice(0, 24);
      peer.activity = (data?.activity || peer.activity).slice(0, 24);
      socket.to(roomFor(peer.regionKey)).emit("apt_world_peer_move", {
        userId: peer.userId,
        username: peer.username,
        x: peer.x,
        z: peer.z,
        mode: peer.mode,
        activity: peer.activity,
      });
    }
  );

  socket.on("apt_world_leave", () => {
    const peer = peers.get(userId);
    if (!peer) return;
    socket.to(roomFor(peer.regionKey)).emit("apt_world_peer_leave", { userId });
    socket.leave(roomFor(peer.regionKey));
    peers.delete(userId);
  });

  socket.on("disconnect", () => {
    const peer = peers.get(userId);
    if (!peer) return;
    io.to(roomFor(peer.regionKey)).emit("apt_world_peer_leave", { userId });
    peers.delete(userId);
  });
}
