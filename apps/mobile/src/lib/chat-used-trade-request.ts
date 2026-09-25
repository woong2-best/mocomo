/**
 * DM used-trade-request markers — keep in sync with src/lib/chat-used-trade-request-marker.ts
 */

export const USED_TRADE_REQUEST_MARKER_PREFIX = "[[mocomo:used-trade-request:";
export const USED_TRADE_REQUEST_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:used-trade-request:([a-z0-9]+)\]\]/i;

export function parseUsedTradeRequestMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const match = content.trim().match(MARKER_RE);
  return match?.[1] ?? null;
}

export function stripUsedTradeRequestMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const stripped = content.replace(MARKER_RE, "").trim();
  return stripped || null;
}
