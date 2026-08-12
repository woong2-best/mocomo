import { db } from "@/lib/db";

export async function assertRoomMember(roomId: string, userId: string) {
  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { userId: true },
  });
  return !!member;
}

export async function loadBookingForUser(bookingId: string, userId: string) {
  const booking = await db.creatorCallBooking.findUnique({
    where: { id: bookingId },
    include: {
      voiceCall: { select: { id: true, status: true } },
      refund: { select: { id: true, status: true, reason: true } },
    },
  });
  if (!booking) return { error: "NOT_FOUND" as const };
  if (booking.fanId !== userId && booking.creatorId !== userId) {
    return { error: "FORBIDDEN" as const };
  }
  return { booking };
}
