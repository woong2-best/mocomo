import {
  MEETUP_ARRIVAL_MAX_ACCURACY_M,
  MEETUP_ARRIVAL_MAX_DISTANCE_M,
  MEETUP_GPS_MAX_ATTEMPTS,
  MEETUP_NOSHOW_GRACE_MINUTES,
  MEETUP_RANGE_MAX_ATTEMPTS,
} from "@/lib/direct-trade/constants";

export const ARRIVAL_FAILURES = [
  "ARRIVAL_GPS_FAILED",
  "ARRIVAL_PERMISSION_DENIED",
  "ARRIVAL_LOW_ACCURACY",
] as const;

export type ArrivalStatus =
  | "ARRIVAL_PENDING"
  | "ARRIVAL_VERIFIED"
  | "ARRIVAL_GPS_FAILED"
  | "ARRIVAL_PERMISSION_DENIED"
  | "ARRIVAL_LOW_ACCURACY";

export type ArrivalFailure = (typeof ARRIVAL_FAILURES)[number];

export function isArrivalFailure(status: string): status is ArrivalFailure {
  return (ARRIVAL_FAILURES as readonly string[]).includes(status);
}

/** GPS 실패·권한 거부·정확도 부족은 노쇼가 아니다. */
export function arrivalAllowsNoShowReport(status: string): boolean {
  return status === "ARRIVAL_PENDING";
}

export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function coordsLookValid(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export type ArrivalSample =
  | {
      kind: "verified";
      distanceBucket: "WITHIN_50M";
      accuracyBucket: "OK";
    }
  | {
      kind: "out_of_range";
      distanceBucket: "BEYOND_50M";
      accuracyBucket: "OK";
    }
  | {
      kind: "low_accuracy";
      distanceBucket: "WITHIN_50M" | "BEYOND_50M" | "UNKNOWN";
      accuracyBucket: "LOW" | "UNKNOWN";
    }
  | {
      kind: "gps_failed";
      distanceBucket: "UNKNOWN";
      accuracyBucket: "UNKNOWN";
    };

/**
 * 서버가 1회 좌표로 거리·정확도만 판정한다.
 * 반환값에 위도·경도는 넣지 않는다.
 */
export function classifyArrivalSample(input: {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  meetLat: number;
  meetLng: number;
}): ArrivalSample {
  if (!coordsLookValid(input.lat, input.lng) || !coordsLookValid(input.meetLat, input.meetLng)) {
    return { kind: "gps_failed", distanceBucket: "UNKNOWN", accuracyBucket: "UNKNOWN" };
  }

  const accuracy = input.accuracyMeters;
  const accuracyOk =
    accuracy != null && Number.isFinite(accuracy) && accuracy > 0 && accuracy <= MEETUP_ARRIVAL_MAX_ACCURACY_M;
  const distance = distanceMeters(input.lat, input.lng, input.meetLat, input.meetLng);
  const within = distance <= MEETUP_ARRIVAL_MAX_DISTANCE_M;
  const distanceBucket = within ? "WITHIN_50M" : "BEYOND_50M";

  if (!accuracyOk) {
    return {
      kind: "low_accuracy",
      distanceBucket,
      accuracyBucket: accuracy == null || !Number.isFinite(accuracy) ? "UNKNOWN" : "LOW",
    };
  }
  if (!within) {
    return { kind: "out_of_range", distanceBucket: "BEYOND_50M", accuracyBucket: "OK" };
  }
  return { kind: "verified", distanceBucket: "WITHIN_50M", accuracyBucket: "OK" };
}

export type GraceDecision = "PIN" | "WAIT_REPORT" | "DISPUTE_REVIEW";

/** 약속+유예 이후. 한쪽만 도착하고 상대가 대기 중이면 신고 버튼만 열고 자동 패널티는 없다. */
export function evaluateGraceWindow(buyer: string, seller: string): GraceDecision {
  if (buyer === "ARRIVAL_VERIFIED" && seller === "ARRIVAL_VERIFIED") return "PIN";
  if (buyer === "ARRIVAL_VERIFIED" && seller === "ARRIVAL_PENDING") return "WAIT_REPORT";
  if (seller === "ARRIVAL_VERIFIED" && buyer === "ARRIVAL_PENDING") return "WAIT_REPORT";
  return "DISPUTE_REVIEW";
}

export type NoShowDeadlineDecision = "CONFIRM" | "REVIEW" | "RESUME";

export function evaluateNoShowDeadline(reporterArrival: string, accusedArrival: string): NoShowDeadlineDecision {
  if (accusedArrival === "ARRIVAL_VERIFIED") return "RESUME";
  if (isArrivalFailure(accusedArrival)) return "REVIEW";
  if (reporterArrival !== "ARRIVAL_VERIFIED") return "REVIEW";
  if (accusedArrival === "ARRIVAL_PENDING") return "CONFIRM";
  return "REVIEW";
}

export function canReportNoShow(input: {
  phase: string;
  reporterArrival: string;
  accusedArrival: string;
  meetAt: Date | null;
  now: Date;
}): boolean {
  if (input.phase !== "SCHEDULED") return false;
  if (input.reporterArrival !== "ARRIVAL_VERIFIED") return false;
  if (!arrivalAllowsNoShowReport(input.accusedArrival)) return false;
  if (!input.meetAt) return false;
  const openAt = input.meetAt.getTime() + MEETUP_NOSHOW_GRACE_MINUTES * 60_000;
  return input.now.getTime() >= openAt;
}

export function gpsAttemptsRemaining(used: number): number {
  return Math.max(0, MEETUP_GPS_MAX_ATTEMPTS - used);
}

export function rangeAttemptsRemaining(used: number): number {
  return Math.max(0, MEETUP_RANGE_MAX_ATTEMPTS - used);
}
