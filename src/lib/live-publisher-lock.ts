/** 라이브 송출 — 한 브라우저 탭(기기)만 WHIP 송출 가능 */

export type HostPublishState = "idle" | "live_here" | "live_elsewhere";

export function readPublisherTabIdFromRequest(req: Request): string | null {
  const raw = req.headers.get("x-mocomo-live-tab")?.trim() ?? "";
  return raw.length > 0 && raw.length <= 64 ? raw : null;
}

export function resolveHostPublishState(
  channel: {
    isLive: boolean;
    liveStatus: string;
    livePublisherTabId?: string | null;
  },
  tabId: string | null
): HostPublishState {
  if (channel.liveStatus === "ENDED") return "idle";
  if (!channel.isLive) return "idle";

  const owner = channel.livePublisherTabId?.trim() || null;
  if (!owner) return "live_here";
  if (!tabId) return "live_elsewhere";
  return owner === tabId ? "live_here" : "live_elsewhere";
}

export function publisherLockError(): string {
  return "이미 다른 기기·브라우저에서 방송 중입니다. 방송을 시작한 그 기기에서 계속하거나, 먼저 「방송 종료」를 누른 뒤 이 기기에서 시작해 주세요.";
}
