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
        <h1 className="font-display text-2xl font-semibold">My assets</h1>
        <Button asChild>
          <Link href="/studio/create">+ New asset</Link>
        </Button>
      </div>
      {assets.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} href={`/studio/assets/${a.id}`} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No assets yet.</p>
      )}
    </div>
  );
}
