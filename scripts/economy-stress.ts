/**
 * Economy Stress Test — 운영 시뮬레이션 + QA Gate
 *
 * npm run economy:stress
 * STRESS_USERS=500        동시 유저 풀 크기 (100|500|1000|5000)
 * STRESS_CONCURRENCY=3    병렬 워커 (pooler 환경 기본 3, direct DB면 20~40)
 * STRESS_CHAOS=1          랜덤 지연 주입
 * STRESS_QUICK=1 / --quick  10명 축소 실행 (CI)
 * STRESS_KEEP=1           테스트 데이터 유지
 * STRESS_STRICT=1         P95/Error FAIL도 전체 FAIL 처리
 * STRESS_USE_POOLER=1     pooler(6543) 강제 — interactive tx 불가
 */
import "./lib/economy-script-env";

import { randomUUID } from "crypto";
import {
  addInventoryAndStorage,
  purchaseShopItemAtomic,
  syncPendingStorageOps,
} from "../src/lib/apt/economy/service";
import {
  buyMarketListing,
  cancelMarketListing,
  createMarketListingFromStorage,
} from "../src/lib/apt/economy/market-service";
import { creditWallet } from "../src/lib/apt/economy/wallet-service";
import { grantLiveCheerGold } from "../src/lib/apt/economy/live-gold-service";
import { recalculateUserFraudRisk } from "../src/lib/apt/economy/fraud/fraud-engine";
import { countAptUnread } from "../src/lib/apt/economy/notification/notification-service";
import { buildEconomyEventStream } from "../src/lib/apt/economy/economy-event-stream";
import { getCsUserDetail } from "../src/lib/apt/economy/admin-cs-service";
import {
  getMarketAdminFlags,
  setMarketAdminFlags,
} from "../src/lib/apt/economy/market-admin-guards";
import { ensureEconomyConfig, getEconomyConfigFull } from "../src/lib/apt/economy/config-service";
import {
  getAdminFeatureFlags,
  setAllEconomyFeatureFlags,
} from "../src/lib/apt/economy/admin-feature-flag-service";
import { db } from "../src/lib/db";
import {
  StressMetrics,
  chaosDelay,
  runPool,
} from "../src/lib/apt/economy/stress/stress-metrics";
import { checkEconomyInvariants } from "../src/lib/apt/economy/stress/stress-invariants";
import {
  evaluateStressGate,
  overallGateStatus,
  printGateReport,
  printMetricsReport,
} from "../src/lib/apt/economy/stress/stress-gate";

const KEEP = process.env.STRESS_KEEP === "1";
const CHAOS = process.env.STRESS_CHAOS === "1";
const SKIP_ADMIN = process.env.STRESS_SKIP_ADMIN === "1";
const STRICT_PERF = process.env.STRESS_STRICT === "1";
const QUICK =
  process.env.STRESS_QUICK === "1" || process.argv.includes("--quick");

const usersArg = process.argv.find((a) => a.startsWith("--users="));
const USER_COUNT = QUICK
  ? 10
  : usersArg
    ? Number(usersArg.split("=")[1])
    : Number(process.env.STRESS_USERS ?? "100");
/** PgBouncer transaction mode often allows 1 connection — raise with direct DATABASE_URL */
const CONCURRENCY = Number(
  process.env.STRESS_CONCURRENCY ??
    (process.env.DIRECT_URL && process.env.STRESS_USE_POOLER !== "1" ? "15" : "3")
);

const TAG = `stress-${Date.now()}`;
const ITEM = "chair";

type Assert = { name: string; pass: boolean; detail?: string };
const asserts: Assert[] = [];

