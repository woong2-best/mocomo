import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { formatUsedPrice } from "@/lib/used-market";
import { finalizeUsedListingSold } from "@/lib/subculture-commerce/sale-records";
import { safeLogInfo, safeLogWarn } from "@/lib/safe-log";
import {
  forfeitLockedDepositInTransaction,
  refundLockedDepositInTransaction,
} from "@/lib/auction-deposit/service";
import {
  MEETUP_ADJUST_MAX,
  MEETUP_ADJUST_MINUTES,
  MEETUP_GPS_MAX_ATTEMPTS,
  MEETUP_NOSHOW_GRACE_MINUTES,
  MEETUP_GPS_RETRY_MESSAGE,
  MEETUP_NOSHOW_ALERT,
  MEETUP_NOSHOW_RESPONSE_MINUTES,
  MEETUP_PIN_MAX_ATTEMPTS,
  MEETUP_RANGE_MAX_ATTEMPTS,
  MEETUP_VERIFY_MIN_INTERVAL_MS,
} from "@/lib/direct-trade/constants";
import {
  canReportNoShow,
  classifyArrivalSample,
  evaluateGraceWindow,
  evaluateNoShowDeadline,
  isArrivalFailure,
} from "@/lib/direct-trade/judgment";
import {
  arrivalLabel,
  buildGuidance,
  depositLabel,
  disputeLabel,
  penaltyCode,
  penaltyLabel,
  phaseLabel,
} from "@/lib/direct-trade/labels";
import { generateTradePin, openTradePin, sealTradePin, tradePinHmac, tradePinMatches } from "@/lib/direct-trade/pin";
import type { DirectTradeResult, DirectTradeView } from "@/lib/direct-trade/types";

type Tx = Prisma.TransactionClient;
type Role = "buyer" | "seller";

const OPEN_PHASES = ["SCHEDULED", "NO_SHOW_REPORTED", "DISPUTE_REVIEW"] as const;
const TERMINAL = new Set(["COMPLETED", "CANCELLED", "NO_SHOW_CONFIRMED", "FORFEITED"]);

const tradeInclude = {
  listing: {
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      currentBidAmount: true,
      meetPlace: true,
      meetLat: true,
      meetLng: true,
    },
  },
  buyer: { select: { id: true, username: true } },
  seller: { select: { id: true, username: true } },
} satisfies Prisma.UsedDirectTradeInclude;

type TradeRow = Prisma.UsedDirectTradeGetPayload<{ include: typeof tradeInclude }>;

function roleOf(trade: { buyerId: string; sellerId: string }, userId: string): Role | null {
  if (trade.buyerId === userId) return "buyer";
  if (trade.sellerId === userId) return "seller";
  return null;
}

function arrivalOf(trade: TradeRow, role: Role): string {
  return role === "buyer" ? trade.buyerArrival : trade.sellerArrival;
}

async function depositStatusFor(listingId: string, userId: string): Promise<string> {
  const rows = await db.auctionDeposit.findMany({
    where: { listingId, userId },
    orderBy: { lockedAt: "desc" },
    take: 5,
    select: { status: true },
  });
  return rows.find((row) => row.status === "LOCKED")?.status ?? rows[0]?.status ?? "NONE";
}

