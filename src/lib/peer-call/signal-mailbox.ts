import { Redis } from "@upstash/redis";
import type { CallSignalPayload } from "@/lib/peer-call/types";

export type MailboxSignal = {
  id: string;
  fromUserId: string;
  payload: CallSignalPayload;
};

type StoredSignal = MailboxSignal & { at: number };

const memory = new Map<string, StoredSignal[]>();
const MAX_SIGNALS = 80;
const TTL_MS = 120_000;

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function key(callId: string) {
  return `call-sig:${callId}`;
}

function prune(list: StoredSignal[], now = Date.now()) {
  const fresh = list.filter((item) => now - item.at < TTL_MS).slice(-MAX_SIGNALS);
  return fresh;
}

export async function pushCallSignal(
  callId: string,
  fromUserId: string,
  payload: CallSignalPayload
): Promise<void> {
  const item: StoredSignal = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    fromUserId,
    payload,
    at: Date.now(),
  };

  const kv = redis();
  if (kv) {
    const list = prune(((await kv.get<StoredSignal[]>(key(callId))) ?? []).concat(item));
    await kv.set(key(callId), list, { px: TTL_MS });
    return;
  }

  memory.set(callId, prune((memory.get(callId) ?? []).concat(item)));
}

export async function listCallSignals(callId: string, afterId?: string | null): Promise<MailboxSignal[]> {
  const kv = redis();
  const list = prune(kv ? ((await kv.get<StoredSignal[]>(key(callId))) ?? []) : (memory.get(callId) ?? []));
  if (!kv) memory.set(callId, list);

  if (!afterId) return list.map(({ id, fromUserId, payload }) => ({ id, fromUserId, payload }));
  const idx = list.findIndex((item) => item.id === afterId);
  const slice = idx >= 0 ? list.slice(idx + 1) : list;
  return slice.map(({ id, fromUserId, payload }) => ({ id, fromUserId, payload }));
}
