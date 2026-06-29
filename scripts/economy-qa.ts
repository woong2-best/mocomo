/**
 * Economy QA — Storage / Market / Wallet / Offline sync 체크리스트
 *
 * npx tsx scripts/economy-qa.ts
 * ECONOMY_QA_KEEP=1 — 테스트 유저·데이터 유지
 */
import { PrismaClient } from "@prisma/client";
import {
  addInventoryAndStorage,
  consumeStorageItem,
  loadEconomySnapshot,
  returnStorageItem,
  syncPendingStorageOps,
} from "../src/lib/apt/economy/service";
import {
  buyMarketListing,
  cancelMarketListing,
  createMarketListingFromStorage,
} from "../src/lib/apt/economy/market-service";
import { creditWallet, debitWallet } from "../src/lib/apt/economy/wallet-service";
import { hasEconomyOperation } from "../src/lib/apt/economy/operation-service";

const db = new PrismaClient();
const KEEP = process.env.ECONOMY_QA_KEEP === "1";

type Result = { name: string; pass: boolean; detail?: string };

const results: Result[] = [];

function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, pass: cond, detail });
  const icon = cond ? "✅" : "❌";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function createQaUser(tag: string) {
  const id = `qa-econ-${tag}-${Date.now()}`;
  await db.user.create({
    data: {
      id,
      email: `${id}@qa.local`,
      username: id.slice(0, 20),
      name: `QA ${tag}`,
    },
  });
  await db.aptWallet.create({ data: { userId: id, gold: 0, gems: 0, legacyMigrated: true } });
  return id;
}