async function toView(trade: TradeRow, userId: string): Promise<DirectTradeView | null> {
  const role = roleOf(trade, userId);
  if (!role) return null;
  const otherRole: Role = role === "buyer" ? "seller" : "buyer";
  const myArrival = arrivalOf(trade, role);
  const otherArrival = arrivalOf(trade, otherRole);
  const depositStatus = await depositStatusFor(trade.listingId, userId);
  const iAmAccused = trade.noShowUserId === userId;
  const pinReady = trade.buyerArrival === "ARRIVAL_VERIFIED" && trade.sellerArrival === "ARRIVAL_VERIFIED" && !!trade.buyerPinHmac;
  const copy = buildGuidance({
    phase: trade.phase,
    role,
    myArrival,
    otherArrival,
    iAmAccused,
    gpsAttempts: role === "buyer" ? trade.buyerGpsAttempts : trade.sellerGpsAttempts,
    pinReady,
  });
  const now = new Date();
  const gpsUsed = role === "buyer" ? trade.buyerGpsAttempts : trade.sellerGpsAttempts;
  const rangeUsed = role === "buyer" ? trade.buyerRangeAttempts : trade.sellerRangeAttempts;
  const lastVerify = role === "buyer" ? trade.buyerLastVerifyAt : trade.sellerLastVerifyAt;
  const attemptsOpen = isArrivalFailure(myArrival)
    ? gpsUsed < MEETUP_GPS_MAX_ATTEMPTS
    : rangeUsed < MEETUP_RANGE_MAX_ATTEMPTS;
  const canVerifyArrival =
    !!trade.meetAt &&
    !TERMINAL.has(trade.phase) &&
    myArrival !== "ARRIVAL_VERIFIED" &&
    attemptsOpen &&
    (!lastVerify || now.getTime() - lastVerify.getTime() >= MEETUP_VERIFY_MIN_INTERVAL_MS);
  const penalty = penaltyCode({
    phase: trade.phase,
    depositStatus,
    noShowUserId: trade.noShowUserId,
    userId,
  });

  return {
    id: trade.id,
    listingId: trade.listingId,
    roomId: trade.roomId,
    listingTitle: trade.listing.title,
    sellerUsername: trade.seller.username,
    counterpartUsername: role === "buyer" ? trade.seller.username : trade.buyer.username,
    priceLabel: formatUsedPrice(trade.listing.currentBidAmount ?? trade.listing.price, trade.listing.currency),
    meetPlace: trade.listing.meetPlace?.trim() || null,
    meetAt: trade.meetAt?.toISOString() ?? null,
    proposedMeetAt: trade.proposedMeetAt?.toISOString() ?? null,
    proposedByMe: trade.proposedById === userId,
    tradeStatus: trade.phase,
    tradeStatusLabel: phaseLabel(trade.phase),
    myArrivalStatus: myArrival,
    myArrivalLabel: arrivalLabel(myArrival),
    counterpartArrivalStatus: otherArrival,
    counterpartArrivalLabel: arrivalLabel(otherArrival),
    disputeStatus: trade.phase === "SCHEDULED" || trade.phase === "COMPLETED" || trade.phase === "CANCELLED" ? "NONE" : trade.phase,
    disputeStatusLabel: disputeLabel(trade.phase),
    depositStatus,
    depositStatusLabel: depositLabel(depositStatus),
    penaltyStatus: penalty,
    penaltyStatusLabel: penaltyLabel({
      phase: trade.phase,
      depositStatus,
      noShowUserId: trade.noShowUserId,
      userId,
    }),
    guidance: copy.guidance,
    myPin: role === "buyer" && pinReady ? openTradePin(trade.buyerPinCipher) : null,
    pinWarning: copy.pinWarning,
    canVerifyArrival,
    canReportNoShow: canReportNoShow({
      phase: trade.phase,
      reporterArrival: myArrival,
      accusedArrival: otherArrival,
      meetAt: trade.meetAt,
      now,
    }),
    canSubmitPin:
      role === "seller" &&
      pinReady &&
      !TERMINAL.has(trade.phase) &&
      trade.pinAttempts < MEETUP_PIN_MAX_ATTEMPTS,
    canProposeMeet: trade.phase === "SCHEDULED" && !trade.meetAt,
    canAcceptMeet: trade.phase === "SCHEDULED" && !!trade.proposedMeetAt && trade.proposedById !== userId && !trade.meetAt,
    canAdjustMeet:
      trade.phase === "SCHEDULED" &&
      !!trade.meetAt &&
      trade.buyerArrival !== "ARRIVAL_VERIFIED" &&
      trade.sellerArrival !== "ARRIVAL_VERIFIED" &&
      trade.meetAdjustCount < MEETUP_ADJUST_MAX,
    role,
  };
}

async function loadTrade(where: Prisma.UsedDirectTradeWhereUniqueInput): Promise<TradeRow | null> {
  return db.usedDirectTrade.findUnique({ where, include: tradeInclude });
}

async function resultFor(tradeId: string, userId: string, error?: string): Promise<DirectTradeResult> {
  const trade = await loadTrade({ id: tradeId });
  if (!trade) return { view: emptyFallback(tradeId), error: error ?? "거래를 찾을 수 없습니다." };
  const view = await toView(trade, userId);
  if (!view) return { view: emptyFallback(tradeId), error: error ?? "권한이 없습니다." };
  return error ? { view, error } : { view };
}

function emptyFallback(id: string): DirectTradeView {
  return {
    id,
    listingId: "",
    roomId: "",
    listingTitle: "",
    sellerUsername: "",
    counterpartUsername: "",
    priceLabel: "",
    meetPlace: null,
    meetAt: null,
    proposedMeetAt: null,
    proposedByMe: false,
    tradeStatus: "SCHEDULED",
    tradeStatusLabel: "거래 진행",
    myArrivalStatus: "ARRIVAL_PENDING",
    myArrivalLabel: "대기",
    counterpartArrivalStatus: "ARRIVAL_PENDING",
    counterpartArrivalLabel: "대기",
    disputeStatus: "NONE",
    disputeStatusLabel: "없음",
    depositStatus: "NONE",
    depositStatusLabel: "없음",
    penaltyStatus: "NONE",
    penaltyStatusLabel: "없음",
    guidance: null,
    myPin: null,
    pinWarning: null,
    canVerifyArrival: false,
    canReportNoShow: false,
    canSubmitPin: false,
    canProposeMeet: false,
    canAcceptMeet: false,
    canAdjustMeet: false,
    role: "buyer",
  };
}

export async function getDirectTradeView(
  userId: string,
  key: { id?: string; listingId?: string; roomId?: string }
): Promise<DirectTradeView | null> {
  const trade = key.id
    ? await loadTrade({ id: key.id })
    : key.listingId
      ? await loadTrade({ listingId: key.listingId })
      : key.roomId
        ? await loadTrade({ roomId: key.roomId })
        : null;
  if (!trade) return null;
  return toView(trade, userId);
}

