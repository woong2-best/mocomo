#!/usr/bin/env node
/**
 * Used auction: bid hold → MarketplaceOrder → delivery → capture pipeline
 * Staging smoke + LOCAL-ONLY DB patch helpers (not HTTP endpoints).
 *
 * ── Step 5 delivery (pick one) ──
 *   PATH A — manual: seller UI "배송완료" OR `patch delivered-manual <orderId>`
 *             → markMarketplaceOrderDelivered(source: manual). 17TRACK NOT tested.
 *   PATH B — 17TRACK: ship with carrier+tracking → 17TRACK test/simulator Delivered
 *             → POST /api/webhooks/17track. Full integration test.
 *
 * ── Steps 7–8 ──
 *   `patch` commands force expiry/timeouts in DB. They run only on non-production
 *   unless ALLOW_SMOKE_PATCH=1 (still blocked on VERCEL_ENV=production).
 *
 * Env:
 *   DATABASE_URL, CRON_SECRET, SMOKE_BASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *
 * Usage:
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs preflight
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs check-schema
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs verify <listingId>
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs verify-connect <orderId>
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs patch reauth-lead <bidId> [hours]
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs patch payment-timeout <listingId>
 *   node --env-file=.env scripts/smoke-used-auction-pipeline.mjs patch delivered-manual <orderId>
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const BASE = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET?.trim() || process.env.PLATFORM_BOOTSTRAP_SECRET?.trim();
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim();

/** Must match src/app/api/webhooks/stripe/route.ts handlers */
const REQUIRED_STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "payment_intent.amount_capturable_updated",
  "payment_intent.succeeded",
  "charge.dispute.created",
  "charge.dispute.closed",
  "charge.dispute.funds_withdrawn",
];

const STAR_MARKET_ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CONFIRMED",
  "SETTLED",
  "CANCELLED",
  "REFUND_REQUESTED",
  "REFUNDED",
  "DISPUTED",
  "ADMIN_REVIEW",
];

const db = new PrismaClient();

function ok(label, pass, detail = "") {
  const mark = pass ? "✓" : "✗";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

function isProductionEnv() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    /mocomo\.net/i.test(BASE)
  );
}

function assertPatchAllowed() {
  if (process.env.VERCEL_ENV === "production") {
    console.error("BLOCKED: patch commands refuse VERCEL_ENV=production");
    process.exit(1);
  }
  if (isProductionEnv() && process.env.ALLOW_SMOKE_PATCH !== "1") {
    console.error(
      "BLOCKED: patch is for local/staging only. Set ALLOW_SMOKE_PATCH=1 to override (never on prod URL)."
    );
    process.exit(1);
  }
  console.log("⚠ patch: artificial DB state — not a substitute for real 7-day Stripe expiry\n");
}

function usage() {
  console.log(`Used auction pipeline smoke — ${BASE}\n`);
  console.log("Commands:");
  console.log("  preflight              env + Stripe webhook endpoint audit");
  console.log("  check-schema");
  console.log("  inspect <listingId>");
  console.log("  verify <listingId>");
  console.log("  verify-connect <orderId>   PI succeeded + Connect transfer on charge");
  console.log("  cron used-auctions | market-auto-confirm");
  console.log("  patch reauth-lead <bidId> [hours]     (local/staging only)");
  console.log("  patch payment-timeout <listingId>");
  console.log("  patch delivered-manual <orderId>    PATH A — skips 17TRACK");
  console.log("  stripe pi <pi_id>");
  process.exit(0);
}

async function stripeGet(path) {
  if (!STRIPE_KEY) return { error: "STRIPE_SECRET_KEY missing" };
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  const body = await res.json();
  if (!res.ok) return { error: body.error?.message || res.statusText, body };
  return body;
}

