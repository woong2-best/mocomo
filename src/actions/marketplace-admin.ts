"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function resolveMarketplaceDispute(
  disputeId: string,
  decision: "buyer" | "seller",
  note: string
) {
  await requireAdmin({
    action: "MARKETPLACE_DISPUTE_RESOLVE",
    targetType: "marketplace_dispute",
    targetId: disputeId,
  });

  const dispute = await db.marketplaceDispute.findUnique({
    where: { id: disputeId },
    include: { order: true },
  });
  if (!dispute) return { error: "분쟁을 찾을 수 없습니다." };

  const status = decision === "buyer" ? "RESOLVED_BUYER" : "RESOLVED_SELLER";
  await db.marketplaceDispute.update({
    where: { id: disputeId },
    data: {
      status,
      resolution: note.trim() || (decision === "buyer" ? "구매자 승" : "판매자 승"),
      resolvedAt: new Date(),
    },
  });

  if (decision === "buyer") {
    await db.marketplaceOrder.update({
      where: { id: dispute.orderId },
      data: { status: "REFUNDED" },
    });
  } else {
    await db.marketplaceOrder.update({
      where: { id: dispute.orderId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
  }

  await createNotification({
    userId: dispute.order.buyerId,
    type: "SYSTEM",
    title: "분쟁 처리 결과",
    body: note.trim() || status,
    link: `/market/orders/${dispute.orderId}`,
  });
  await createNotification({
    userId: dispute.order.sellerId,
    type: "SYSTEM",
    title: "분쟁 처리 결과",
    body: note.trim() || status,
    link: `/market/orders/${dispute.orderId}`,
  });

  revalidatePath("/admin/market");
  revalidatePath(`/market/orders/${dispute.orderId}`);
  return { success: true };
}
