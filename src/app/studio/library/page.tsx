import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getMyStudioLibrary } from "@/studio/actions/library";
import { AssetCard } from "@/studio/components/asset-card";

export default async function StudioLibraryPage() {
  await requireAuth();
  const items = await getMyStudioLibrary();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">내 보관함</h1>
      <p className="text-sm text-muted-foreground">무료 획득·구매한 Studio 자산 · MoCoMo APT 연동 대기</p>
      {items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map(({ asset }) => (
            <AssetCard key={asset.id} asset={asset} href={`/studio/market/${asset.id}`} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          보관함이 비어 있습니다.{" "}
          <Link href="/studio/market" className="text-pink-600 hover:underline">
            마켓에서 자산 획득
          </Link>
        </p>
      )}
    </div>
  );
}