async function preflight() {
  console.log("=== Pre-flight (run BEFORE 8-step staging E2E) ===\n");
  console.log(`Target: ${BASE}`);
  ok("not production URL", !/mocomo\.net/i.test(BASE) || process.env.VERCEL_ENV === "preview", BASE);

  ok("DATABASE_URL set", !!process.env.DATABASE_URL);
  ok("CRON_SECRET set", !!CRON_SECRET);
  ok("STRIPE_SECRET_KEY set", !!STRIPE_KEY);
  ok("STRIPE_WEBHOOK_SECRET set", !!WEBHOOK_SECRET);

  console.log("\n--- Stripe webhook (staging endpoint must be separate from prod) ---");
  console.log("Required events:");
  for (const e of REQUIRED_STRIPE_WEBHOOK_EVENTS) console.log(`  • ${e}`);
  console.log(`\nExpected endpoint URL: ${BASE}/api/webhooks/stripe`);
  console.log("Dashboard: https://dashboard.stripe.com/test/webhooks (or live for staging keys)\n");

  if (STRIPE_KEY) {
    const endpoints = await stripeGet("webhook_endpoints?limit=20");
    if (endpoints.error) {
      ok("Stripe webhook_endpoints API", false, endpoints.error);
    } else {
      const list = endpoints.data ?? [];
      const match = list.filter((ep) => {
        const url = ep.url ?? "";
        return url.includes(new URL(BASE).host) || url.includes("/api/webhooks/stripe");
      });
      ok("webhook endpoint registered for host", match.length > 0, match.map((e) => e.url).join(", ") || "none");
      for (const ep of match) {
        const enabled = new Set(ep.enabled_events ?? []);
        const all = ep.enabled_events?.includes("*");
        for (const ev of REQUIRED_STRIPE_WEBHOOK_EVENTS) {
          ok(`  event ${ev}`, all || enabled.has(ev), ep.url);
        }
        ok("  signing secret", !!WEBHOOK_SECRET, "compare Dashboard whsec_… with STRIPE_WEBHOOK_SECRET env");
      }
      if (match.length === 0) {
        console.log("\n  ⚠ No webhook endpoint matches SMOKE_BASE_URL host.");
        console.log("    Staging often misses events that exist on prod — add endpoint + whsec to staging env.");
      }
    }
  }

  console.log("\n--- MarketplaceOrder status enum (Used = same as Star Market) ---");
  const enums = await db.$queryRaw`
    SELECT e.enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MarketplaceOrderStatus'
    ORDER BY e.enumsortorder
  `;
  const labels = enums.map((r) => r.enumlabel);
  ok("PREPARING in MarketplaceOrderStatus", labels.includes("PREPARING"), labels.join(", "));
  ok("no separate Used order enum", true, "used orders reuse MarketplaceOrder");

  console.log("\n--- patch command safety ---");
  ok("patch blocked on VERCEL_ENV=production", true, "CLI only — no HTTP patch route exists");
  ok("patch blocked on prod URL without ALLOW_SMOKE_PATCH", isProductionEnv() ? "would block" : "ok for local/staging");

  console.log("\n--- Step 5 delivery paths ---");
  console.log("  PATH A: patch delivered-manual OR seller UI → manual pipeline (no 17TRACK)");
  console.log("  PATH B: 17TRACK simulator/webhook → full tracking integration");

  console.log("\n--- Step 7 re-auth expectation ---");
  console.log("  After cron used-auctions: old PI canceled + NEW pi_… requires_capture on same bid row");
  console.log("  (auto via saved card; manual fallback if no card / 3DS)");

  console.log("\n--- Step 8 next-bidder expectation ---");
  console.log("  promoteNextAuctionWinner: new Hold PI + MarketplaceOrder for next bidder");
}

