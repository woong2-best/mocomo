import { randomUUID } from "crypto";

/** 단일 경제 요청(Shop 구매 등)의 연관 이벤트 묶음 */
export function newCorrelationId(): string {
  return `corr_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
}

export function isCorrelationIdQuery(q: string): boolean {
  const t = q.trim();
  return t.startsWith("corr_") || t.startsWith("corr:");
}

export function normalizeCorrelationQuery(q: string): string {
  return q.trim().replace(/^corr:/i, "");
}
