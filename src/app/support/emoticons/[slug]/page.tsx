import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmoticonPackBySlug, resolveEmoticonPackForPurchase } from "@/actions/goods-shop";
import { isPaymentsConfigured } from "@/lib/payments";
import { PayButton } from "@/components/payments/pay-button";
import { EmoticonPreview } from "@/components/market/emoticon-preview";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Gem, ImageIcon } from "lucide-react";

export default async function SupportEmoticonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pack, dbReady } = await getEmoticonPackBySlug(slug);
  if (!pack) notFound();

  let purchasePackId = pack.id.startsWith("fallback-") ? null : pack.id;
  if (!purchasePackId && dbReady) {
    const resolved = await resolveEmoticonPackForPurchase(slug);
    if (resolved.pack) purchasePackId = resolved.pack.id;
  }

  const paymentsEnabled = isPaymentsConfigured() && !!purchasePackId && dbReady;

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-6">
      <Link href="/support?tab=emoticons">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          후원 · 이모티콘
        </Button>
      </Link>

      {!dbReady && (
        <p className="text-sm rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          DB 연동 전에는 목록만 보입니다. Supabase SQL 섹션 J 실행 후 구매할 수 있습니다.
        </p>
      )}

      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
        <div className="p-6">
          <EmoticonPreview
            name={pack.name}
            price={pack.price}
            previewUrl={pack.previewUrl}
            size="lg"
          />
        </div>
        <div className="p-5 space-y-4 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-pink-500" />
            <h2 className="text-xl font-bold">{pack.name}</h2>
          </div>
          <p className="text-2xl font-black text-primary">{pack.price.toLocaleString()}원</p>

          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
            <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-50" />
            상세 이미지는 나중에 추가됩니다.
          </div>

          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>구매 → 후원 보관함</li>
            <li>크리에이터에게 1회 선물 (90% 정산)</li>
            <li>선물 후 사용 완료</li>
          </ul>

          {paymentsEnabled && purchasePackId ? (
            <PayButton
              type="EMOTICON"
              amount={pack.price}
              orderName={`MoCoMo ${pack.name}`}
              metadata={{ packId: purchasePackId, packSlug: pack.slug }}
              className="w-full rounded-2xl h-12"
            >
              {pack.price.toLocaleString()}원 구매
            </PayButton>
          ) : (
            <p className="text-sm text-center text-muted-foreground">
              {!dbReady ? "DB 연동 후 구매 가능" : "결제 설정(Stripe)이 필요합니다"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