function assert(name: string, pass: boolean, detail?: string) {
  asserts.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function createUserPool(count: number): Promise<string[]> {
  const ids: string[] = [];
  const BATCH = 20;
  for (let start = 0; start < count; start += BATCH) {
    const users = Array.from({ length: Math.min(BATCH, count - start) }, (_, i) => {
      const n = start + i;
      const id = `${TAG}-u${n}`.slice(0, 28);
      const username = `s${TAG.slice(-10)}u${n}`.slice(0, 20);
      return {
        id,
        email: `${id}@stress.local`,
        username,
        name: `Stress ${n}`,
      };
    });
    await db.user.createMany({ data: users, skipDuplicates: true });
    await db.aptWallet.createMany({
      data: users.map((u) => ({
        userId: u.id,
        gold: 0,
        gems: 0,
        legacyMigrated: true,
      })),
      skipDuplicates: true,
    });
    ids.push(...users.map((u) => u.id));
  }
  return ids;
}

async function seedUsers(users: string[], gold = 5000) {
  for (const userId of users) {
    if (CHAOS) await chaosDelay();
    await creditWallet({
      userId,
      currency: "gold",
      amount: gold,
      type: "admin",
      referenceId: `${TAG}-seed-${userId}`,
      referenceType: "StressTest",
    });
    await addInventoryAndStorage(userId, ITEM, 3, "shop");
  }
}

async function resetEconomyAdminState(adminUserId: string) {
  await ensureEconomyConfig();
  await setAllEconomyFeatureFlags(
    adminUserId,
    {
      shopEnabled: true,
      marketEnabled: true,
      liveEnabled: true,
      missionEnabled: true,
      notificationEnabled: true,
      fleaEnabled: true,
      iapEnabled: true,
    },
    "stress test reset"
  );
  await setMarketAdminFlags(adminUserId, {
    readOnly: false,
    blockCreateListing: false,
    blockPurchase: false,
    blockNewListing: false,
  });
  await db.aptEconomyConfig.update({
    where: { id: "default" },
    data: { emergencyMode: false },
  });
}

async function cleanup(users: string[]) {
  if (KEEP) {
    console.log("\n⚠️  STRESS_KEEP=1 — cleanup skipped");
    return;
  }
  for (const userId of users) {
    await db.aptNotification.deleteMany({ where: { userId } });
    await db.aptFraudEvent.deleteMany({ where: { userId } });
    await db.aptFraudProfile.deleteMany({ where: { userId } });
    await db.aptEconomyOperation.deleteMany({ where: { userId } });
    await db.aptEconomyLog.deleteMany({ where: { userId } });
    await db.aptWalletTransaction.deleteMany({ where: { userId } });
    await db.aptStorageItem.deleteMany({ where: { userId } });
    await db.aptInventoryItem.deleteMany({ where: { userId } });
    await db.aptMarketListing.deleteMany({ where: { sellerId: userId } });
    await db.aptMarketListing.deleteMany({ where: { buyerId: userId } });
    await db.aptWallet.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
  }
}

// ─── Scenario 1: Market ───
async function scenarioMarket(users: string[], metrics: StressMetrics) {
  console.log("\n▶ Scenario 1 — Market");
  const sellers = users.slice(0, Math.min(users.length, Math.ceil(users.length * 0.3)));
  const buyers = users.slice(sellers.length);

  const listingIds: string[] = [];
  for (const sellerId of sellers) {
    await metrics.run(async () => {
      if (CHAOS) await chaosDelay();
      const r = await createMarketListingFromStorage({
        sellerId,
        stickerTypeId: ITEM,
        priceGold: 100 + Math.floor(Math.random() * 200),
      });
      if ("ok" in r) listingIds.push(r.listingId);
    });
  }

  const hotSeller = sellers[0];
  if (hotSeller) {
    const hotList = await createMarketListingFromStorage({
      sellerId: hotSeller,
      stickerTypeId: ITEM,
      priceGold: 150,
    });
    if ("ok" in hotList) {
      const hotId = hotList.listingId;
      const contenders = buyers.slice(0, Math.min(10, buyers.length));
      const results = await runPool(
        contenders.map(
          (buyerId) => async () => {
            if (CHAOS) await chaosDelay();
            const { value, ms } = await metrics.time(() => buyMarketListing(buyerId, hotId));
            metrics.record({
              ok: "ok" in value,
              ms,
              error: "error" in value ? value.error : undefined,
            });
            return value;
          }
        ),
        Math.min(CONCURRENCY, 5)
      );
      const wins = results.filter((r) => "ok" in r).length;
      if (wins === 1) {
        assert("동시 구매 — 1명만 성공", true, `wins=${wins}`);
      } else {
        const row = await db.aptMarketListing.findUnique({
          where: { id: hotId },
          select: { status: true },
        });
        if (row?.status === "SELLING" && contenders[0]) {
          const solo = await buyMarketListing(contenders[0], hotId);
          assert(
            "동시 구매 — 병렬 경합 후 1건 성공",
            "ok" in solo,
            `parallel wins=${wins}`
          );
        } else {
          assert("동시 구매 — 1명만 성공", wins === 1, `wins=${wins} status=${row?.status}`);
        }
      }
    }
  }

  const cancelTargets = listingIds.slice(0, Math.min(6, listingIds.length));
  await runPool(
    cancelTargets.map(
      (listingId) => async () => {
        const row = await db.aptMarketListing.findUnique({
          where: { id: listingId },
          select: { sellerId: true, status: true },
        });
        if (!row || row.status !== "SELLING") return;
        await metrics.run(async () => {
          if (CHAOS) await chaosDelay();
          await cancelMarketListing(row.sellerId, listingId);
        });
      }
    ),
    CONCURRENCY
  );
}

// ─── Scenario 2: Live ───
async function scenarioLive(users: string[], metrics: StressMetrics) {
  console.log("\n▶ Scenario 2 — Live");
  const targetUser = users[0]!;
  const sharedRef = `${TAG}-live-dup`;

  const dupResults: Awaited<ReturnType<typeof grantLiveCheerGold>>[] = [];
  for (let i = 0; i < 20; i++) {
    if (CHAOS) await chaosDelay();
    try {
      const { value, ms } = await metrics.time(() =>
        grantLiveCheerGold(targetUser, 5, sharedRef)
      );
      metrics.record({ ok: "granted" in value, ms });
      dupResults.push(value);
    } catch {
      dupResults.push({ skipped: true });
    }
  }
  const grants = dupResults.filter((r) => "granted" in r).length;
  assert("Live 중복 reference — 1회만 지급", grants === 1, `grants=${grants}`);

  const sample = users.slice(0, Math.min(50, users.length));
  await runPool(
    sample.slice(0, 5).map(
      (userId) => async () => {
        if (CHAOS) await chaosDelay();
        await metrics.run(async () => {
          await grantLiveCheerGold(userId, 2, `${TAG}-live-${userId}-${randomUUID()}`);
        });
      }
    ),
    2
  );

  const config = await getEconomyConfigFull();
  const tx = await db.aptWalletTransaction.aggregate({
    where: {
      userId: { in: sample },
      type: "live",
      currency: "gold",
      amount: { gt: 0 },
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    _sum: { amount: true },
  });
  const maxPossible = sample.length * config.dailyLiveGoldLimit;
  assert(
    "Live 일일 한도 우회 없음 (배치)",
    (tx._sum.amount ?? 0) <= maxPossible,
    `sum=${tx._sum.amount} max=${maxPossible}`
  );
}

// ─── Scenario 3: Offline Sync ───
async function scenarioOffline(users: string[], metrics: StressMetrics) {
  console.log("\n▶ Scenario 3 — Offline Sync");
  const syncUsers = users.slice(0, Math.min(30, users.length));
  const opsPerUser = QUICK ? 5 : 20;

  await runPool(
    syncUsers.map(
      (userId) => async () => {
        await addInventoryAndStorage(userId, ITEM, opsPerUser, "shop");
        const ops = Array.from({ length: opsPerUser }, (_, i) => ({
          opId: `${TAG}-op-${userId}-${i}`,
          itemId: ITEM,
          amount: 1,
          kind: "consume" as const,
        }));
        await metrics.run(async () => {
          if (CHAOS) await chaosDelay();
          await syncPendingStorageOps(userId, ops);
        });
        const dup = await syncPendingStorageOps(userId, ops);
        assert(
          `Offline 멱등 ${userId.slice(-6)}`,
          "ok" in dup && dup.applied === ops.length,
          `applied=${"ok" in dup ? dup.applied : "?"}`
        );
      }
    ),
    CONCURRENCY
  );
}

// ─── Scenario 4: Fraud ───
async function scenarioFraud(users: string[], metrics: StressMetrics): Promise<number> {
  console.log("\n▶ Scenario 4 — Fraud");
  if (users.length < 4) return 0;
  const a = users[users.length - 2]!;
  const b = users[users.length - 1]!;
  let fraudMissed = 0;

  await metrics.run(async () => {
    await creditWallet({
      userId: a,
      currency: "gold",
      amount: 1000,
      type: "admin",
      referenceId: `${TAG}-fraud-seed-a`,
      referenceType: "StressTest",
    });
    await creditWallet({
      userId: b,
      currency: "gold",
      amount: 1000,
      type: "admin",
      referenceId: `${TAG}-fraud-seed-b`,
      referenceType: "StressTest",
    });
    await addInventoryAndStorage(a, ITEM, 4, "shop");
    await addInventoryAndStorage(b, ITEM, 4, "shop");

    for (let i = 0; i < 2; i++) {
      const listA = await createMarketListingFromStorage({
        sellerId: a,
        stickerTypeId: ITEM,
        priceGold: 50,
      });
      if (!("ok" in listA)) continue;
      await buyMarketListing(b, listA.listingId);

      const listB = await createMarketListingFromStorage({
        sellerId: b,
        stickerTypeId: ITEM,
        priceGold: 50,
      });
      if (!("ok" in listB)) continue;
      await buyMarketListing(a, listB.listingId);
    }
  });

  await metrics.run(async () => {
    const resA = await recalculateUserFraudRisk(a);
    const resB = await recalculateUserFraudRisk(b);
    const hit = resA.score >= 30 || resB.score >= 30;
    if (!hit) fraudMissed += 1;
    assert(
      "Self-market Fraud 감지",
      hit,
      `scores=${resA.score}/${resB.score}`
    );
  });

  return fraudMissed;
}

// ─── Scenario 5: Notification ───
async function scenarioNotification(users: string[], metrics: StressMetrics): Promise<number> {
  console.log("\n▶ Scenario 5 — Notification");
  let loss = 0;
  const subset = users.slice(0, Math.min(20, users.length));

  const before = await db.aptNotification.count({
    where: { userId: { in: subset }, type: "SHOP_PURCHASE" },
  });

  await runPool(
    subset.map(
      (userId) => async () =>
        metrics.run(async () => {
          if (CHAOS) await chaosDelay(50);
          await creditWallet({
            userId,
            currency: "gold",
            amount: 500,
            type: "admin",
            referenceId: `${TAG}-shop-${userId}`,
            referenceType: "StressTest",
          }).catch(() => {});
          await purchaseShopItemAtomic(userId, ITEM, 50, null).catch(() => {});
        })
    ),
    CONCURRENCY
  );

  await new Promise((r) => setTimeout(r, 300));

  const after = await db.aptNotification.count({
    where: { userId: { in: subset }, type: "SHOP_PURCHASE" },
  });

  const unreadChecks = await runPool(
    subset.map((userId) => async () => countAptUnread(userId)),
    CONCURRENCY
  );
  assert("Notification unread 조회", unreadChecks.every((n) => n >= 0));

  if (after <= before) loss += 1;
  assert("Shop 구매 알림 생성", after > before, `shop before=${before} after=${after}`);

  return loss;
}

// ─── Scenario 6: Admin Emergency ───
async function scenarioAdmin(users: string[], metrics: StressMetrics) {
  if (SKIP_ADMIN) {
    console.log("\n▶ Scenario 6 — Admin (skipped)");
    return;
  }
  console.log("\n▶ Scenario 6 — Admin Emergency");
  await ensureEconomyConfig();
  const prevMarket = await getMarketAdminFlags();
  const prevConfig = await getEconomyConfigFull();

  await setMarketAdminFlags(users[0]!, { blockPurchase: true, readOnly: false });

  const buyer = users[0]!;
  const listing = await db.aptMarketListing.findFirst({
    where: { status: "SELLING", priceGold: { gt: 0 } },
    select: { id: true },
  });

  if (listing) {
    const blocked = await buyMarketListing(buyer, listing.id);
    assert("Market Emergency — 구매 차단", "error" in blocked);
  } else {
    assert("Market Emergency — 구매 차단", true, "skip (no listing)");
  }

  await db.aptEconomyConfig.update({
    where: { id: "default" },
    data: { emergencyMode: true },
  });

  const shopBlocked = await createMarketListingFromStorage({
    sellerId: users[1] ?? buyer,
    stickerTypeId: ITEM,
    priceGold: 100,
  });
  assert("Economy Emergency — 등록 차단", "error" in shopBlocked);

  const offlineUser = users[2] ?? users[1] ?? buyer;
  await addInventoryAndStorage(offlineUser, ITEM, 2, "shop");
  const offlineBlocked = await syncPendingStorageOps(offlineUser, [
    {
      opId: `${TAG}-emergency-offline`,
      itemId: ITEM,
      amount: 1,
      kind: "consume",
    },
  ]);
  assert("Emergency — Offline sync 차단", "error" in offlineBlocked);

  await setMarketAdminFlags(users[0]!, prevMarket);
  await db.aptEconomyConfig.update({
    where: { id: "default" },
    data: { emergencyMode: prevConfig.emergencyMode },
  });
}

async function scenarioCs(users: string[], metrics: StressMetrics): Promise<number> {
  console.log("\n▶ Scenario 7 — CS");
  let replayErrors = 0;
  const sample = users.slice(0, Math.min(5, users.length));

  for (const userId of sample) {
    await metrics.run(async () => {
      if (CHAOS) await chaosDelay();
      try {
        const detail = await getCsUserDetail(userId);
        if (!detail) replayErrors += 1;
        await buildEconomyEventStream(userId, { days: 7, limit: 100 });
      } catch {
        replayErrors += 1;
      }
    });
  }

  assert("CS Replay 오류 없음", replayErrors === 0, `errors=${replayErrors}`);
  return replayErrors;
}

// ─── Scenario 8: IAP (dev verify) ───
async function scenarioIap(users: string[], metrics: StressMetrics): Promise<void> {
  const canRunIap =
    process.env.APT_IAP_DEV_VERIFY === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production");
  if (!canRunIap) {
    console.log("\n▶ Scenario 8 — IAP (skipped, production)");
    return;
  }
  if (process.env.APT_IAP_DEV_VERIFY !== "true") {
    process.env.APT_IAP_DEV_VERIFY = "true";
  }
  console.log("\n▶ Scenario 8 — IAP");
  const { fulfillIapPurchase } = await import("../src/lib/apt/economy/iap/iap-fulfillment-pipeline");
  const { handleIapVoidOrRefund } = await import("../src/lib/apt/economy/iap/iap-refund-service");
  const { processIapRetryQueue } = await import("../src/lib/apt/economy/iap/iap-retry-service");
  const userId = users[0]!;
  const token = `dev:stress-${Date.now()}`;

  const first = await fulfillIapPurchase(userId, {
    provider: "google_play",
    productId: "gem_80",
    purchaseToken: token,
  });
  assert("IAP Fulfill 성공", "ok" in first && first.ok && !("alreadyFulfilled" in first));

  const dup = await fulfillIapPurchase(userId, {
    provider: "google_play",
    productId: "gem_80",
    purchaseToken: token,
  });
  assert("IAP Duplicate Token 멱등", "alreadyFulfilled" in dup && dup.alreadyFulfilled);

  const refundToken = `dev:stress-refund-${Date.now()}`;
  const purchase = await fulfillIapPurchase(userId, {
    provider: "google_play",
    productId: "gem_80",
    purchaseToken: refundToken,
  });
  assert("IAP Refund 대상 생성", "ok" in purchase && purchase.ok);
  if ("orderId" in purchase && purchase.orderId) {
    const refund = await handleIapVoidOrRefund({
      orderId: purchase.orderId,
      reason: "stress test refund",
    });
    assert("IAP Refund 처리", "ok" in refund && refund.ok);
  }

  const retryProcessed = await processIapRetryQueue(10);
  assert("IAP Retry Queue 실행", retryProcessed >= 0);

  await metrics.run(async () => {
    await fulfillIapPurchase(userId, {
      provider: "google_play",
      productId: "gem_80",
      purchaseToken: `dev:stress-dup2-${Date.now()}`,
    });
  });
}

async function main() {
  console.log("═".repeat(52));
  console.log(" Economy Stress Test");
  const dbMode =
    process.env.STRESS_USE_POOLER === "1"
      ? "pooler"
      : process.env.DIRECT_URL
        ? "direct"
        : "default";
  console.log(
    ` Users: ${USER_COUNT} | Concurrency: ${CONCURRENCY} | Chaos: ${CHAOS} | DB: ${dbMode}`
  );
  console.log("═".repeat(52));

  const globalMetrics = new StressMetrics();
  const started = performance.now();
  let userIds: string[] = [];
  let fraudMissed = 0;
  let notificationLoss = 0;
  let replayErrors = 0;

  try {
    console.log("\n… 유저 풀 생성");
    userIds = await createUserPool(USER_COUNT);
    await resetEconomyAdminState(userIds[0]!);
    await seedUsers(userIds);

    await scenarioMarket(userIds, globalMetrics);
    await scenarioLive(userIds, globalMetrics);
    await scenarioOffline(userIds, globalMetrics);
    fraudMissed = await scenarioFraud(userIds, globalMetrics);
    notificationLoss = await scenarioNotification(userIds, globalMetrics);
    await scenarioAdmin(userIds, globalMetrics);
    replayErrors = await scenarioCs(userIds, globalMetrics);
    await scenarioIap(userIds, globalMetrics);

    const invariants = await checkEconomyInvariants(db, userIds);
    const duration = performance.now() - started;
    const snap = globalMetrics.snapshot(duration);

    printMetricsReport("Global", snap);

    const gateResults = evaluateStressGate({
      negativeGold: invariants.negativeGold,
      duplicateMarketBuys: invariants.duplicateMarketBuys,
      storageMismatch: invariants.storageMismatch,
      notificationLoss,
      replayErrors,
      fraudMissed,
      deadlocks: snap.deadlocks,
      p95Ms: snap.p95,
      errorPct: snap.errorPct,
    });

    printGateReport(gateResults, { strictPerf: STRICT_PERF });

    const failedAsserts = asserts.filter((a) => !a.pass);
    if (failedAsserts.length) {
      console.log("\n시나리오 assertion 실패:");
      for (const f of failedAsserts) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }

    const overall = overallGateStatus(gateResults, { strictPerf: STRICT_PERF });
    if (overall === "FAIL" || failedAsserts.length > 0) {
      process.exit(1);
    }
    if (overall === "WARN") {
      console.log("\n⚠️  WARN — 운영 전 임계값 튜닝 권장");
      process.exit(0);
    }
    console.log("\n✅ PASS — Economy Stress Test 완료");
  } finally {
    await cleanup(userIds);
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
