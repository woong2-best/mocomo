/** DM used-trade-request card marker — keep in sync with apps/mobile/src/lib/chat-used-trade-request.ts */

export const USED_TRADE_REQUEST_MARKER_PREFIX = "[[mocomo:used-trade-request:";
export const USED_TRADE_REQUEST_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:used-trade-request:([a-z0-9]+)\]\]/i;

export function usedTradeRequestMarker(requestId: string): string {
  return `${USED_TRADE_REQUEST_MARKER_PREFIX}${requestId}${USED_TRADE_REQUEST_MARKER_SUFFIX}`;
}

export function parseUsedTradeRequestMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const match = content.trim().match(MARKER_RE);
  return match?.[1] ?? null;
}

export function buildUsedTradeRequestMessageBody(requestId: string): string {
  return `${usedTradeRequestMarker(requestId)}\n상대방이 거래를 요청했습니다.`;
}