export async function listDirectTradesForUser(userId: string): Promise<DirectTradeView[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const rows = await db.usedDirectTrade.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      AND: [
        {
          OR: [{ phase: { notIn: ["COMPLETED", "CANCELLED"] } }, { resolvedAt: { gte: since } }],
        },
      ],
    },
    include: tradeInclude,
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  const views: DirectTradeView[] = [];
  for (const row of rows) {
    const view = await toView(row, userId);
    if (view) views.push(view);
  }
  return views;
}

export async function ensureAuctionDirectTrade(input: {
  listingId: string;
  roomId: string;
  buyerId: string;
  sellerId: string;
}): Promise<void> {
  const listing = await db.usedListing.findUnique({
    where: { id: input.listingId },
    select: {
      saleType: true,
      meetLat: true,
      meetLng: true,
      winningBidderId: true,
      currentBidderId: true,
      sellerId: true,
    },
  });
  if (!listing || listing.saleType !== "AUCTION") return;
  if (listing.meetLat == null || listing.meetLng == null) return;
  if (!Number.isFinite(listing.meetLat) || !Number.isFinite(listing.meetLng)) return;
  const winnerId = listing.winningBidderId ?? listing.currentBidderId;
  if (!winnerId || winnerId !== input.buyerId || listing.sellerId !== input.sellerId) return;
  const existing = await db.usedDirectTrade.findUnique({ where: { listingId: input.listingId }, select: { id: true } });
  if (existing) return;
  await db.usedDirectTrade
    .create({
      data: {
        listingId: input.listingId,
        roomId: input.roomId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
      },
    })
    .catch(() => undefined);
}

async function notify(userId: string, actorId: string | undefined, title: string, body: string, link: string) {
  await createNotification({
    userId,
    actorId,
    type: "used_auction_meetup",
    title,
    body,
    link,
  });
}

async function requireParty(listingId: string, userId: string) {
  const trade = await loadTrade({ listingId });
  if (!trade) return { error: "직거래 일정이 없습니다." as const };
  const role = roleOf(trade, userId);
  if (!role) return { error: "이 거래의 당사자가 아닙니다." as const };
  return { trade, role };
}

export async function proposeDirectMeet(userId: string, listingId: string, meetAtIso: string): Promise<DirectTradeResult> {
  const loaded = await requireParty(listingId, userId);
  if ("error" in loaded) return { view: emptyFallback(listingId), error: loaded.error };
  const meetAt = new Date(meetAtIso);
  if (Number.isNaN(meetAt.getTime()) || meetAt.getTime() < Date.now() + 60_000) {
    return resultFor(loaded.trade.id, userId, "지금보다 이후 시간을 선택해 주세요.");
  }
  if (loaded.trade.phase !== "SCHEDULED" || loaded.trade.meetAt) {
    return resultFor(loaded.trade.id, userId, "이미 약속 시간이 있습니다.");
  }
  if (loaded.trade.proposedMeetAt && loaded.trade.proposedById && loaded.trade.proposedById !== userId) {
    return resultFor(loaded.trade.id, userId, "상대방이 제안한 시간을 먼저 수락해 주세요.");
  }
  await db.usedDirectTrade.update({
    where: { id: loaded.trade.id },
    data: { proposedMeetAt: meetAt, proposedById: userId },
  });
  const otherId = loaded.role === "buyer" ? loaded.trade.sellerId : loaded.trade.buyerId;
  await notify(otherId, userId, "거래 약속", `${loaded.trade.listing.title} 약속 시간을 확인해 주세요.`, `/messages/${loaded.trade.roomId}`);
  return resultFor(loaded.trade.id, userId);
}

export async function acceptDirectMeet(userId: string, listingId: string): Promise<DirectTradeResult> {
  const loaded = await requireParty(listingId, userId);
  if ("error" in loaded) return { view: emptyFallback(listingId), error: loaded.error };
  if (!loaded.trade.proposedMeetAt || loaded.trade.proposedById === userId || loaded.trade.meetAt) {
    return resultFor(loaded.trade.id, userId, "수락할 약속이 없습니다.");
  }
  if (loaded.trade.phase !== "SCHEDULED") {
    return resultFor(loaded.trade.id, userId, "지금은 약속을 수락할 수 없습니다.");
  }
  await db.usedDirectTrade.update({
    where: { id: loaded.trade.id },
    data: {
      meetAt: loaded.trade.proposedMeetAt,
      proposedMeetAt: null,
      proposedById: null,
    },
  });
  const otherId = loaded.trade.proposedById;
  if (otherId) {
    await notify(otherId, userId, "거래 수락", `${loaded.trade.listing.title} 약속 시간이 확정되었습니다.`, `/messages/${loaded.trade.roomId}`);
  }
  return resultFor(loaded.trade.id, userId);
}

