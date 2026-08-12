import type { CallBookingStatus, CallType } from "@prisma/client";
import { db } from "@/lib/db";
import { buildCallBookingMessageBody } from "@/lib/chat-call-booking-marker";
import { sendMobileDmMessage } from "@/lib/chat-dm-service";
import { createNotification } from "@/lib/notifications";
import { recordPaymentGross, recordPlatformFee, creditSellerEarning, splitPlatformFee } from "@/lib/settlement";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const MIN_CALL_BOOKING_KRW = 5_000;
export const MAX_CALL_BOOKING_KRW = 500_000;
export const MIN_BOOKING_LEAD_MINUTES = 60;

export type CreatorCallSettings = {
  bookable: boolean;
  rateKrwPerHour: number | null;
  enabled: boolean;
};

export async function getCreatorCallSettings(userId: string): Promise<CreatorCallSettings> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      creatorCallEnabled: true,
      creatorCallRateKrwPerHour: true,
      cosplayerProfile: { select: { id: true } },
      streamerProfile: { select: { id: true } },
    },
  });
  if (!user) {
    return { bookable: false, rateKrwPerHour: null, enabled: false };
  }
  const isCreator = !!(user.cosplayerProfile || user.streamerProfile);
  const enabled = user.creatorCallEnabled && !!user.creatorCallRateKrwPerHour && user.creatorCallRateKrwPerHour > 0;
  return {
    bookable: isCreator && enabled,
    rateKrwPerHour: user.creatorCallRateKrwPerHour,
    enabled,
  };
}

/** 금액 → 통화 시간(분). 15분 단위, 최소 15분, 최대 3시간 */
export function calcDurationMinutesFromAmount(amountKrw: number, rateKrwPerHour: number): number {
  if (rateKrwPerHour <= 0) return 0;
  const rawMinutes = Math.floor((amountKrw / rateKrwPerHour) * 60);
  const rounded = Math.max(15, Math.round(rawMinutes / 15) * 15);
  return Math.min(180, rounded);
}

export function calcAmountKrwFromDuration(durationMinutes: number, rateKrwPerHour: number): number {
  return Math.round((durationMinutes / 60) * rateKrwPerHour);
}

export function validateBookingSchedule(scheduledStartAt: Date): string | null {
  const now = Date.now();
  const minStart = now + MIN_BOOKING_LEAD_MINUTES * 60_000;
  if (scheduledStartAt.getTime() < minStart) {
    return `예약은 최소 ${MIN_BOOKING_LEAD_MINUTES}분 후부터 가능합니다.`;
  }
  const maxStart = now + 30 * 24 * 60 * 60_000;
  if (scheduledStartAt.getTime() > maxStart) {
    return "예약은 30일 이내로만 가능합니다.";
  }
  return null;
}

export function serializeCallBooking(booking: {
  id: string;
  fanId: string;
  creatorId: string;
  chatRoomId: string;
  callType: CallType;
  scheduledStartAt: Date;
  durationMinutes: number;
  amountKrw: number;
  status: CallBookingStatus;
  fanNote: string | null;
  creatorNote: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  voiceCall?: { id: string; status: string } | null;
  refund?: { id: string; status: string; reason: string } | null;
}) {
  return {
    id: booking.id,
    fanId: booking.fanId,
    creatorId: booking.creatorId,
    chatRoomId: booking.chatRoomId,
    callType: booking.callType,
    scheduledStartAt: booking.scheduledStartAt.toISOString(),
    durationMinutes: booking.durationMinutes,
    amountKrw: booking.amountKrw,
    status: booking.status,
    fanNote: booking.fanNote,
    creatorNote: booking.creatorNote,
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    voiceCallId: booking.voiceCall?.id ?? null,
    voiceCallStatus: booking.voiceCall?.status ?? null,
    refund: booking.refund
      ? {
          id: booking.refund.id,
          status: booking.refund.status,
          reason: booking.refund.reason,
        }
      : null,
  };
}

