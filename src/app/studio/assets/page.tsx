import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getMyStudioAssets } from "@/studio/actions/assets";
import { AssetCard } from "@/studio/components/asset-card";
import { Button } from "@/components/ui/button";

export default async function StudioAssetsPage() {
  await requireAuth();
  const assets = await getMyStudioAssets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">내 자산</h1>
        <Button asChild>
          <Link href="/studio/create">+ 새 자산</Link>
        </Button>
      </div>
      {assets.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} href={`/studio/assets/${a.id}`} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">아직 자산이 없습니다.</p>
      )}
    </div>
  );
}
