"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SellerSettlementInvoiceRow = {
  id: string;
  settledAt: string;
  grossAmount: number;
  platformFee: number;
  netPaidAmount: number;
  stripeTransferId: string | null;
  currency: string;
  itemTitle: string;
};

/** Settled marketplace orders — global invoice format (not KR tax invoice) */
export async function getSellerSettlementInvoices(limit = 30): Promise<SellerSettlementInvoiceRow[]> {
  const user = await requireAuth();
  const orders = await db.marketplaceOrder.findMany({
    where: {
      sellerId: user.id,
      settlementStatus: "SETTLED",
      status: "SETTLED",
    },
    orderBy: { settledAt: "desc" },
    take: limit,
    select: {
      id: true,
      settledAt: true,
      subtotalAmount: true,
      platformFeeAmount: true,
      sellerEarnAmount: true,
      stripeTransferId: true,
      currency: true,
      items: { select: { titleSnapshot: true }, take: 1 },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    settledAt: o.settledAt?.toISOString() ?? "",
    grossAmount: o.subtotalAmount,
    platformFee: o.platformFeeAmount,
    netPaidAmount: o.sellerEarnAmount,
    stripeTransferId: o.stripeTransferId,
    currency: o.currency,
    itemTitle: o.items[0]?.titleSnapshot ?? "Marketplace order",
  }));
}
