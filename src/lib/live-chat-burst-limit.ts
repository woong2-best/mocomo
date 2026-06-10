/** 라이브 채팅 — 연속 5개까지, 이후 5초 대기 후 다음 5개 */
export const LIVE_CHAT_BURST_SIZE = 5;
export const LIVE_CHAT_BURST_COOLDOWN_SEC = 5;

export function checkLiveChatBurstLimit(
  recentDesc: { createdAt: Date }[],
  now = Date.now()
): { ok: true } | { ok: false; waitSec: number } {
  if (recentDesc.length === 0) return { ok: true };

  let burstCount = 0;
  for (let i = 0; i < recentDesc.length; i++) {
    if (i > 0) {
      const gapSec =
        (recentDesc[i - 1].createdAt.getTime() - recentDesc[i].createdAt.getTime()) / 1000;
      if (gapSec >= LIVE_CHAT_BURST_COOLDOWN_SEC) break;
    }
    burstCount++;
  }

  if (burstCount < LIVE_CHAT_BURST_SIZE) return { ok: true };

  const sinceNewestSec = (now - recentDesc[0].createdAt.getTime()) / 1000;
  if (sinceNewestSec >= LIVE_CHAT_BURST_COOLDOWN_SEC) return { ok: true };

  return {
    ok: false,
    waitSec: Math.ceil(LIVE_CHAT_BURST_COOLDOWN_SEC - sinceNewestSec),
  };
}
