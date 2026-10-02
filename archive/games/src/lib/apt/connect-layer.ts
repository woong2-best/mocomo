import type { StickerFunction } from "@/lib/diorama/sticker-types";

/** 네트워크·계정이 필요한 집 밖 상호작용 */
const NETWORK_FUNCTIONS = new Set<StickerFunction>([
  "live-tv",
  "mailbox",
  "phone",
  "community",
  "profile-edit",
]);

/** 집 안에서만 — 오프라인 OK */
const LOCAL_FUNCTIONS = new Set<StickerFunction>([
  "avatar-edit",
  "room-portal",
  "exit-corridor",
]);

export function requiresNetwork(fn: StickerFunction): boolean {
  return NETWORK_FUNCTIONS.has(fn);
}

export function isLocalHomeFunction(fn: StickerFunction): boolean {
  return LOCAL_FUNCTIONS.has(fn) || !requiresNetwork(fn);
}

export function isDeviceOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export type ConnectGateResult = { ok: true } | { ok: false; message: string };

export function gateConnectAction(
  fn: StickerFunction,
  opts?: { requireLogin?: boolean; isLoggedIn?: boolean }
): ConnectGateResult {
  if (!requiresNetwork(fn)) return { ok: true };

  if (!isDeviceOnline()) {
    return { ok: false, message: "Wi‑Fi 연결 후 이용할 수 있어요" };
  }

  if (opts?.requireLogin !== false && opts?.isLoggedIn === false) {
    return { ok: false, message: "로그인 후 이용할 수 있어요" };
  }

  return { ok: true };
}
