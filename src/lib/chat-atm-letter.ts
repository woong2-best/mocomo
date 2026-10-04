/** ATM 전달과 함께 가는 DM 편지. 모바일 `apps/mobile/src/lib/chat-atm-letter.ts` 와 마커를 맞춘다. */

import { filterDmMessageContent } from "@/lib/chat-content-filter";

export const ATM_LETTER_MARKER_PREFIX = "[[mocomo:atm-letter:";
export const ATM_LETTER_MESSAGE_MAX = 500;

const MARKER_RE = /\[\[mocomo:atm-letter:(\d+(?:\.\d)?)\]\]/i;

export type ParsedAtmLetter = {
  amount: number;
  message: string;
};

export function buildAtmLetterContent(amount: number, message: string): string {
  const marker = `${ATM_LETTER_MARKER_PREFIX}${amount}]]`;
  const body = message.trim();
  return body ? `${marker}\n${body}` : marker;
}

export function parseAtmLetter(content: string | null | undefined): ParsedAtmLetter | null {
  if (!content?.trim()) return null;
  const match = content.match(MARKER_RE);
  if (!match?.[1]) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0.1) return null;
  if (Math.abs(amount * 10 - Math.round(amount * 10)) > 1e-6) return null;
  const message = content.replace(MARKER_RE, "").trim();
  return { amount, message };
}

export function atmLetterListPreview(content: string | null | undefined): string | null {
  return parseAtmLetter(content) ? "편지가 도착했습니다" : null;
}

export function normalizeAtmLetterMessage(
  raw: string | null | undefined
): { message: string } | { error: string } {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length > ATM_LETTER_MESSAGE_MAX) {
    return { error: `편지는 ${ATM_LETTER_MESSAGE_MAX}자까지 적을 수 있습니다.` as const };
  }
  if (!trimmed) return { message: "" };
  return { message: filterDmMessageContent(trimmed).text };
}

export function formatAtmLetterDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}
