/**
 * 라이브 기능 게이트
 * - 자체 송출(Cloudflare/LiveKit Ingress/SRS): NEXT_PUBLIC_LIVE_ENABLED !== "false"
 * - 외부 임베드(YT/Twitch/Chzzk): NEXT_PUBLIC_EXTERNAL_LIVE_ENABLED !== "false" (기본 on)
 * 코드·스키마는 삭제하지 않고 숨김만 한다.
 */

/** 자체 송출(1st-party ingest/playback) UI·API */
export function isFirstPartyLiveEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LIVE_ENABLED !== "false";
}

/** 외부 플랫폼 임베드 라이브 룸 */
export function isExternalLiveEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EXTERNAL_LIVE_ENABLED !== "false";
}

/** 네비/디렉터리 노출 — 외부 또는 자체 중 하나라도 켜져 있으면 */
export function isLiveFeatureEnabled(): boolean {
  return isFirstPartyLiveEnabled() || isExternalLiveEnabled();
}

export const LIVE_FEATURE_HREFS = ["/live", "/voice", "/avatar"] as const;

/** 자체 방송 생성·스튜디오 진입점 */
export const FIRST_PARTY_LIVE_PATH_PREFIXES = [
  "/voice/new",
  "/avatar",
] as const;

export function isLiveNavHref(href: string): boolean {
  return href === "/live" || href.startsWith("/voice") || href.startsWith("/avatar");
}

export function isFirstPartyLivePath(pathname: string): boolean {
  if (pathname.startsWith("/avatar")) return true;
  if (pathname === "/voice/new" || pathname.startsWith("/voice/new/")) return true;
  return false;
}

/** API/액션에서 자체 송출 차단 */
export function firstPartyLiveDisabledResponse(message?: string) {
  return {
    error:
      message ??
      "자체 송출(MoCoMo 서버 방송)은 종료되었습니다. 유튜브·트위치 등 외부 방송 연동을 이용해 주세요.",
  };
}

export function assertFirstPartyLiveEnabled():
  | { ok: true }
  | { ok: false; error: string } {
  if (!isFirstPartyLiveEnabled()) {
    return { ok: false, error: firstPartyLiveDisabledResponse().error };
  }
  return { ok: true };
}
