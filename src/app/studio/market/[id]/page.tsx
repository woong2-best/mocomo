import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStudioAsset } from "@/studio/actions/assets";
import { MarketAssetDetail } from "@/studio/components/market-asset-detail";

export default async function StudioMarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const asset = await getStudioAsset(id);
  if (!asset || asset.status !== "PUBLISHED") notFound();

  let liked = false;
  let purchased = false;
  if (session?.user?.id) {
    liked = !!(await db.studioAssetLike.findUnique({
      where: { userId_assetId: { userId: session.user.id, assetId: id } },
    }));
    purchased = !!(await db.studioAssetPurchase.findUnique({
      where: { buyerId_assetId: { buyerId: session.user.id, assetId: id } },
    }));
  }

  return (
    <div className="space-y-4">
      <Link href="/studio/market" className="text-sm text-pink-600 hover:underline">
        ← 마켓
      </Link>
      <MarketAssetDetail
        asset={asset}
        liked={liked}
        purchased={purchased}
        isOwner={session?.user?.id === asset.creatorId}
      />
      <p className="text-sm text-muted-foreground">
        by{" "}
        <Link href={`/studio/creator/${asset.creator.username}`} className="text-pink-600 hover:underline">
          {asset.creator.name ?? asset.creator.username}
        </Link>
      </p>
    </div>
  );
}