export async function adjustDirectMeet(
  userId: string,
  listingId: string,
  direction: "earlier" | "later"
): Promise<DirectTradeResult> {
  const loaded = await requireParty(listingId, userId);
  if ("error" in loaded) return { view: emptyFallback(listingId), error: loaded.error };
  const { trade } = loaded;
  if (trade.phase !== "SCHEDULED" || !trade.meetAt) {
    return resultFor(trade.id, userId, "확정된 약속이 없습니다.");
  }
  if (trade.buyerArrival === "ARRIVAL_VERIFIED" || trade.sellerArrival === "ARRIVAL_VERIFIED") {
    return resultFor(trade.id, userId, "도착 인증 이후에는 시간을 바꿀 수 없습니다.");
  }
  if (trade.meetAdjustCount >= MEETUP_ADJUST_MAX) {
    return resultFor(trade.id, userId, "약속 시간 변경 횟수를 모두 사용했습니다.");
  }
  const delta = MEETUP_ADJUST_MINUTES * 60_000 * (direction === "later" ? 1 : -1);
  const next = new Date(trade.meetAt.getTime() + delta);
  if (next.getTime() < Date.now() + 60_000) {
    return resultFor(trade.id, userId, "약속 시간은 현재보다 뒤여야 합니다.");
  }
  await db.usedDirectTrade.update({
    where: { id: trade.id },
    data: {
      meetAt: next,
      meetAdjustCount: { increment: 1 },
      buyerArrival: "ARRIVAL_PENDING",
      sellerArrival: "ARRIVAL_PENDING",
      buyerArrivalAt: null,
      sellerArrivalAt: null,
      buyerDistanceBucket: null,
      sellerDistanceBucket: null,
      buyerAccuracyBucket: null,
      sellerAccuracyBucket: null,
      buyerGpsAttempts: 0,
      sellerGpsAttempts: 0,
      buyerRangeAttempts: 0,
      sellerRangeAttempts: 0,
      buyerLastVerifyAt: null,
      sellerLastVerifyAt: null,
      buyerPinCipher: null,
      buyerPinHmac: null,
      pinAttempts: 0,
      pinsIssuedAt: null,
    },
  });
  const otherId = loaded.role === "buyer" ? trade.sellerId : trade.buyerId;
  await notify(otherId, userId, "약속 시간 변경", `${trade.listing.title} 약속이 15분 ${direction === "later" ? "늦춰" : "당겨"}졌습니다.`, `/messages/${trade.roomId}`);
  return resultFor(trade.id, userId);
}

function partyPatch(role: Role, patch: {
  status: "ARRIVAL_PENDING" | "ARRIVAL_VERIFIED" | "ARRIVAL_GPS_FAILED" | "ARRIVAL_PERMISSION_DENIED" | "ARRIVAL_LOW_ACCURACY";
  at: Date | null;
  distanceBucket: string | null;
  accuracyBucket: string | null;
  gpsInc: number;
  rangeInc: number;
  now: Date;
}): Prisma.UsedDirectTradeUpdateInput {
  if (role === "buyer") {
    return {
      buyerArrival: patch.status,
      buyerArrivalAt: patch.at,
      buyerDistanceBucket: patch.distanceBucket,
      buyerAccuracyBucket: patch.accuracyBucket,
      buyerGpsAttempts: patch.gpsInc ? { increment: patch.gpsInc } : undefined,
      buyerRangeAttempts: patch.rangeInc ? { increment: patch.rangeInc } : undefined,
      buyerLastVerifyAt: patch.now,
    };
  }
  return {
    sellerArrival: patch.status,
    sellerArrivalAt: patch.at,
    sellerDistanceBucket: patch.distanceBucket,
    sellerAccuracyBucket: patch.accuracyBucket,
    sellerGpsAttempts: patch.gpsInc ? { increment: patch.gpsInc } : undefined,
    sellerRangeAttempts: patch.rangeInc ? { increment: patch.rangeInc } : undefined,
    sellerLastVerifyAt: patch.now,
  };
}

async function issuePins(tx: Tx, trade: { id: string; buyerId: string; buyerPinHmac: string | null; buyerArrival: string; sellerArrival: string; phase: string }) {
  if (trade.buyerArrival !== "ARRIVAL_VERIFIED" || trade.sellerArrival !== "ARRIVAL_VERIFIED") return;
  if (trade.buyerPinHmac || TERMINAL.has(trade.phase)) return;
  const pin = generateTradePin();
  const cipher = sealTradePin(pin);
  if (!cipher) {
    safeLogWarn("direct-trade", { tradeId: trade.id, error: "pin_encrypt_unavailable" });
    return;
  }
  const hmac = tradePinHmac(trade.id, trade.buyerId, pin);
  await tx.usedDirectTrade.update({
    where: { id: trade.id },
    data: { buyerPinCipher: cipher, buyerPinHmac: hmac, pinsIssuedAt: new Date() },
  });
}

