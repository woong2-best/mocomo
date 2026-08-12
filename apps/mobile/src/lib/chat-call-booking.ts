/**
 * DM call-booking markers — keep in sync with src/lib/chat-call-booking-marker.ts
 */

export const CALL_BOOKING_MARKER_PREFIX = "[[mocomo:call-booking:";
export const CALL_BOOKING_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:call-booking:([a-z0-9]+)\]\]/i;

export function parseCallBookingMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const match = content.trim().match(MARKER_RE);
  return match?.[1] ?? null;
}

export function stripCallBookingMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const stripped = content.replace(MARKER_RE, "").trim();
  return stripped || null;
}
