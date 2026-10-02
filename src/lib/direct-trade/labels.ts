import { MEETUP_GPS_RETRY_MESSAGE, MEETUP_NOSHOW_ALERT, MEETUP_PIN_WARNING } from "@/lib/direct-trade/constants";
import { gpsAttemptsRemaining, isArrivalFailure } from "@/lib/direct-trade/judgment";

export function arrivalLabel(status: string): string {
  switch (status) {
    case "ARRIVAL_PENDING":
      return "Waiting";
    case "ARRIVAL_VERIFIED":
      return "Verified";
    case "ARRIVAL_GPS_FAILED":
      return "Location check failed";
    case "ARRIVAL_PERMISSION_DENIED":
      return "Location permission denied";
    case "ARRIVAL_LOW_ACCURACY":
      return "Insufficient accuracy";
    default:
      return "Checking";
  }
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case "SCHEDULED":
      return "In progress";
    case "NO_SHOW_REPORTED":
      return "No-show reported";
    case "DISPUTE_REVIEW":
      return "Dispute review";
    case "NO_SHOW_CONFIRMED":
      return "No-show confirmed";
    case "COMPLETED":
      return "Trade complete";
    case "CANCELLED":
      return "Cancelled.";
    case "FORFEITED":
      return "Deposit processed";
    default:
      return "In progress";
  }
}

export function disputeLabel(phase: string): string {
  switch (phase) {
    case "NO_SHOW_REPORTED":
      return "No-show reported";
    case "DISPUTE_REVIEW":
      return "Under review";
    case "NO_SHOW_CONFIRMED":
      return "No-show confirmed";
    case "FORFEITED":
      return "Penalty confirmed";
    default:
      return "None";
  }
}

export function depositLabel(status: string): string {
  switch (status) {
    case "LOCKED":
      return "Held · 2 MOCO";
    case "REFUNDED":
      return "Refunded";
    case "FORFEITED":
      return "Forfeited";
    default:
      return "None";
  }
}

export function penaltyLabel(input: {
  phase: string;
  depositStatus: string;
  noShowUserId: string | null;
  userId: string;
}): string {
  if (input.depositStatus === "FORFEITED" || (input.phase === "NO_SHOW_CONFIRMED" && input.noShowUserId === input.userId)) {
    return "2 MOCO forfeited";
  }
  if (input.phase === "DISPUTE_REVIEW") return "None · pending";
  return "None";
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
    return { guidance: "Trade completed. Both sides received their 2 MOCO deposits back.", pinWarning: null };
  }
  if (input.phase === "NO_SHOW_CONFIRMED" || input.phase === "FORFEITED") {
    return { guidance: "No-show confirmed. This trade has ended.", pinWarning: null };
  }
  if (input.phase === "CANCELLED") {
    return { guidance: "Trade canceled.", pinWarning: null };
  }

  if (isArrivalFailure(input.myArrival) && !TERMINAL.has(input.phase)) {
    if (gpsAttemptsRemaining(input.gpsAttempts) > 0) {
      return { guidance: MEETUP_GPS_RETRY_MESSAGE, pinWarning: null };
    }
    return {
      guidance: "Could not decide automatically; sent to dispute review. Deposits were not deducted.",
      pinWarning: null,
    };
  }

  if (input.phase === "DISPUTE_REVIEW") {
    return {
      guidance: "Location could not be confirmed; under dispute review. Deposits were not deducted.",
      pinWarning: null,
    };
  }

  if (input.phase === "NO_SHOW_REPORTED" && input.iAmAccused) {
    return { guidance: MEETUP_NOSHOW_ALERT, pinWarning: null };
  }
  if (input.phase === "NO_SHOW_REPORTED") {
    return { guidance: "Waiting for the other party's arrival verification.", pinWarning: null };
  }

  if (input.myArrival === "ARRIVAL_VERIFIED" && input.otherArrival === "ARRIVAL_VERIFIED" && input.pinReady) {
    if (input.role === "seller") {
      return {
        guidance: "Enter the passcode the buyer gives you after inspecting the item to complete the trade.",
        pinWarning: null,
      };
    }
    return {
      guidance: "Only share the passcode with the seller after you have fully inspected the item.",
      pinWarning: MEETUP_PIN_WARNING,
    };
  }

  if (input.myArrival === "ARRIVAL_VERIFIED" && input.otherArrival === "ARRIVAL_PENDING") {
    return {
      guidance: "The other party has not verified arrival yet. You can report a no-show 20 minutes after the meetup time.",
      pinWarning: null,
    };
  }

  return { guidance: null, pinWarning: null };
}