export async function verifyDirectArrival(
  userId: string,
  listingId: string,
  sample: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number | null;
    failure?: "PERMISSION_DENIED" | "GPS_FAILED";
  }
): Promise<DirectTradeResult> {
  const loaded = await requireParty(listingId, userId);
  if ("error" in loaded) return { view: emptyFallback(listingId), error: loaded.error };
  const now = new Date();
  const role = loaded.role;
  const gpsUsed = role === "buyer" ? loaded.trade.buyerGpsAttempts : loaded.trade.sellerGpsAttempts;
  const rangeUsed = role === "buyer" ? loaded.trade.buyerRangeAttempts : loaded.trade.sellerRangeAttempts;
  const lastVerify = role === "buyer" ? loaded.trade.buyerLastVerifyAt : loaded.trade.sellerLastVerifyAt;
  const myArrival = arrivalOf(loaded.trade, role);

  if (!loaded.trade.meetAt) return resultFor(loaded.trade.id, userId, "약속 시간을 먼저 확정해 주세요.");
  if (TERMINAL.has(loaded.trade.phase)) return resultFor(loaded.trade.id, userId, "이미 종료된 거래입니다.");
  if (myArrival === "ARRIVAL_VERIFIED") return resultFor(loaded.trade.id, userId, "이미 도착이 인증되었습니다.");
  if (lastVerify && now.getTime() - lastVerify.getTime() < MEETUP_VERIFY_MIN_INTERVAL_MS) {
    return resultFor(loaded.trade.id, userId, "잠시 후 다시 시도해 주세요.");
  }

  const meetLat = loaded.trade.listing.meetLat;
  const meetLng = loaded.trade.listing.meetLng;
  let status: "ARRIVAL_PENDING" | "ARRIVAL_VERIFIED" | "ARRIVAL_GPS_FAILED" | "ARRIVAL_PERMISSION_DENIED" | "ARRIVAL_LOW_ACCURACY" =
    "ARRIVAL_GPS_FAILED";
  let distanceBucket: string | null = "UNKNOWN";
  let accuracyBucket: string | null = "UNKNOWN";
  let gpsInc = 0;
  let rangeInc = 0;
  let message: string | null = MEETUP_GPS_RETRY_MESSAGE;
  let at: Date | null = null;

  if (sample.failure === "PERMISSION_DENIED") {
    status = "ARRIVAL_PERMISSION_DENIED";
    gpsInc = 1;
    message = "위치 권한이 없어 도착을 확인하지 못했습니다. 권한을 허용한 뒤 다시 인증해 주세요. 보증금은 차감되지 않습니다.";
  } else if (sample.failure === "GPS_FAILED" || meetLat == null || meetLng == null || sample.latitude == null || sample.longitude == null) {
    status = "ARRIVAL_GPS_FAILED";
    gpsInc = 1;
  } else {
    const classified = classifyArrivalSample({
      lat: sample.latitude,
      lng: sample.longitude,
      accuracyMeters: sample.accuracyMeters ?? null,
      meetLat,
      meetLng,
    });
    distanceBucket = classified.distanceBucket;
    accuracyBucket = classified.accuracyBucket;
    if (classified.kind === "verified") {
      status = "ARRIVAL_VERIFIED";
      at = now;
      message = null;
    } else if (classified.kind === "out_of_range") {
      status = "ARRIVAL_PENDING";
      rangeInc = 1;
      message = "약속 장소에서 50m 이내가 아닙니다. 장소에 도착한 뒤 다시 인증해 주세요.";
    } else if (classified.kind === "low_accuracy") {
      status = "ARRIVAL_LOW_ACCURACY";
      gpsInc = 1;
    } else {
      status = "ARRIVAL_GPS_FAILED";
      gpsInc = 1;
    }
  }

  if (gpsInc && gpsUsed >= MEETUP_GPS_MAX_ATTEMPTS) {
    return resultFor(loaded.trade.id, userId, "위치 확인 횟수를 모두 사용했습니다. 보증금은 차감되지 않습니다.");
  }
  if (rangeInc && rangeUsed >= MEETUP_RANGE_MAX_ATTEMPTS) {
    return resultFor(loaded.trade.id, userId, "도착 인증 횟수를 모두 사용했습니다.");
  }

  const otherArrival = arrivalOf(loaded.trade, role === "buyer" ? "seller" : "buyer");
  const nextBuyer = role === "buyer" ? status : loaded.trade.buyerArrival;
  const nextSeller = role === "seller" ? status : loaded.trade.sellerArrival;
  let phase = loaded.trade.phase;
  let clearNoShow = false;
  if (OPEN_PHASES.includes(phase as (typeof OPEN_PHASES)[number])) {
    if (nextBuyer === "ARRIVAL_VERIFIED" && nextSeller === "ARRIVAL_VERIFIED") {
      phase = "SCHEDULED";
      clearNoShow = loaded.trade.phase === "NO_SHOW_REPORTED" || loaded.trade.phase === "DISPUTE_REVIEW";
    } else if (
      (nextBuyer === "ARRIVAL_VERIFIED" && nextSeller === "ARRIVAL_PENDING") ||
      (nextSeller === "ARRIVAL_VERIFIED" && nextBuyer === "ARRIVAL_PENDING")
    ) {
      if (phase === "DISPUTE_REVIEW") {
        phase = "SCHEDULED";
        clearNoShow = true;
      }
    } else if (
      (isArrivalFailure(nextBuyer) && isArrivalFailure(nextSeller)) ||
      (nextBuyer === "ARRIVAL_VERIFIED" && isArrivalFailure(nextSeller)) ||
      (nextSeller === "ARRIVAL_VERIFIED" && isArrivalFailure(nextBuyer))
    ) {
      phase = "DISPUTE_REVIEW";
      clearNoShow = true;
    } else if (status === "ARRIVAL_VERIFIED" && loaded.trade.phase === "NO_SHOW_REPORTED" && loaded.trade.noShowUserId === userId) {
      phase = "SCHEDULED";
      clearNoShow = true;
    }
  }

  await db.$transaction(async (tx) => {
    await tx.usedDirectTrade.update({
      where: { id: loaded.trade.id },
      data: {
        ...partyPatch(role, { status, at, distanceBucket, accuracyBucket, gpsInc, rangeInc, now }),
        phase,
        ...(clearNoShow
          ? {
              noShowReportedById: null,
              noShowUserId: null,
              noShowReportedAt: null,
              noShowResponseDueAt: null,
            }
          : {}),
      },
    });
    if (nextBuyer === "ARRIVAL_VERIFIED" && nextSeller === "ARRIVAL_VERIFIED") {
      await issuePins(tx, {
        id: loaded.trade.id,
        buyerId: loaded.trade.buyerId,
        buyerPinHmac: loaded.trade.buyerPinHmac,
        buyerArrival: "ARRIVAL_VERIFIED",
        sellerArrival: "ARRIVAL_VERIFIED",
        phase,
      });
    }
  });

  safeLogInfo("direct-trade-arrival", {
    tradeId: loaded.trade.id,
    status,
    phase,
  });

  if (phase === "DISPUTE_REVIEW" && loaded.trade.phase !== "DISPUTE_REVIEW") {
    const link = `/messages/${loaded.trade.roomId}`;
    await notify(loaded.trade.buyerId, undefined, "분쟁 검토", `${loaded.trade.listing.title} — 위치를 확정할 수 없어 보류했습니다. 보증금은 차감되지 않습니다.`, link);
    await notify(loaded.trade.sellerId, undefined, "분쟁 검토", `${loaded.trade.listing.title} — 위치를 확정할 수 없어 보류했습니다. 보증금은 차감되지 않습니다.`, link);
  } else if (clearNoShow && status === "ARRIVAL_VERIFIED" && otherArrival === "ARRIVAL_VERIFIED") {
    await notify(
      role === "buyer" ? loaded.trade.sellerId : loaded.trade.buyerId,
      userId,
      "도착 인증",
      `${loaded.trade.listing.title} — 상대방도 도착했습니다. 암호코드로 거래를 완료해 주세요.`,
      `/messages/${loaded.trade.roomId}`
    );
  }

  return resultFor(loaded.trade.id, userId, message ?? undefined);
}