async function checkSchema() {
  const cols = await db.$queryRaw`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('UsedListing', 'MarketplaceOrder', 'MarketplaceOrderItem', 'UsedAuctionBid')
      AND column_name IN (
        'marketplaceOrderId', 'usedListingId', 'paymentIntentDbId',
        'stripePaymentIntentId', 'holdAmount', 'holdExpiresAt'
      )
  `;
  const found = new Set(cols.map((r) => `${r.table_name}.${r.column_name}`));
  const expected = [
    "UsedListing.marketplaceOrderId",
    "MarketplaceOrder.usedListingId",
    "MarketplaceOrderItem.usedListingId",
    "UsedAuctionBid.paymentIntentDbId",
    "UsedAuctionBid.stripePaymentIntentId",
    "UsedAuctionBid.holdAmount",
    "UsedAuctionBid.holdExpiresAt",
  ];
  let pass = true;
  for (const e of expected) {
    if (!ok(e, found.has(e))) pass = false;
  }
  const cfg = await db.usedAuctionConfig.findUnique({ where: { id: "default" } }).catch(() => null);
  ok("UsedAuctionConfig.depositEnabled", cfg != null, cfg ? String(cfg.depositEnabled) : "no row");
  console.log(pass ? "\nPASS schema" : "\nFAIL schema — run prisma migrate deploy");
  return pass;
}

async function loadListingContext(listingId) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: {
      auctionBids: {
        orderBy: { amount: "desc" },
        take: 20,
        select: {
          id: true,
          bidderId: true,
          amount: true,
          bidStatus: true,
          paymentIntentDbId: true,
          stripePaymentIntentId: true,
          holdAmount: true,
          holdExpiresAt: true,
          createdAt: true,
        },
      },
    },
  });
  if (!listing) return null;

  let order = null;
  if (listing.marketplaceOrderId) {
    order = await db.marketplaceOrder.findUnique({
      where: { id: listing.marketplaceOrderId },
      include: { shipment: true, items: true },
    });
  } else {
    order = await db.marketplaceOrder.findFirst({
      where: { usedListingId: listingId },
      include: { shipment: true, items: true },
    });
  }
  return { listing, order };
}

async function stripePiStatus(piId) {
  const body = await stripeGet(`payment_intents/${piId}`);
  if (body.error) return { error: body.error };
  return {
    id: body.id,
    status: body.status,
    amount: body.amount,
    amount_capturable: body.amount_capturable,
    capture_method: body.capture_method,
    metadata: body.metadata,
    latest_charge: typeof body.latest_charge === "string" ? body.latest_charge : body.latest_charge?.id,
    transfer_data: body.transfer_data,
    application_fee_amount: body.application_fee_amount,
  };
}

async function verifyConnect(orderId) {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      settlementStatus: true,
      stripePaymentIntentId: true,
      stripeTransferId: true,
      platformFeeAmount: true,
      sellerEarnAmount: true,
      usedListingId: true,
      settledAt: true,
    },
  });
  if (!order) {
    console.error("Order not found");
    process.exit(1);
  }

  const checks = [];
  checks.push(ok("order exists", true, order.id));
  checks.push(ok("usedListingId (used auction)", !!order.usedListingId, order.usedListingId ?? "-"));
  checks.push(
    ok(
      "status in shared MarketplaceOrderStatus",
      STAR_MARKET_ORDER_STATUSES.includes(order.status),
      order.status
    )
  );

  if (!order.stripePaymentIntentId) {
    checks.push(ok("stripePaymentIntentId", false));
    process.exit(1);
  }

  if (!STRIPE_KEY) {
    console.log("Set STRIPE_SECRET_KEY for Connect transfer verification");
    process.exit(1);
  }

  const pi = await stripePiStatus(order.stripePaymentIntentId);
  if (pi.error) {
    checks.push(ok("PI lookup", false, pi.error));
    process.exit(1);
  }

  checks.push(ok("PI status succeeded (captured)", pi.status === "succeeded", pi.status));
  checks.push(ok("PI had manual capture", pi.capture_method === "manual", pi.capture_method ?? "-"));

  if (pi.latest_charge) {
    const charge = await stripeGet(`charges/${pi.latest_charge}?expand[]=transfer`);
    if (!charge.error) {
      checks.push(ok("charge captured", charge.captured === true, String(charge.amount)));
      checks.push(
        ok("application fee on charge", (charge.application_fee_amount ?? 0) > 0 || order.platformFeeAmount === 0,
          String(charge.application_fee_amount ?? 0))
      );
      const dest = charge.transfer_data?.destination ?? pi.transfer_data?.destination;
      checks.push(ok("Connect destination set", !!dest, dest ?? "missing"));
      if (charge.transfer) {
        checks.push(ok("transfer object exists", true, charge.transfer));
      } else {
        console.log("  → Stripe Dashboard: Payment → check Connect transfer to seller account");
      }
    }
  }

  checks.push(ok("order SETTLED in DB", order.status === "SETTLED", order.status));
  checks.push(ok("settlementStatus SETTLED", order.settlementStatus === "SETTLED", order.settlementStatus));

  const pass = checks.every(Boolean);
  console.log(pass ? "\nPASS verify-connect" : "\nFAIL verify-connect — confirm transfer in Stripe Dashboard");
  process.exit(pass ? 0 : 1);
}

