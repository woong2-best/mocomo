import type {
  EconomySnapshotPayload,
  SnapshotDiff,
  SnapshotDiffMetric,
  SnapshotStats,
} from "./backup-types";
import { verifyPayloadChecksum } from "./backup-checksum";
import { captureCurrentStats } from "./backup-capture-service";

function metric(
  key: string,
  label: string,
  snapshot: number,
  current: number
): SnapshotDiffMetric {
  return { key, label, snapshot, current, difference: current - snapshot };
}

export function buildSnapshotDiff(
  snapshotStats: SnapshotStats,
  currentStats: SnapshotStats,
  payload: EconomySnapshotPayload,
  checksum: string
): SnapshotDiff {
  const checksumOk = verifyPayloadChecksum(payload, checksum);
  const metrics: SnapshotDiffMetric[] = [
    metric("goldSupply", "Gold Supply", snapshotStats.goldSupply, currentStats.goldSupply),
    metric("gemSupply", "Gem Supply", snapshotStats.gemSupply, currentStats.gemSupply),
    metric("userCount", "Users", snapshotStats.userCount, currentStats.userCount),
    metric("walletCount", "Wallets", snapshotStats.walletCount, currentStats.walletCount),
    metric(
      "inventoryCount",
      "Inventory",
      snapshotStats.inventoryCount,
      currentStats.inventoryCount
    ),
    metric("storageCount", "Storage", snapshotStats.storageCount, currentStats.storageCount),
    metric("listingCount", "Listings", snapshotStats.listingCount, currentStats.listingCount),
    metric(
      "goldShopOfferCount",
      "Shop Offers",
      snapshotStats.goldShopOfferCount,
      currentStats.goldShopOfferCount
    ),
    metric(
      "fleaEventCount",
      "Flea Events",
      snapshotStats.fleaEventCount,
      currentStats.fleaEventCount
    ),
    metric(
      "npcOfferCount",
      "NPC Offers",
      snapshotStats.npcOfferCount,
      currentStats.npcOfferCount
    ),
    metric(
      "fraudRuleCount",
      "Fraud Rules",
      snapshotStats.fraudRuleCount,
      currentStats.fraudRuleCount
    ),
  ];

  return {
    metrics,
    checksumOk,
    corrupted: !checksumOk,
  };
}

export async function diffSnapshotAgainstLive(
  snapshotStats: SnapshotStats,
  payload: EconomySnapshotPayload,
  checksum: string
): Promise<SnapshotDiff> {
  const currentStats = await captureCurrentStats();
  return buildSnapshotDiff(snapshotStats, currentStats, payload, checksum);
}
