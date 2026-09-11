export type SubcultureEventPhase = "ongoing" | "upcoming" | "past" | "permanent";

export const SUBCULTURE_EVENT_PHASE_LABELS: Record<SubcultureEventPhase, string> = {
  ongoing: "진행 중",
  upcoming: "예정",
  past: "종료",
  permanent: "상설",
};

/** 행사 일정 기준 표시 단계 — 지도·목록 필터용 */
export function inferSubcultureEventPhase(
  startsAt: Date | string,
  endsAt: Date | string | null | undefined,
  category?: string | null,
  now = new Date()
): SubcultureEventPhase {
  if (category === "maid_cafe") return "permanent";

  const startMs = new Date(startsAt).getTime();
  const endMs = endsAt ? new Date(endsAt).getTime() : startMs + 86_400_000;
  const nowMs = now.getTime();

  if (nowMs > endMs) return "past";
  if (nowMs >= startMs) return "ongoing";
  return "upcoming";
}

export function isSubcultureEventVisibleOnMap(phase: SubcultureEventPhase): boolean {
  return phase === "ongoing" || phase === "upcoming" || phase === "permanent";
}
