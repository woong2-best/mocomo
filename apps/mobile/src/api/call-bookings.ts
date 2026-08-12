import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type CallBookingStatus =
  | "PAYMENT_PENDING"
  | "PENDING_CREATOR"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "EXPIRED";

export type CallBooking = {
  id: string;
  fanId: string;
  creatorId: string;
  chatRoomId: string;
  callType: "AUDIO" | "VIDEO";
  scheduledStartAt: string;
  durationMinutes: number;
  amountKrw: number;
  status: CallBookingStatus;
  fanNote: string | null;
  creatorNote: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  voiceCallId: string | null;
  voiceCallStatus: string | null;
  refund: { id: string; status: string; reason: string } | null;
};

export type CreatorCallSettings = {
  bookable: boolean;
  rateKrwPerHour: number | null;
  enabled: boolean;
};

export type MyCreatorCallSettings = {
  isCreator: boolean;
  enabled: boolean;
  rateKrwPerHour: number | null;
};

export async function fetchCreatorCallSettings(userId: string) {
  return apiRequest<CreatorCallSettings>(MobileApi.callBookingCreator(userId));
}

export async function fetchMyCreatorCallSettings() {
  return apiRequest<MyCreatorCallSettings>(MobileApi.creatorCallSettings);
}

export async function updateMyCreatorCallSettings(body: {
  enabled: boolean;
  rateKrwPerHour: number | null;
}) {
  return apiRequest<MyCreatorCallSettings>(MobileApi.creatorCallSettings, {
    method: "PUT",
    body,
  });
}

export async function createCallBooking(body: {
  creatorId: string;
  chatRoomId: string;
  callType: "AUDIO" | "VIDEO";
  scheduledStartAt: string;
  amountKrw: number;
  fanNote?: string;
}) {
  return apiRequest<{
    booking: CallBooking;
    checkout: {
      type: "CALL_BOOKING";
      amount: number;
      orderName: string;
      metadata: Record<string, unknown>;
    };
  }>(MobileApi.callBookings, { method: "POST", body });
}

export async function fetchCallBooking(id: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBooking(id));
}

export async function acceptCallBooking(id: string, note?: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBookingAccept(id), {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function rejectCallBooking(id: string, note?: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBookingReject(id), {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function joinCallBooking(id: string) {
  return apiRequest<{
    call: { id: string; callType: "AUDIO" | "VIDEO"; status: string };
    livekit: { token: string; serverUrl: string };
    role: "fan" | "creator";
  }>(MobileApi.callBookingJoin(id), { method: "POST" });
}

export async function completeCallBooking(id: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBookingComplete(id), {
    method: "POST",
  });
}

export async function requestCallBookingRefund(id: string, reason: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBookingRefund(id), {
    method: "POST",
    body: { reason, action: "request" },
  });
}

export async function approveCallBookingRefund(id: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBookingRefund(id), {
    method: "POST",
    body: { reason: "", action: "approve" },
  });
}

export async function rejectCallBookingRefund(id: string) {
  return apiRequest<{ booking: CallBooking }>(MobileApi.callBookingRefund(id), {
    method: "POST",
    body: { reason: "", action: "reject" },
  });
}

export function calcDurationMinutes(amountKrw: number, rateKrwPerHour: number): number {
  if (rateKrwPerHour <= 0) return 0;
  const rawMinutes = Math.floor((amountKrw / rateKrwPerHour) * 60);
  const rounded = Math.max(15, Math.round(rawMinutes / 15) * 15);
  return Math.min(180, rounded);
}

export function formatBookingStatus(status: CallBookingStatus): string {
  const labels: Record<CallBookingStatus, string> = {
    PAYMENT_PENDING: "결제 대기",
    PENDING_CREATOR: "크리에이터 확인 중",
    CONFIRMED: "예약 확정",
    REJECTED: "거절됨",
    CANCELLED: "취소됨",
    COMPLETED: "완료",
    REFUND_REQUESTED: "환불 요청 중",
    REFUNDED: "환불 완료",
    EXPIRED: "만료",
  };
  return labels[status] ?? status;
}
