import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStudioAsset } from "@/studio/actions/assets";
import { userHasStudioAsset } from "@/studio/actions/library";
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

  const creatorProfile = await db.studioCreatorProfile.findUnique({
    where: { userId: asset.creatorId },
    select: { handle: true },
  });

  let liked = false;
  let owned = false;
  if (session?.user?.id) {
    liked = !!(await db.studioAssetLike.findUnique({
      where: { userId_assetId: { userId: session.user.id, assetId: id } },
    }));
    owned = await userHasStudioAsset(session.user.id, id);
  }

  return (
    <div className="space-y-4">
      <Link href="/studio/market" className="text-sm text-pink-600 hover:underline">
        ← 마켓
      </Link>
      <MarketAssetDetail
        asset={asset}
        liked={liked}
        owned={owned}
        isOwner={session?.user?.id === asset.creatorId}
      />
      {creatorProfile && (
        <p className="text-sm text-muted-foreground">
          by{" "}
          <Link href={`/studio/creator/${creatorProfile.handle}`} className="text-pink-600 hover:underline">
            {asset.creator.name ?? asset.creator.username}
          </Link>
        </p>
      )}
    </div>
  );
}