export async function reportDirectNoShow(userId: string, listingId: string): Promise<DirectTradeResult> {
  const loaded = await requireParty(listingId, userId);
  if ("error" in loaded) return { view: emptyFallback(listingId), error: loaded.error };
  const role = loaded.role;
  const otherRole: Role = role === "buyer" ? "seller" : "buyer";
  if (
    !canReportNoShow({
      phase: loaded.trade.phase,
      reporterArrival: arrivalOf(loaded.trade, role),
      accusedArrival: arrivalOf(loaded.trade, otherRole),
      meetAt: loaded.trade.meetAt,
      now: new Date(),
    })
  ) {
    return resultFor(loaded.trade.id, userId, "지금은 노쇼로 신고할 수 없습니다.");
  }
  const accusedId = otherRole === "buyer" ? loaded.trade.buyerId : loaded.trade.sellerId;
  const due = new Date(Date.now() + MEETUP_NOSHOW_RESPONSE_MINUTES * 60_000);
  const marked = await db.usedDirectTrade.updateMany({
    where: { id: loaded.trade.id, phase: "SCHEDULED" },
    data: {
      phase: "NO_SHOW_REPORTED",
      noShowReportedById: userId,
      noShowUserId: accusedId,
      noShowReportedAt: new Date(),
      noShowResponseDueAt: due,
    },
  });
  if (marked.count === 0) return resultFor(loaded.trade.id, userId, "이미 처리 중인 신고가 있습니다.");
  await notify(accusedId, userId, "현장 도착 인증", MEETUP_NOSHOW_ALERT, `/messages/${loaded.trade.roomId}`);
  return resultFor(loaded.trade.id, userId);
}

async function lockedDeposit(tx: Tx, listingId: string, userId: string) {
  return tx.auctionDeposit.findFirst({
    where: { listingId, userId, status: "LOCKED" },
    orderBy: { lockedAt: "desc" },
  });
}

async function finishCompleted(trade: TradeRow) {
  await db.$transaction(async (tx) => {
    const marked = await tx.usedDirectTrade.updateMany({
      where: {
        id: trade.id,
        phase: { in: [...OPEN_PHASES] },
        buyerArrival: "ARRIVAL_VERIFIED",
        sellerArrival: "ARRIVAL_VERIFIED",
      },
      data: {
        phase: "COMPLETED",
        resolvedAt: new Date(),
        buyerPinCipher: null,
        buyerPinHmac: null,
        pinsClearedAt: new Date(),
        noShowReportedById: null,
        noShowUserId: null,
        noShowReportedAt: null,
        noShowResponseDueAt: null,
      },
    });
    if (marked.count === 0) {
      const current = await tx.usedDirectTrade.findUnique({ where: { id: trade.id }, select: { phase: true } });
      if (current?.phase === "COMPLETED") return;
      throw new Error("TRADE_NOT_READY");
    }
    const buyerDeposit = await lockedDeposit(tx, trade.listingId, trade.buyerId);
    const sellerDeposit = await lockedDeposit(tx, trade.listingId, trade.sellerId);
    if (!buyerDeposit || !sellerDeposit) throw new Error("DEPOSIT_NOT_LOCKED");
    await refundLockedDepositInTransaction(tx, buyerDeposit.id, "direct_trade_completed", { strict: true });
    await refundLockedDepositInTransaction(tx, sellerDeposit.id, "direct_trade_completed", { strict: true });
    const now = new Date();
    await tx.usedListing.update({
      where: { id: trade.listingId },
      data: {
        status: "SOLD",
        sellerTradeConfirmedAt: now,
        buyerTradeConfirmedAt: now,
      },
    });
  });
  void finalizeUsedListingSold(trade.listingId).catch(() => undefined);
}

