-- Creator 1:1 call booking (paid, scheduled, escrow)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creatorCallEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creatorCallRateKrwPerHour" INTEGER;

ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'CALL_BOOKING';

CREATE TYPE "CallBookingStatus" AS ENUM (
  'PAYMENT_PENDING',
  'PENDING_CREATOR',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
  'REFUND_REQUESTED',
  'REFUNDED',
  'EXPIRED'
);

CREATE TYPE "CallBookingRefundStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'COMPLETED'
);

CREATE TABLE "CreatorCallBooking" (
  "id" TEXT NOT NULL,
  "fanId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "chatRoomId" TEXT NOT NULL,
  "callType" "CallType" NOT NULL DEFAULT 'AUDIO',
  "scheduledStartAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "amountKrw" INTEGER NOT NULL,
  "status" "CallBookingStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
  "paymentIntentId" TEXT,
  "fanNote" VARCHAR(500),
  "creatorNote" VARCHAR(500),
  "confirmedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreatorCallBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallBookingRefund" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "CallBookingRefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "stripeRefundId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CallBookingRefund_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VoiceCall" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorCallBooking_paymentIntentId_key" ON "CreatorCallBooking"("paymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceCall_bookingId_key" ON "VoiceCall"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "CallBookingRefund_bookingId_key" ON "CallBookingRefund"("bookingId");

CREATE INDEX IF NOT EXISTS "CreatorCallBooking_fanId_status_idx" ON "CreatorCallBooking"("fanId", "status");
CREATE INDEX IF NOT EXISTS "CreatorCallBooking_creatorId_status_idx" ON "CreatorCallBooking"("creatorId", "status");
CREATE INDEX IF NOT EXISTS "CreatorCallBooking_chatRoomId_createdAt_idx" ON "CreatorCallBooking"("chatRoomId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreatorCallBooking_scheduledStartAt_status_idx" ON "CreatorCallBooking"("scheduledStartAt", "status");

ALTER TABLE "CreatorCallBooking"
  ADD CONSTRAINT "CreatorCallBooking_fanId_fkey"
  FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorCallBooking"
  ADD CONSTRAINT "CreatorCallBooking_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorCallBooking"
  ADD CONSTRAINT "CreatorCallBooking_chatRoomId_fkey"
  FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallBookingRefund"
  ADD CONSTRAINT "CallBookingRefund_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "CreatorCallBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoiceCall"
  ADD CONSTRAINT "VoiceCall_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "CreatorCallBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
