/**
 * Disk + memory bootstrap for DM inbox / rooms — Instagram-class tab open.
 * Show last snapshot instantly while network refresh runs.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DmInboxRoom, DmRoomPayload } from "@/api/messages";

const INBOX_KEY = "mocomo.mobile-dm-inbox.v1";
const ROOM_KEY_PREFIX = "mocomo.mobile-dm-room.v1:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHED_ROOMS = 24;

export const dmRoomQueryKey = (roomId: string) => ["mobile-dm-room", roomId] as const;

type InboxStored = {
  savedAt: number;
  rooms: DmInboxRoom[];
};

type RoomStored = {
  savedAt: number;
  payload: DmRoomPayload;
};

const memoryInbox: { data: { rooms: DmInboxRoom[] } | null } = { data: null };
const memoryRooms = new Map<string, DmRoomPayload>();
const roomLru: string[] = [];

function touchRoomLru(roomId: string) {
  const i = roomLru.indexOf(roomId);
  if (i >= 0) roomLru.splice(i, 1);
  roomLru.push(roomId);
  while (roomLru.length > MAX_CACHED_ROOMS) {
    const evict = roomLru.shift();
    if (evict) {
      memoryRooms.delete(evict);
      void AsyncStorage.removeItem(ROOM_KEY_PREFIX + evict).catch(() => undefined);
    }
  }
}

export function getDmInboxMemory(): { rooms: DmInboxRoom[] } | null {
  return memoryInbox.data;
}

export function getDmRoomMemory(roomId: string): DmRoomPayload | null {
  return memoryRooms.get(roomId) ?? null;
}

export async function loadDmInboxBootstrap(): Promise<{ rooms: DmInboxRoom[] } | null> {
  if (memoryInbox.data?.rooms) return memoryInbox.data;
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InboxStored;
    if (!Array.isArray(parsed?.rooms) || parsed.rooms.length === 0) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    memoryInbox.data = { rooms: parsed.rooms };
    return memoryInbox.data;
  } catch {
    return null;
  }
}

/** Drop the unread flag locally so the mailbox closes as soon as the room is opened. */
export function markDmInboxRoomRead(roomId: string) {
  const current = memoryInbox.data;
  if (!current) return;
  const target = current.rooms.find((room) => room.id === roomId);
  if (!target?.unread) return;
  const rooms = current.rooms.map((room) =>
    room.id === roomId ? { ...room, unread: false } : room
  );
  void saveDmInboxBootstrap(rooms);
}

export async function saveDmInboxBootstrap(rooms: DmInboxRoom[]): Promise<void> {
  memoryInbox.data = { rooms };
  try {
    const payload: InboxStored = { savedAt: Date.now(), rooms };
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(payload));
  } catch {
    // Disk full / private mode — memory still helps this session
  }
}

export async function loadDmRoomBootstrap(roomId: string): Promise<DmRoomPayload | null> {
  const mem = memoryRooms.get(roomId);
  if (mem) {
    touchRoomLru(roomId);
    return mem;
  }
  try {
    const raw = await AsyncStorage.getItem(ROOM_KEY_PREFIX + roomId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomStored;
    if (!parsed?.payload?.room?.id || !Array.isArray(parsed.payload.messages)) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    memoryRooms.set(roomId, parsed.payload);
    touchRoomLru(roomId);
    return parsed.payload;
  } catch {
    return null;
  }
}

export async function saveDmRoomBootstrap(roomId: string, payload: DmRoomPayload): Promise<void> {
  memoryRooms.set(roomId, payload);
  touchRoomLru(roomId);
  try {
    const stored: RoomStored = { savedAt: Date.now(), payload };
    await AsyncStorage.setItem(ROOM_KEY_PREFIX + roomId, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export async function clearDmBootstrap(): Promise<void> {
  memoryInbox.data = null;
  memoryRooms.clear();
  roomLru.length = 0;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dmKeys = keys.filter((k) => k === INBOX_KEY || k.startsWith(ROOM_KEY_PREFIX));
    if (dmKeys.length) await AsyncStorage.multiRemove(dmKeys);
  } catch {
    // ignore
  }
}
