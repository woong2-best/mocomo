import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getFollowedCreatorsFeed } from "@/studio/actions/discover";
import { AssetCard } from "@/studio/components/asset-card";

export default async function StudioFollowingPage() {
  await requireAuth();
  const assets = await getFollowedCreatorsFeed(48);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">팔로우 피드</h1>
      {assets.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} href={`/studio/market/${a.id}`} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          팔로우한 크리에이터의 새 작품이 없습니다.{" "}
          <Link href="/studio/discover" className="text-pink-600 hover:underline">
            크리에이터 탐색
          </Link>
        </p>
      )}
    </div>
  );
}