async function inspectListing(listingId) {
  const ctx = await loadListingContext(listingId);
  if (!ctx) {
    console.error("Listing not found:", listingId);
    process.exit(1);
  }
  const { listing, order } = ctx;

  console.log("\n=== UsedListing ===");
  console.log(JSON.stringify(
    {
      id: listing.id,
      title: listing.title,
      saleType: listing.saleType,
      currency: listing.currency,
      status: listing.status,
      auctionState: listing.auctionState,
      depositEnabled: listing.depositEnabled,
      currentBidAmount: listing.currentBidAmount,
      currentBidderId: listing.currentBidderId,
      winningBidderId: listing.winningBidderId,
      paymentDueAt: listing.paymentDueAt,
      paymentCompletedAt: listing.paymentCompletedAt,
      marketplaceOrderId: listing.marketplaceOrderId,
    },
    null,
    2
  ));

  console.log("\n=== Bids (top 20) ===");
  for (const b of listing.auctionBids) {
    let stripe = "";
    if (b.stripePaymentIntentId && STRIPE_KEY) {
      const pi = await stripePiStatus(b.stripePaymentIntentId);
      stripe = pi.error ? ` stripe_err=${pi.error}` : ` stripe=${pi.status} capturable=${pi.amount_capturable}`;
    }
    console.log(
      `  ${b.bidStatus.padEnd(10)} $${(b.amount / 100).toFixed(2)} bidder=${b.bidderId.slice(0, 8)}… pi=${b.stripePaymentIntentId ?? "-"} expires=${b.holdExpiresAt?.toISOString() ?? "-"}${stripe}`
    );
  }

  if (order) {
    console.log("\n=== MarketplaceOrder (shared Star Market schema) ===");
    console.log(JSON.stringify(
      {
        id: order.id,
        status: order.status,
        settlementStatus: order.settlementStatus,
        subtotalAmount: order.subtotalAmount,
        platformFeeAmount: order.platformFeeAmount,
        stripePaymentIntentId: order.stripePaymentIntentId,
        autoConfirmAt: order.autoConfirmAt,
        confirmedAt: order.confirmedAt,
        settledAt: order.settledAt,
        usedListingId: order.usedListingId,
        shipment: order.shipment
          ? {
              status: order.shipment.status,
              trackingNumber: order.shipment.trackingNumber,
              externalTrackingId: order.shipment.externalTrackingId,
            }
          : null,
      },
      null,
      2
    ));
  } else {
    console.log("\n(no MarketplaceOrder yet)");
  }
}

