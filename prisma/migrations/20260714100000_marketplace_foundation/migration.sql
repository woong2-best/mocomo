-- Marketplace enums
CREATE TYPE "MarketplaceSellerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
CREATE TYPE "MarketplaceListingType" AS ENUM ('PHYSICAL', 'CUSTOM_ORDER', 'DIGITAL', 'PREORDER');
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'PAUSED', 'REMOVED');
CREATE TYPE "MarketplaceShippingFeeType" AS ENUM ('FREE', 'FIXED', 'BY_COUNTRY', 'BY_WEIGHT', 'FREE_OVER_AMOUNT');
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "MarketplaceShipmentStatus" AS ENUM ('PREPARING', 'SHIPPED', 'IN_CUSTOMS', 'IN_TRANSIT', 'DELIVERED');
CREATE TYPE "MarketplaceRefundStatus" AS ENUM ('REQUESTED', 'SELLER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "MarketplaceDisputeStatus" AS ENUM ('OPEN', 'EVIDENCE', 'REVIEWING', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED');

CREATE TABLE IF NOT EXISTS "MarketplaceSellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "snsLinks" JSONB,
    "status" "MarketplaceSellerStatus" NOT NULL DEFAULT 'PENDING',
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION,
    "avgShipDays" DOUBLE PRECISION,
    "returnCountry" TEXT,
    "returnPostal" TEXT,
    "returnAddress1" TEXT,
    "returnAddress2" TEXT,
    "returnPhone" TEXT,
    "applyReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceSellerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceSellerProfile_userId_key" ON "MarketplaceSellerProfile"("userId");
CREATE INDEX IF NOT EXISTS "MarketplaceSellerProfile_status_createdAt_idx" ON "MarketplaceSellerProfile"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerProfileId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MarketplaceListingType" NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'krw',
    "stock" INTEGER NOT NULL DEFAULT 1,
    "options" JSONB,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "coverUrl" TEXT,
    "productionDays" INTEGER,
    "digitalFileUrl" TEXT,
    "digitalDownloadLimit" INTEGER,
    "digitalExpiresDays" INTEGER,
    "shipsWorldwide" BOOLEAN NOT NULL DEFAULT true,
    "shippingMethods" TEXT[],
    "shippingFeeType" "MarketplaceShippingFeeType" NOT NULL DEFAULT 'FIXED',
    "shippingFeeFixed" INTEGER NOT NULL DEFAULT 0,
    "freeShippingOver" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketplaceListing_status_type_createdAt_idx" ON "MarketplaceListing"("status", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_sellerId_status_idx" ON "MarketplaceListing"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_category_status_idx" ON "MarketplaceListing"("category", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_priceAmount_idx" ON "MarketplaceListing"("priceAmount");

CREATE TABLE IF NOT EXISTS "MarketplaceListingMedia" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceListingMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceListingMedia_listingId_sortOrder_idx" ON "MarketplaceListingMedia"("listingId", "sortOrder");

CREATE TABLE IF NOT EXISTS "MarketplaceFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceFavorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceFavorite_userId_listingId_key" ON "MarketplaceFavorite"("userId", "listingId");
CREATE INDEX IF NOT EXISTS "MarketplaceFavorite_listingId_idx" ON "MarketplaceFavorite"("listingId");

CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerProfileId" TEXT,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "subtotalAmount" INTEGER NOT NULL,
    "shippingAmount" INTEGER NOT NULL DEFAULT 0,
    "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "sellerEarnAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'krw',
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "autoConfirmAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "shipName" TEXT,
    "shipCountry" TEXT,
    "shipPostal" TEXT,
    "shipAddress1" TEXT,
    "shipAddress2" TEXT,
    "shipPhone" TEXT,
    "buyerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_buyerId_createdAt_idx" ON "MarketplaceOrder"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_sellerId_status_createdAt_idx" ON "MarketplaceOrder"("sellerId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_status_autoConfirmAt_idx" ON "MarketplaceOrder"("status", "autoConfirmAt");

CREATE TABLE IF NOT EXISTS "MarketplaceOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "optionSnapshot" JSONB,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "listingType" "MarketplaceListingType" NOT NULL,
    CONSTRAINT "MarketplaceOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_listingId_idx" ON "MarketplaceOrderItem"("listingId");
CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_orderId_idx" ON "MarketplaceOrderItem"("orderId");

CREATE TABLE IF NOT EXISTS "MarketplaceShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "status" "MarketplaceShipmentStatus" NOT NULL DEFAULT 'PREPARING',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceShipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceShipment_orderId_key" ON "MarketplaceShipment"("orderId");
CREATE INDEX IF NOT EXISTS "MarketplaceShipment_trackingNumber_idx" ON "MarketplaceShipment"("trackingNumber");

CREATE TABLE IF NOT EXISTS "MarketplaceRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "MarketplaceRefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "amount" INTEGER NOT NULL,
    "stripeRefundId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceRefund_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceRefund_orderId_status_idx" ON "MarketplaceRefund"("orderId", "status");

CREATE TABLE IF NOT EXISTS "MarketplaceDispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "openerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" "MarketplaceDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceDispute_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceDispute_orderId_status_idx" ON "MarketplaceDispute"("orderId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceDispute_status_createdAt_idx" ON "MarketplaceDispute"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "MarketplaceReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "mediaUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceReview_orderId_key" ON "MarketplaceReview"("orderId");
CREATE INDEX IF NOT EXISTS "MarketplaceReview_listingId_createdAt_idx" ON "MarketplaceReview"("listingId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceReview_authorId_idx" ON "MarketplaceReview"("authorId");

DO $$ BEGIN ALTER TABLE "MarketplaceSellerProfile" ADD CONSTRAINT "MarketplaceSellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "MarketplaceSellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceListingMedia" ADD CONSTRAINT "MarketplaceListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceFavorite" ADD CONSTRAINT "MarketplaceFavorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "MarketplaceSellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceOrderItem" ADD CONSTRAINT "MarketplaceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceOrderItem" ADD CONSTRAINT "MarketplaceOrderItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceShipment" ADD CONSTRAINT "MarketplaceShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceRefund" ADD CONSTRAINT "MarketplaceRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceDispute" ADD CONSTRAINT "MarketplaceDispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceDispute" ADD CONSTRAINT "MarketplaceDispute_openerId_fkey" FOREIGN KEY ("openerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
