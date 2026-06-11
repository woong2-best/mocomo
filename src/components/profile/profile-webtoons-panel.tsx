import Link from "next/link";
import { isPaymentsConfigured } from "@/lib/payments";
import { PurchaseEpisodeButton } from "@/components/works/purchase-episode-button";
import type { ProfileIllustrationItem } from "@/actions/webtoon";
import { ImageIcon } from "lucide-react";

export function ProfileWebtoonsPanel({
  works,
  username,
}: {
  works: ProfileIllustrationItem[];
  username: string;
}) {
  if (works.length === 0) return null;
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <aside className="border-t lg:border-t-0 lg:border-l border-border/40 bg-muted/20 lg:min-h-[320px]">
      <div className="sticky top-14 p-4 space-y-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[#0096fa]" />
          <h2 className="font-bold text-sm">판매 작품</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {works.map((work) => (
            <div key={work.id} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <Link href={`/webtoon/e/${work.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={work.thumbnailUrl} alt="" className="w-full aspect-square object-cover" />
              </Link>
              <div className="p-2 space-y-1.5">
                <Link href={`/webtoon/e/${work.id}`} className="text-[11px] font-semibold line-clamp-2 hover:text-[#0096fa]">
                  {work.title}
                </Link>
                <p className="text-[10px] text-muted-foreground">
                  {work.price <= 0 ? "무료" : `${work.price.toLocaleString()}원`}
                </p>
                {work.owned ? (
                  <Link
                    href={`/webtoon/e/${work.id}`}
                    className="block text-center text-[10px] font-medium text-[#0096fa] py-0.5"
                  >
                    보기
                  </Link>
                ) : work.price > 0 ? (
                  <PurchaseEpisodeButton
                    episodeId={work.id}
                    price={work.price}
                    title={work.title}
                    paymentsEnabled={paymentsEnabled}
                  />
                ) : (
                  <Link
                    href={`/webtoon/e/${work.id}`}
                    className="block text-center text-[10px] font-medium text-[#0096fa] py-0.5"
                  >
                    무료 보기
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <Link href="/webtoon" className="block text-[10px] text-center text-[#0096fa] hover:underline">
          @{username}의 일러스트 더 보기
        </Link>
      </div>
    </aside>
  );
}