export async function submitDirectTradePin(userId: string, listingId: string, pin: string): Promise<DirectTradeResult> {
  const loaded = await requireParty(listingId, userId);
  if ("error" in loaded) return { view: emptyFallback(listingId), error: loaded.error };
  if (loaded.role !== "seller") return resultFor(loaded.trade.id, userId, "판매자가 암호코드를 입력합니다.");
  if (!/^\d{6}$/.test(pin)) return resultFor(loaded.trade.id, userId, "암호코드 6자리를 입력해 주세요.");
  if (!loaded.trade.buyerPinHmac) return resultFor(loaded.trade.id, userId, "아직 암호코드가 발급되지 않았습니다.");
  if (TERMINAL.has(loaded.trade.phase)) return resultFor(loaded.trade.id, userId, "이미 종료된 거래입니다.");
  if (loaded.trade.pinAttempts >= MEETUP_PIN_MAX_ATTEMPTS) {
    return resultFor(loaded.trade.id, userId, "입력 횟수를 초과했습니다. 보증금은 차감되지 않습니다.");
  }

  const hmac = tradePinHmac(loaded.trade.id, loaded.trade.buyerId, pin);
  if (!tradePinMatches(loaded.trade.buyerPinHmac, hmac)) {
    const nextAttempts = loaded.trade.pinAttempts + 1;
    await db.usedDirectTrade.update({
      where: { id: loaded.trade.id },
      data: {
        pinAttempts: { increment: 1 },
        ...(nextAttempts >= MEETUP_PIN_MAX_ATTEMPTS ? { phase: "DISPUTE_REVIEW" } : {}),
      },
    });
    if (nextAttempts >= MEETUP_PIN_MAX_ATTEMPTS) {
      return resultFor(loaded.trade.id, userId, "입력 횟수를 초과했습니다. 분쟁 검토로 넘겼고 보증금은 차감되지 않습니다.");
    }
    return resultFor(loaded.trade.id, userId, "암호코드가 일치하지 않습니다.");
  }

  try {
    await finishCompleted(loaded.trade);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "DEPOSIT_NOT_LOCKED" || message === "DEPOSIT_AMOUNT_MISMATCH" || message === "REFUND_BALANCE_MISMATCH") {
      await db.usedDirectTrade.updateMany({
        where: { id: loaded.trade.id, phase: { in: [...OPEN_PHASES] } },
        data: { phase: "DISPUTE_REVIEW" },
      });
      safeLogWarn("direct-trade-complete", { tradeId: loaded.trade.id, error: message });
      return resultFor(loaded.trade.id, userId, "보증금 상태를 확인할 수 없어 분쟁 검토로 넘겼습니다. 보증금은 차감되지 않습니다.");
    }
    if (message === "TRADE_NOT_READY") return resultFor(loaded.trade.id, userId);
    throw error;
  }

  const link = `/messages/${loaded.trade.roomId}`;
  await notify(loaded.trade.buyerId, userId, "거래 완료", `${loaded.trade.listing.title} 거래가 완료되어 보증금 2 MOCO가 돌아왔습니다.`, link);
  await notify(loaded.trade.sellerId, userId, "거래 완료", `${loaded.trade.listing.title} 거래가 완료되어 보증금 2 MOCO가 돌아왔습니다.`, link);
  return resultFor(loaded.trade.id, userId);
}

