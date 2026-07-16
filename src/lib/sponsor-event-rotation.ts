/** 스폰서 슬롯 이벤트 로테이션 — 쿠키에 남은 풀 저장 (중복 없이 한 바퀴) */

export const SPONSOR_ROTATION_COOKIE = "mocomo_sponsor_events";

export type SponsorEventCandidate = {
  id: string;
  title: string;
  imageUrl: string;
};

export type SponsorRotationState = {
  remaining: string[];
};

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function parseRotationState(raw: string | undefined): SponsorRotationState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SponsorRotationState;
    if (!parsed || !Array.isArray(parsed.remaining)) return null;
    return { remaining: parsed.remaining.filter((id) => typeof id === "string") };
  } catch {
    return null;
  }
}

/**
 * 풀에서 무작위 1건 선택. 이미 본 이벤트는 remaining에서 제외하고,
 * remaining이 비면 전체를 다시 섞어 새 사이클 시작.
 */
export function pickSponsorEvent(
  pool: SponsorEventCandidate[],
  stateRaw: string | undefined
): { event: SponsorEventCandidate; state: SponsorRotationState } | { event: null; state: SponsorRotationState } {
  if (pool.length === 0) {
    return { event: null, state: { remaining: [] } };
  }

  const allIds = pool.map((e) => e.id);
  const byId = new Map(pool.map((e) => [e.id, e]));
  const prev = parseRotationState(stateRaw);

  let remaining = (prev?.remaining ?? []).filter((id) => allIds.includes(id));

  const known = new Set(remaining);
  const newcomers = allIds.filter((id) => !known.has(id));
  if (newcomers.length > 0) {
    remaining = [...remaining, ...shuffleIds(newcomers)];
  }

  if (remaining.length === 0) {
    remaining = shuffleIds(allIds);
  }

  const pickIdx = Math.floor(Math.random() * remaining.length);
  const pickedId = remaining[pickIdx];
  const newRemaining = remaining.filter((_, i) => i !== pickIdx);
  const event = byId.get(pickedId) ?? null;

  return {
    event,
    state: { remaining: newRemaining },
  };
}
