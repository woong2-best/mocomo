import { db } from "@/lib/db";

export type MarketAdminFlags = {
  readOnly: boolean;
  blockCreateListing: boolean;
  blockPurchase: boolean;
  blockNewListing: boolean;
};

const DEFAULT_FLAGS: MarketAdminFlags = {
  readOnly: false,
  blockCreateListing: false,
  blockPurchase: false,
  blockNewListing: false,
};

export async function getMarketAdminFlags(): Promise<MarketAdminFlags> {
  const row = await db.aptMarketAdminMeta.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_FLAGS;
  return {
    readOnly: row.readOnly,
    blockCreateListing: row.blockCreateListing,
    blockPurchase: row.blockPurchase,
    blockNewListing: row.blockNewListing,
  };
}

export async function setMarketAdminFlags(
  adminId: string,
  flags: Partial<MarketAdminFlags>
): Promise<MarketAdminFlags> {
  const row = await db.aptMarketAdminMeta.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_FLAGS, ...flags, updatedById: adminId },
    update: { ...flags, updatedById: adminId },
  });
  return {
    readOnly: row.readOnly,
    blockCreateListing: row.blockCreateListing,
    blockPurchase: row.blockPurchase,
    blockNewListing: row.blockNewListing,
  };
}

export type MarketOp = "create" | "purchase" | "read";

const MARKET_BLOCK_MSG = "장터가 일시적으로 제한되었습니다.";

export async function assertMarketAdminAllows(op: MarketOp): Promise<void> {
  const flags = await getMarketAdminFlags();
  if (flags.readOnly && op !== "read") {
    throw new Error(MARKET_BLOCK_MSG);
  }
  if (op === "create" && (flags.blockCreateListing || flags.blockNewListing)) {
    throw new Error(MARKET_BLOCK_MSG);
  }
  if (op === "purchase" && flags.blockPurchase) {
    throw new Error(MARKET_BLOCK_MSG);
  }
}

export { MARKET_BLOCK_MSG };
