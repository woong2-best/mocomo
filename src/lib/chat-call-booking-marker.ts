/** DM call-booking card marker — keep in sync with apps/mobile/src/lib/chat-call-booking.ts */

export const CALL_BOOKING_MARKER_PREFIX = "[[mocomo:call-booking:";
export const CALL_BOOKING_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:call-booking:([a-z0-9]+)\]\]/i;

export function callBookingMarker(bookingId: string): string {
  return `${CALL_BOOKING_MARKER_PREFIX}${bookingId}${CALL_BOOKING_MARKER_SUFFIX}`;
}

export function parseCallBookingMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const match = content.trim().match(MARKER_RE);
  return match?.[1] ?? null;
}

export function buildCallBookingMessageBody(bookingId: string, callTypeLabel: string): string {
  return `${callBookingMarker(bookingId)}\n📞 ${callTypeLabel} 통화 예약 신청이 도착했습니다.`;
}
