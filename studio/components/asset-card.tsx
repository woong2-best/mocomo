import Link from "next/link";
import type { StudioAsset, User } from "@prisma/client";
import { STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import { AssetStatusBadge } from "./asset-status-badge";

type AssetWithCreator = StudioAsset & {
  creator?: Pick<User, "id" | "username" | "name" | "image"> | null;
};

export function AssetCard({ asset, href }: { asset: AssetWithCreator; href: string }) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-square bg-gradient-to-br from-pink-50 to-violet-50">
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-40">🛋️</div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-medium group-hover:text-pink-600">{asset.name}</h3>
          <AssetStatusBadge status={asset.status} />
        </div>
        <p className="text-xs text-muted-foreground">{STUDIO_CATEGORY_LABELS[asset.category]}</p>
        <p className="text-sm font-semibold text-pink-600">
          {asset.isFree || asset.priceKrw <= 0 ? "무료" : `${asset.priceKrw.toLocaleString()}원`}
        </p>
      </div>
    </Link>
  );
}
