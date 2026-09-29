/** ATM transfer letter marker — sync with src/lib/chat-atm-letter.ts */

export const ATM_LETTER_MESSAGE_MAX = 500;

const MARKER_RE = /\[\[mocomo:atm-letter:(\d+)\]\]/i;

export type ParsedAtmLetter = {
  amount: number;
  message: string;
};

export function parseAtmLetter(content: string | null | undefined): ParsedAtmLetter | null {
  if (!content?.trim()) return null;
  const match = content.match(MARKER_RE);
  if (!match?.[1]) return null;
  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount < 1) return null;
  const message = content.replace(MARKER_RE, "").trim();
  return { amount, message };
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
