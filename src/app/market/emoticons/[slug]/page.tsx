import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmoticonPackBySlug } from "@/actions/goods-shop";
import { isPaymentsConfigured } from "@/lib/payments";
import { TossPayButton } from "@/components/payments/toss-pay-button";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ImageIcon } from "lucide-react";

export default async function EmoticonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getEmoticonPackBySlug(slug);
  if (!pack) notFound();

  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/market/emoticons">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          이모티콘
        </Button>
      </Link>

      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
        <div className="aspect-square bg-muted/30 flex items-center justify-center p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pack.previewUrl} alt={pack.name} className="max-h-full max-w-full object-contain" />
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{pack.name}</h2>
            <p className="text-2xl font-black text-neon-cyan mt-1">{pack.price.toLocaleString()}원</p>
          </div>

          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            상세 이미지는 추후 업데이트됩니다.
          </div>

          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>구매 후 마이 스토리지에 저장</li>
            <li>스트리머에게 1회 선물 가능</li>
            <li>선물 시 스트리머에게 90% 적립 (수수료 10%)</li>
            <li>한 번내면 사용완료 처리</li>
          </ul>

          {paymentsEnabled ? (
            <TossPayButton
              type="EMOTICON"
              amount={pack.price}
              orderName={`MoCoMo ${pack.name}`}
              metadata={{ packId: pack.id }}
              className="w-full rounded-2xl h-12"
            >
              {pack.price.toLocaleString()}원 구매
            </TossPayButton>
          ) : (
            <p className="text-sm text-destructive text-center">결제 설정이 필요합니다 (Toss Payments).</p>
          )}
        </div>
      </div>
    </div>
  );
}