export async function fulfillCallBookingPayment(params: {
  bookingId: string;
  fanId: string;
  paymentIntentId: string;
  paymentRef: string;
  amount: number;
}) {
  const booking = await db.creatorCallBooking.findUnique({
    where: { id: params.bookingId },
    include: {
      creator: { select: { username: true } },
      fan: { select: { username: true } },
    },
  });
  if (!booking) return { error: "예약을 찾을 수 없습니다." };
  if (booking.fanId !== params.fanId) return { error: "예약 권한이 없습니다." };
  if (booking.status !== "PAYMENT_PENDING" && booking.status !== "PENDING_CREATOR") {
    if (booking.paymentIntentId) return { ok: true as const, alreadyPaid: true };
    return { error: "이미 처리된 예약입니다." };
  }
  if (booking.amountKrw !== params.amount) {
    return { error: "결제 금액이 예약과 일치하지 않습니다." };
  }

  await db.creatorCallBooking.update({
    where: { id: booking.id },
    data: {
      status: "PENDING_CREATOR",
      paymentIntentId: params.paymentIntentId,
    },
  });

  await recordPaymentGross(params.amount, params.paymentIntentId, `call_booking:${booking.id}`);

  const callTypeLabel = booking.callType === "VIDEO" ? "영상" : "음성";
  const body = buildCallBookingMessageBody(booking.id, callTypeLabel);
  await sendMobileDmMessage(booking.fanId, {
    roomId: booking.chatRoomId,
    content: body,
  });

  void createNotification({
    userId: booking.creatorId,
    type: "SYSTEM",
    title: "통화 예약 신청",
    body: `@${booking.fan.username}님이 ${callTypeLabel} 통화 예약을 신청했습니다.`,
    link: `/messages?room=${booking.chatRoomId}`,
    actorId: booking.fanId,
  });

  return { ok: true as const, bookingId: booking.id };
}

export async function settleCallBooking(bookingId: string) {
  const booking = await db.creatorCallBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      amountKrw: true,
      creatorId: true,
      paymentIntentId: true,
    },
  });
  if (!booking || !booking.paymentIntentId) return { error: "예약을 찾을 수 없습니다." };
  if (booking.status === "COMPLETED") return { ok: true as const, alreadySettled: true };
  if (booking.status !== "CONFIRMED") return { error: "정산 가능한 상태가 아닙니다." };

  const { platformFee, sellerAmount } = splitPlatformFee(booking.amountKrw);
  await recordPlatformFee(platformFee, {
    referenceType: "call_booking",
    referenceId: booking.id,
    paymentIntentId: booking.paymentIntentId,
    memo: "크리에이터 통화 예약",
  });
  await creditSellerEarning(booking.creatorId, sellerAmount, {
    referenceType: "call_booking",
    referenceId: booking.id,
    paymentIntentId: booking.paymentIntentId,
    memo: "통화 예약 정산",
  });

  await db.creatorCallBooking.update({
    where: { id: booking.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return { ok: true as const };
}

export async function stripeRefundCallBooking(bookingId: string, paymentRef: string) {
  if (!isStripeConfigured()) return { stripeRefundId: undefined as string | undefined };

  const stripe = getStripe();
  let paymentIntentId = paymentRef;
  if (paymentIntentId.startsWith("cs_")) {
    const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
    paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? paymentIntentId;
  }
  const refunded = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return { stripeRefundId: refunded.id };
}

export async function processCallBookingRefundApproval(bookingId: string, resolverId: string) {
  const booking = await db.creatorCallBooking.findUnique({
    where: { id: bookingId },
    include: {
      refund: true,
      fan: { select: { username: true } },
    },
  });
  if (!booking?.refund) return { error: "환불 요청을 찾을 수 없습니다." };
  if (booking.refund.status !== "REQUESTED") return { error: "이미 처리된 환불입니다." };

  const intent = booking.paymentIntentId
    ? await db.paymentIntent.findUnique({ where: { id: booking.paymentIntentId } })
    : null;
  const paymentRef = intent?.paymentKey;
  let stripeRefundId: string | undefined;
  if (paymentRef) {
    try {
      const r = await stripeRefundCallBooking(booking.id, paymentRef);
      stripeRefundId = r.stripeRefundId;
    } catch {
      // Stripe 실패 시에도 내부 상태는 REFUNDED로 (수동 처리)
    }
  }

  await db.$transaction([
    db.callBookingRefund.update({
      where: { id: booking.refund.id },
      data: {
        status: stripeRefundId ? "COMPLETED" : "APPROVED",
        stripeRefundId,
        resolvedAt: new Date(),
        resolvedById: resolverId,
      },
    }),
    db.creatorCallBooking.update({
      where: { id: booking.id },
      data: { status: "REFUNDED" },
    }),
  ]);

  void createNotification({
    userId: booking.fanId,
    type: "SYSTEM",
    title: "통화 예약 환불",
    body: "크리에이터가 환불을 승인했습니다.",
    link: `/messages?room=${booking.chatRoomId}`,
    actorId: resolverId,
  });

  return { ok: true as const, stripeRefundId };
}