async function confirmNoShow(trade: TradeRow): Promise<"confirmed" | "review" | "resume" | "wait"> {
  if (!trade.noShowResponseDueAt || trade.noShowResponseDueAt.getTime() > Date.now()) return "wait";
  if (!trade.noShowReportedById || !trade.noShowUserId) return "review";
  const reporterArrival = trade.noShowReportedById === trade.buyerId ? trade.buyerArrival : trade.sellerArrival;
  const accusedArrival = trade.noShowUserId === trade.buyerId ? trade.buyerArrival : trade.sellerArrival;
  const decision = evaluateNoShowDeadline(reporterArrival, accusedArrival);
  if (decision === "RESUME") {
    await db.usedDirectTrade.updateMany({
      where: { id: trade.id, phase: "NO_SHOW_REPORTED" },
      data: {
        phase: "SCHEDULED",
        noShowReportedById: null,
        noShowUserId: null,
        noShowReportedAt: null,
        noShowResponseDueAt: null,
      },
    });
    return "resume";
  }
  if (decision === "REVIEW") {
    await db.usedDirectTrade.updateMany({
      where: { id: trade.id, phase: "NO_SHOW_REPORTED" },
      data: {
        phase: "DISPUTE_REVIEW",
        noShowReportedById: null,
        noShowUserId: null,
        noShowReportedAt: null,
        noShowResponseDueAt: null,
      },
    });
    return "review";
  }

  try {
    await db.$transaction(async (tx) => {
      const fresh = await tx.usedDirectTrade.findUnique({ where: { id: trade.id } });
      if (!fresh || fresh.phase !== "NO_SHOW_REPORTED" || !fresh.noShowUserId || !fresh.noShowReportedById) {
        throw new Error("TRADE_NOT_READY");
      }
      const accusedIsBuyer = fresh.noShowUserId === fresh.buyerId;
      const accusedArrivalNow = accusedIsBuyer ? fresh.buyerArrival : fresh.sellerArrival;
      const reporterArrivalNow = fresh.noShowReportedById === fresh.buyerId ? fresh.buyerArrival : fresh.sellerArrival;
      if (evaluateNoShowDeadline(reporterArrivalNow, accusedArrivalNow) !== "CONFIRM") {
        throw new Error("TRADE_NOT_READY");
      }
      const marked = await tx.usedDirectTrade.updateMany({
        where: { id: fresh.id, phase: "NO_SHOW_REPORTED" },
        data: {
          phase: "NO_SHOW_CONFIRMED",
          resolvedAt: new Date(),
          buyerPinCipher: null,
          buyerPinHmac: null,
          pinsClearedAt: new Date(),
        },
      });
      if (marked.count === 0) throw new Error("TRADE_NOT_READY");
      const accused = await lockedDeposit(tx, fresh.listingId, fresh.noShowUserId);
      const reporter = await lockedDeposit(tx, fresh.listingId, fresh.noShowReportedById);
      if (!accused || !reporter) throw new Error("DEPOSIT_NOT_LOCKED");
      const forfeited = await forfeitLockedDepositInTransaction(tx, {
        depositId: accused.id,
        sellerId: fresh.sellerId,
        listingId: fresh.listingId,
        note: "direct_trade_no_show",
      });
      if (!forfeited.forfeited) throw new Error("DEPOSIT_NOT_LOCKED");
      await refundLockedDepositInTransaction(tx, reporter.id, "direct_trade_counterparty_no_show", { strict: true });
      await tx.usedListing.update({
        where: { id: fresh.listingId },
        data: { status: "SOLD" },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "TRADE_NOT_READY") return "wait";
    await db.usedDirectTrade.updateMany({
      where: { id: trade.id, phase: "NO_SHOW_REPORTED" },
      data: { phase: "DISPUTE_REVIEW" },
    });
    safeLogWarn("direct-trade-noshow", { tradeId: trade.id, error: message || "noshow_failed" });
    return "review";
  }

  const link = `/market/${trade.listingId}`;
  await notify(trade.buyerId, undefined, "노쇼 확정", `${trade.listing.title} 노쇼가 확정되어 거래가 종료되었습니다.`, link);
  await notify(trade.sellerId, undefined, "노쇼 확정", `${trade.listing.title} 노쇼가 확정되어 거래가 종료되었습니다.`, link);
  return "confirmed";
}

export async function sweepDirectTrades(now = new Date(), limit = 40): Promise<{ scanned: number; reviewed: number; confirmed: number }> {
  const graceMs = MEETUP_NOSHOW_GRACE_MINUTES * 60_000;
  const rows = await db.usedDirectTrade.findMany({
    where: {
      OR: [
        { phase: "SCHEDULED", meetAt: { lte: new Date(now.getTime() - graceMs) } },
        { phase: "NO_SHOW_REPORTED", noShowResponseDueAt: { lte: now } },
      ],
    },
    include: tradeInclude,
    orderBy: { meetAt: "asc" },
    take: limit,
  });

  let reviewed = 0;
  let confirmed = 0;
  for (const trade of rows) {
    try {
      if (trade.phase === "NO_SHOW_REPORTED") {
        const outcome = await confirmNoShow(trade);
        if (outcome === "confirmed") confirmed += 1;
        if (outcome === "review") reviewed += 1;
        continue;
      }
      const decision = evaluateGraceWindow(trade.buyerArrival, trade.sellerArrival);
      if (decision === "PIN") {
        await db.$transaction(async (tx) => {
          await issuePins(tx, trade);
        });
        continue;
      }
      if (decision === "WAIT_REPORT") continue;
      const marked = await db.usedDirectTrade.updateMany({
        where: { id: trade.id, phase: "SCHEDULED" },
        data: { phase: "DISPUTE_REVIEW" },
      });
      if (marked.count > 0) {
        reviewed += 1;
        const link = `/messages/${trade.roomId}`;
        const body = `${trade.listing.title} — 도착을 확정할 수 없어 보류했습니다. 보증금은 차감되지 않습니다.`;
        await notify(trade.buyerId, undefined, "분쟁 검토", body, link);
        await notify(trade.sellerId, undefined, "분쟁 검토", body, link);
      }
    } catch (error) {
      safeLogWarn("direct-trade-sweep", {
        tradeId: trade.id,
        error: error instanceof Error ? error.message : "sweep_failed",
      });
    }
  }
  return { scanned: rows.length, reviewed, confirmed };
}
