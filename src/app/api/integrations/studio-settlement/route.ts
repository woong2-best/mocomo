import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STUDIO_PLATFORM_FEE_PERCENT } from "@/studio/lib/constants";
import { grantStudioInventory } from "@/studio/lib/inventory";

/** MoCoMo 인앱 구매 → Studio 크리에이터 정산 이벤트 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-studio-integration-secret");
  const expected = process.env.STUDIO_INTEGRATION_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = String(body.userId ?? "");
  const studioAssetId = String(body.studioAssetId ?? "");
  const amountKrw = Number(body.amountKrw ?? 0);
  const externalRef = body.externalRef ? String(body.externalRef) : null;

  if (!userId || !studioAssetId || amountKrw <= 0) {
    return NextResponse.json({ error: "userId, studioAssetId, amountKrw required" }, { status: 400 });
  }

  const asset = await db.studioAsset.findUnique({ where: { id: studioAssetId } });
  if (!asset || asset.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const platformFee = Math.floor((amountKrw * STUDIO_PLATFORM_FEE_PERCENT) / 100);
  const creatorEarn = amountKrw - platformFee;

  await db.$transaction(async (tx) => {
    await tx.studioSettlementEvent.create({
      data: {
        userId,
        studioAssetId,
        amountKrw,
        platformFee,
        creatorEarn,
        externalRef,
      },
    });

    await tx.studioAsset.update({
      where: { id: studioAssetId },
      data: { saleCount: { increment: 1 } },
    });

    const wallet = await tx.studioWallet.upsert({
      where: { userId: asset.creatorId },
      create: {
        userId: asset.creatorId,
        availableBalance: creatorEarn,
        totalEarned: creatorEarn,
      },
      update: {
        availableBalance: { increment: creatorEarn },
        totalEarned: { increment: creatorEarn },
      },
    });

    await tx.studioWalletTransaction.create({
      data: {
        userId: asset.creatorId,
        type: "MOCOMO_INAPP",
        amount: creatorEarn,
        balanceAfter: wallet.availableBalance,
        referenceType: "StudioSettlementEvent",
        referenceId: studioAssetId,
        memo: asset.name,
      },
    });

    await tx.studioCreatorProfile.updateMany({
      where: { userId: asset.creatorId },
      data: { totalSales: { increment: 1 } },
    });
  });

  await grantStudioInventory(userId, studioAssetId, "MOCOMO_INAPP");

  return NextResponse.json({ success: true, platformFee, creatorEarn });
}
