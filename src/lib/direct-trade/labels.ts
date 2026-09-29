import { MEETUP_GPS_RETRY_MESSAGE, MEETUP_NOSHOW_ALERT, MEETUP_PIN_WARNING } from "@/lib/direct-trade/constants";
import { gpsAttemptsRemaining, isArrivalFailure } from "@/lib/direct-trade/judgment";

export function arrivalLabel(status: string): string {
  switch (status) {
    case "ARRIVAL_PENDING":
      return "대기";
    case "ARRIVAL_VERIFIED":
      return "인증 완료";
    case "ARRIVAL_GPS_FAILED":
      return "위치 확인 실패";
    case "ARRIVAL_PERMISSION_DENIED":
      return "위치 권한 없음";
    case "ARRIVAL_LOW_ACCURACY":
      return "정확도 부족";
    default:
      return "확인 중";
  }
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case "SCHEDULED":
      return "거래 진행";
    case "NO_SHOW_REPORTED":
      return "노쇼 신고";
    case "DISPUTE_REVIEW":
      return "분쟁 검토";
    case "NO_SHOW_CONFIRMED":
      return "노쇼 확정";
    case "COMPLETED":
      return "거래 완료";
    case "CANCELLED":
      return "취소";
    case "FORFEITED":
      return "보증금 처리 완료";
    default:
      return "거래 진행";
  }
}

export function disputeLabel(phase: string): string {
  switch (phase) {
    case "NO_SHOW_REPORTED":
      return "노쇼 신고됨";
    case "DISPUTE_REVIEW":
      return "검토 중";
    case "NO_SHOW_CONFIRMED":
      return "노쇼 확정";
    case "FORFEITED":
      return "패널티 확정";
    default:
      return "없음";
  }
}

export function depositLabel(status: string): string {
  switch (status) {
    case "LOCKED":
      return "잠김 · 2 MOCO";
    case "REFUNDED":
      return "환원됨";
    case "FORFEITED":
      return "몰수됨";
    default:
      return "없음";
  }
}

export function penaltyLabel(input: {
  phase: string;
  depositStatus: string;
  noShowUserId: string | null;
  userId: string;
}): string {
  if (input.depositStatus === "FORFEITED" || (input.phase === "NO_SHOW_CONFIRMED" && input.noShowUserId === input.userId)) {
    return "2 MOCO 몰수";
  }
  if (input.phase === "DISPUTE_REVIEW") return "없음 · 보류";
  return "없음";
}

export function penaltyCode(input: {
  phase: string;
  depositStatus: string;
  noShowUserId: string | null;
  userId: string;
}): "NONE" | "HELD" | "FORFEITED" {
  if (input.depositStatus === "FORFEITED" || (input.phase === "NO_SHOW_CONFIRMED" && input.noShowUserId === input.userId)) {
    return "FORFEITED";
  }
  if (input.phase === "DISPUTE_REVIEW") return "HELD";
  return "NONE";
}

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "NO_SHOW_CONFIRMED", "FORFEITED"]);

export function buildGuidance(input: {
  phase: string;
  role: "buyer" | "seller";
  myArrival: string;
  otherArrival: string;
  iAmAccused: boolean;
  gpsAttempts: number;
  pinReady: boolean;
}): { guidance: string | null; pinWarning: string | null } {
  if (input.phase === "COMPLETED") {
    return { guidance: "거래가 완료되어 양쪽 보증금 2 MOCO가 환원되었습니다.", pinWarning: null };
  }
  if (input.phase === "NO_SHOW_CONFIRMED" || input.phase === "FORFEITED") {
    return { guidance: "노쇼가 확정되어 거래가 종료되었습니다.", pinWarning: null };
  }
  if (input.phase === "CANCELLED") {
    return { guidance: "거래가 취소되었습니다.", pinWarning: null };
  }

  if (isArrivalFailure(input.myArrival) && !TERMINAL.has(input.phase)) {
    if (gpsAttemptsRemaining(input.gpsAttempts) > 0) {
      return { guidance: MEETUP_GPS_RETRY_MESSAGE, pinWarning: null };
    }
    return {
      guidance: "자동으로 판단할 수 없어 분쟁 검토로 넘겼습니다. 보증금은 차감되지 않습니다.",
      pinWarning: null,
    };
  }

  if (input.phase === "DISPUTE_REVIEW") {
    return {
      guidance: "위치를 확정할 수 없어 분쟁 검토 중입니다. 보증금은 차감되지 않습니다.",
      pinWarning: null,
    };
  }

  if (input.phase === "NO_SHOW_REPORTED" && input.iAmAccused) {
    return { guidance: MEETUP_NOSHOW_ALERT, pinWarning: null };
  }
  if (input.phase === "NO_SHOW_REPORTED") {
    return { guidance: "상대방의 도착 인증을 기다리고 있습니다.", pinWarning: null };
  }

  if (input.myArrival === "ARRIVAL_VERIFIED" && input.otherArrival === "ARRIVAL_VERIFIED" && input.pinReady) {
    if (input.role === "seller") {
      return {
        guidance: "구매자가 물건을 확인한 뒤 알려 주는 암호코드를 입력하면 거래가 완료됩니다.",
        pinWarning: null,
      };
    }
    return {
      guidance: "물건을 모두 확인한 뒤에만 판매자에게 암호코드를 알려 주세요.",
      pinWarning: MEETUP_PIN_WARNING,
    };
  }

  if (input.myArrival === "ARRIVAL_VERIFIED" && input.otherArrival === "ARRIVAL_PENDING") {
    return {
      guidance: "상대방은 아직 도착 인증 전입니다. 약속 시간 20분 뒤 노쇼 신고를 할 수 있습니다.",
      pinWarning: null,
    };
  }

  return { guidance: null, pinWarning: null };
}