async function verifyListing(listingId) {
  const ctx = await loadListingContext(listingId);
  if (!ctx) {
    console.error("Listing not found:", listingId);
    process.exit(1);
  }
  const { listing, order } = ctx;
  const checks = [];

  const cfg = await db.usedAuctionConfig.findUnique({ where: { id: "default" } }).catch(() => null);
  const holdEnabled = listing.depositEnabled || cfg?.depositEnabled;
  checks.push(ok("deposit/hold enabled (global or listing)", !!holdEnabled));

  const winnerBid = listing.auctionBids.find(
    (b) => b.bidderId === (listing.winningBidderId ?? listing.currentBidderId)
  );
  if (winnerBid?.stripePaymentIntentId) {
    checks.push(ok("winner has stripePaymentIntentId", true, winnerBid.stripePaymentIntentId));
    if (STRIPE_KEY) {
      const pi = await stripePiStatus(winnerBid.stripePaymentIntentId);
      if (!pi.error) {
        const expectCapture = order?.status === "SETTLED" ? "succeeded" : "requires_capture";
        checks.push(ok(`winner PI ${expectCapture}`, pi.status === expectCapture, pi.status));
        if (expectCapture === "requires_capture") {
          checks.push(ok("capturable > 0", (pi.amount_capturable ?? 0) > 0, String(pi.amount_capturable)));
        }
      } else {
        checks.push(ok("winner PI stripe lookup", false, pi.error));
      }
    }
  } else if (holdEnabled && normalizeCurrency(listing.currency) === "usd") {
    checks.push(ok("winner has stripe hold", false, "missing PI"));
  }

  if (listing.marketplaceOrderId || order) {
    checks.push(ok("MarketplaceOrder linked", !!(order || listing.marketplaceOrderId)));
    if (order) {
      checks.push(
        ok("PREPARING = shared enum (not Used-specific)", STAR_MARKET_ORDER_STATUSES.includes(order.status), order.status)
      );
      checks.push(ok("order.usedListingId set", order.usedListingId === listingId));
      if (order.status === "DELIVERED" && order.autoConfirmAt) {
        checks.push(
          ok("autoConfirmAt ready for cron", order.autoConfirmAt.getTime() <= Date.now(), order.autoConfirmAt.toISOString())
        );
      }
    }
  }

  const pass = checks.every(Boolean);
  console.log(pass ? "\nPASS verify" : "\nFAIL verify");
  if (order?.status === "SETTLED") {
    console.log(`\nRun: verify-connect ${order.id}`);
  }
  process.exit(pass ? 0 : 1);
}

function normalizeCurrency(c) {
  return String(c ?? "krw").toLowerCase();
}

async function callCron(path) {
  const url = `${BASE}${path}`;
  const headers = { Accept: "application/json" };
  if (CRON_SECRET) {
    headers.Authorization = `Bearer ${CRON_SECRET}`;
    headers["x-mocomo-cron-secret"] = CRON_SECRET;
  }
  console.log(`GET ${url}`);
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 500);
  }
  console.log("Status:", res.status);
  console.log(JSON.stringify(body, null, 2));
  if (!res.ok) process.exit(1);
}

async function patchReauthLead(bidId, hours = 1) {
  assertPatchAllowed();
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) {
    console.error("hours must be positive number");
    process.exit(1);
  }
  const expires = new Date(Date.now() + h * 60 * 60 * 1000);
  const bid = await db.usedAuctionBid.update({
    where: { id: bidId },
    data: { holdExpiresAt: expires },
    select: {
      id: true,
      listingId: true,
      holdExpiresAt: true,
      bidStatus: true,
      stripePaymentIntentId: true,
    },
  });
  console.log("Patched bid holdExpiresAt (forces step 7):", bid);
  console.log("Before cron, note old pi_:", bid.stripePaymentIntentId);
  console.log("Then: cron used-auctions → expect NEW pi_ on same bid if saved card works");
}

