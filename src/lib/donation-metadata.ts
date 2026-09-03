/** 후원(TIP) 결제 메타데이터 */

export type TipPaymentMetadata = {
  receiverId: string;
  message?: string;
  username?: string;
  channelId?: string;
  returnPath?: string;
  tipKind?: "standard" | "video" | "letter" | "superchat";
  roomId?: string;
  /** 영상 후원 — 결제 전 위저드에서 수집 */
  videoUrl?: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  description?: string;
  startSec?: number;
  endSec?: number;
  playToEnd?: boolean;
  durationSec?: number;
  anonymous?: boolean;
};

export function tipMetadataForCheckout(input: {
  receiverId: string;
  message?: string;
  username?: string;
  channelId?: string;
  returnPath?: string;
  tipKind?: "standard" | "video" | "letter" | "superchat";
  roomId?: string;
  videoUrl?: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  description?: string;
  startSec?: number;
  endSec?: number;
  playToEnd?: boolean;
  durationSec?: number;
  anonymous?: boolean;
}): TipPaymentMetadata {
  const meta: TipPaymentMetadata = { receiverId: input.receiverId };
  const msg = input.message?.trim();
  if (msg) meta.message = msg.slice(0, 200);
  if (input.username?.trim()) meta.username = input.username.trim();
  if (input.channelId?.trim()) meta.channelId = input.channelId.trim();
  if (input.returnPath?.startsWith("/")) meta.returnPath = input.returnPath.trim();
  if (input.roomId?.trim()) meta.roomId = input.roomId.trim();
  if (input.tipKind === "letter") {
    meta.tipKind = "letter";
  } else if (input.tipKind === "superchat") {
    meta.tipKind = "superchat";
  } else if (input.tipKind === "video") {
    meta.tipKind = "video";
    if (input.videoUrl?.trim()) meta.videoUrl = input.videoUrl.trim();
    if (input.videoTitle?.trim()) meta.videoTitle = input.videoTitle.trim().slice(0, 120);
    if (input.thumbnailUrl?.trim()) meta.thumbnailUrl = input.thumbnailUrl.trim();
    const desc = input.description?.trim();
    if (desc) meta.description = desc.slice(0, 200);
    meta.startSec = Math.max(0, Math.floor(input.startSec ?? 0));
    if (input.endSec != null) meta.endSec = Math.max(0, Math.floor(input.endSec));
    meta.playToEnd = !!input.playToEnd;
    meta.durationSec = Math.max(1, Math.floor(input.durationSec ?? 1));
    meta.anonymous = !!input.anonymous;
  }
  return meta;
}

export function safeReturnPath(path: string | undefined, fallback = "/support"): string {
  if (!path?.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  return path;
}

export function parseVideoTipMeta(meta: Record<string, unknown>): {
  videoUrl?: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  description?: string;
  startSec: number;
  endSec?: number;
  playToEnd: boolean;
  durationSec: number;
  anonymous: boolean;
} {
  return {
    videoUrl: typeof meta.videoUrl === "string" ? meta.videoUrl : undefined,
    videoTitle: typeof meta.videoTitle === "string" ? meta.videoTitle : undefined,
    thumbnailUrl: typeof meta.thumbnailUrl === "string" ? meta.thumbnailUrl : undefined,
    description: typeof meta.description === "string" ? meta.description : undefined,
    startSec: Math.max(0, parseInt(String(meta.startSec ?? 0), 10) || 0),
    endSec:
      meta.endSec != null ? Math.max(0, parseInt(String(meta.endSec), 10) || 0) : undefined,
    playToEnd: meta.playToEnd === true || meta.playToEnd === "true" || meta.playToEnd === "1",
    durationSec: Math.max(1, parseInt(String(meta.durationSec ?? 1), 10) || 1),
    anonymous: meta.anonymous === true || meta.anonymous === "true" || meta.anonymous === "1",
  };
}