async function cleanup(users: string[]) {
  if (KEEP) {
    console.log("\n⚠️  ECONOMY_QA_KEEP=1 — cleanup skipped");
    return;
  }
  for (const userId of users) {
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

async function testStorage() {
  console.log("\n── Storage ──");
  const userId = await createQaUser("storage");
  await addInventoryAndStorage(userId, "lamp", 1, "shop");

  const c1 = await consumeStorageItem(userId, "lamp", 1);
  const c2 = await consumeStorageItem(userId, "lamp", 1);
  assert("동시 배치 방지 — 두 번째 consume 실패", "error" in c2, String(c2));

  const snap = await loadEconomySnapshot(userId);
  const qty = snap.storage.find((s) => s.itemId === "lamp")?.quantity ?? -1;
  assert("배치 후 창고 0", qty === 0, `qty=${qty}`);

  await returnStorageItem(userId, "lamp", 1);
  const r2 = await returnStorageItem(userId, "lamp", 1);
  const afterReturn = await loadEconomySnapshot(userId);
  const qty2 = afterReturn.storage.find((s) => s.itemId === "lamp")?.quantity ?? -1;
  assert("삭제 2회 반환 시 수량 1만 증가", qty2 === 1, `qty=${qty2}`);
  assert("두 번째 반환 실패", "error" in r2);

  return [userId];
}

async function testOfflineSync() {
  console.log("\n── Offline Sync ──");
  const userId = await createQaUser("offline");
  await addInventoryAndStorage(userId, "plant", 2, "shop");

  const opId = `qa-offline-${Date.now()}`;
  const r1 = await syncPendingStorageOps(userId, [
    { opId, itemId: "plant", amount: 1, kind: "consume" },
  ]);
  assert("pending consume 1회 적용", "ok" in r1 && r1.applied === 1);

  const r2 = await syncPendingStorageOps(userId, [
    { opId, itemId: "plant", amount: 1, kind: "consume" },
  ]);
  assert("동일 opId 재동기화 — 중복 없음", "ok" in r2 && r2.applied === 1);

  const snap = await loadEconomySnapshot(userId);
  const qty = snap.storage.find((s) => s.itemId === "plant")?.quantity ?? -1;
  assert("오프라인 배치 1회만 반영", qty === 1, `qty=${qty}`);

  const claimed = await hasEconomyOperation(opId);
  assert("opId 기록됨", claimed);

  return [userId];
}

async function testWallet() {
  console.log("\n── Wallet ──");
  const userId = await createQaUser("wallet");
  await creditWallet({
    userId,
    currency: "gold",
    amount: 100,
    type: "admin",
    referenceId: "qa-grant",
    referenceType: "AptWallet",
    memo: "QA",
  });

  let neg = false;
  try {
    await debitWallet({
      userId,
      currency: "gold",
      amount: 200,
      type: "admin",
      referenceId: "qa-over",
      referenceType: "AptWallet",
    });
  } catch {
    neg = true;
  }
  assert("음수 골드 방지", neg);

  const dupRef = "qa-dup-ref";
  await creditWallet({
    userId,
    currency: "gold",
    amount: 10,
    type: "admin",
    referenceId: dupRef,
    referenceType: "AptWallet",
  });
  let dupErr = false;
  try {
    await creditWallet({
      userId,
      currency: "gold",
      amount: 10,
      type: "admin",
      referenceId: dupRef,
      referenceType: "AptWallet",
    });
  } catch {
    dupErr = true;
  }
  assert("중복 reference 지급 방지", dupErr);

  const snap = await loadEconomySnapshot(userId);
  assert("잔액 정합", snap.wallet.gold === 110, `gold=${snap.wallet.gold}`);

  return [userId];
}

async function testMarket() {
  console.log("\n── Market ──");
  const seller = await createQaUser("seller");
  const buyerA = await createQaUser("buyer-a");
  const buyerB = await createQaUser("buyer-b");

  await addInventoryAndStorage(seller, "chair", 1, "shop");
  await creditWallet({ userId: buyerA, currency: "gold", amount: 500, type: "admin", referenceId: "ba", referenceType: "AptWallet" });
  await creditWallet({ userId: buyerB, currency: "gold", amount: 500, type: "admin", referenceId: "bb", referenceType: "AptWallet" });

  const listed = await createMarketListingFromStorage({
    sellerId: seller,
    stickerTypeId: "chair",
    priceGold: 200,
  });
  assert("판매 등록", "ok" in listed);
  if (!("ok" in listed)) return [seller, buyerA, buyerB];
  const listingId = listed.listingId;

  const selfBuy = await buyMarketListing(seller, listingId);
  assert("판매자 자기 구매 차단", "error" in selfBuy);

  const poor = await createQaUser("poor");
  const poorBuy = await buyMarketListing(poor, listingId);
  assert("골드 부족 차단", "error" in poorBuy);

  const [rA, rB] = await Promise.all([
    buyMarketListing(buyerA, listingId),
    buyMarketListing(buyerB, listingId),
  ]);
  const wins = [rA, rB].filter((r) => "ok" in r).length;
  assert("동시 구매 — 1명만 성공", wins === 1, `wins=${wins}`);

  const cancelAfter = await cancelMarketListing(seller, listingId);
  assert("판매 완료 후 취소 불가", "error" in cancelAfter);

  await addInventoryAndStorage(seller, "chair", 1, "shop");
  const listing2 = await createMarketListingFromStorage({
    sellerId: seller,
    stickerTypeId: "chair",
    priceGold: 100,
  });
  if ("ok" in listing2) {
    const cancelled = await cancelMarketListing(seller, listing2.listingId);
    assert("판매 중 취소", "ok" in cancelled);
    const sellerSnap = await loadEconomySnapshot(seller);
    const chairQty = sellerSnap.storage.find((s) => s.itemId === "chair")?.quantity ?? 0;
    assert("취소 시 창고 반환", chairQty >= 1, `qty=${chairQty}`);
  }

  const history = await db.aptMarketPriceHistory.count({
    where: { stickerTypeId: "chair" },
  });
  assert("판매 시 가격 히스토리 기록", history >= 1, `count=${history}`);

  return [seller, buyerA, buyerB, poor];
}

async function main() {
  console.log("Economy QA 시작…\n");
  const users: string[] = [];

  try {
    users.push(...(await testStorage()));
    users.push(...(await testOfflineSync()));
    users.push(...(await testWallet()));
    users.push(...(await testMarket()));
  } finally {
    await cleanup(users);
    await db.$disconnect();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${"─".repeat(40)}`);
  console.log(`결과: ${results.length - failed.length}/${results.length} 통과`);
  if (failed.length) {
    console.error("\n실패 항목:");
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
  console.log("\n✅ Economy QA 전체 통과 — IAP 전 안정화 체크리스트 OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