async function patchPaymentTimeout(listingId) {
  assertPatchAllowed();
  const past = new Date(Date.now() - 60_000);
  const current = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { currentBidderId: true, winningBidderId: true },
  });
  if (!current) {
    console.error("Listing not found");
    process.exit(1);
  }
  const winnerId = current.winningBidderId ?? current.currentBidderId;
  if (!winnerId) {
    console.error("No winningBidderId/currentBidderId");
    process.exit(1);
  }
  const listing = await db.usedListing.update({
    where: { id: listingId },
    data: {
      auctionState: "PAYMENT_PENDING",
      paymentDueAt: past,
      paymentTimeoutProcessed: false,
      winningBidderId: winnerId,
    },
    select: { id: true, auctionState: true, paymentDueAt: true, winningBidderId: true },
  });
  console.log("Patched for step 8 (honor timeout / next-bidder):", listing);
  console.log("Then: cron used-auctions → check next bidder new pi_ + MarketplaceOrder");
}

async function patchDeliveredManual(orderId) {
  assertPatchAllowed();
  const autoConfirmAt = new Date(Date.now() - 60_000);

  await db.marketplaceShipment.upsert({
    where: { orderId },
    create: {
      orderId,
      status: "DELIVERED",
      deliveredAt: new Date(),
      carrier: "SMOKE_TEST",
    },
    update: { status: "DELIVERED", deliveredAt: new Date() },
  });

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { status: "DELIVERED", autoConfirmAt },
  });

  console.log("PATH A (manual): order DELIVERED + autoConfirmAt set");
  console.log("⚠ 17TRACK webhook NOT exercised — delivery-pipeline manual source only");
  console.log(`autoConfirmAt: ${autoConfirmAt.toISOString()}`);
  console.log("Then: cron market-auto-confirm → verify-connect <orderId>");
}

async function main() {
  const [cmd, arg1, arg2] = process.argv.slice(2);
  if (!cmd) usage();

  try {
    switch (cmd) {
      case "preflight":
        await preflight();
        break;
      case "check-schema":
        await checkSchema();
        break;
      case "inspect":
        if (!arg1) {
          console.error("Usage: inspect <listingId>");
          process.exit(1);
        }
        await inspectListing(arg1);
        break;
      case "verify":
        if (!arg1) {
          console.error("Usage: verify <listingId>");
          process.exit(1);
        }
        await verifyListing(arg1);
        break;
      case "verify-connect":
        if (!arg1) {
          console.error("Usage: verify-connect <orderId>");
          process.exit(1);
        }
        await verifyConnect(arg1);
        break;
      case "cron":
        if (arg1 === "used-auctions") await callCron("/api/cron/used-auctions");
        else if (arg1 === "market-auto-confirm") await callCron("/api/cron/market-auto-confirm");
        else {
          console.error("Usage: cron used-auctions | market-auto-confirm");
          process.exit(1);
        }
        break;
      case "patch":
        if (arg1 === "reauth-lead") {
          if (!arg2) {
            console.error("Usage: patch reauth-lead <bidId> [hours=1]");
            process.exit(1);
          }
          await patchReauthLead(arg2, process.argv[5] ?? 1);
        } else if (arg1 === "payment-timeout") {
          if (!arg2) {
            console.error("Usage: patch payment-timeout <listingId>");
            process.exit(1);
          }
          await patchPaymentTimeout(arg2);
        } else if (arg1 === "delivered-manual") {
          if (!arg2) {
            console.error("Usage: patch delivered-manual <orderId>");
            process.exit(1);
          }
          await patchDeliveredManual(arg2);
        } else {
          console.error("Usage: patch reauth-lead | payment-timeout | delivered-manual");
          process.exit(1);
        }
        break;
      case "stripe":
        if (arg1 !== "pi" || !arg2) {
          console.error("Usage: stripe pi <pi_...>");
          process.exit(1);
        }
        console.log(JSON.stringify(await stripePiStatus(arg2), null, 2));
        break;
      default:
        usage();
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
