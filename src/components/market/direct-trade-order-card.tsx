import { formatPrice } from "@/lib/money";
import type { DirectTradeSnapshot } from "@/lib/marketplace/payment-routing";

export function DirectTradeOrderCard({
  snapshot,
  status,
}: {
  snapshot: DirectTradeSnapshot | null;
  status: string;
}) {
  if (!snapshot) return null;

  const awaiting = status === "AWAITING_PAYMENT";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">무통장 직거래</p>
        <p className="text-sm text-amber-950 mt-1 leading-relaxed">{snapshot.notice}</p>
      </div>

      <dl className="rounded-xl border border-amber-100 bg-white/70 p-3 text-sm space-y-2">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">판매자</dt>
          <dd className="font-semibold">{snapshot.sellerDisplayName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">은행</dt>
          <dd className="font-semibold">{snapshot.bankName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">계좌번호</dt>
          <dd className="font-mono font-bold">{snapshot.accountNumber}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">예금주</dt>
          <dd className="font-semibold">{snapshot.accountHolder}</dd>
        </div>
        {snapshot.contactPhone ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">연락처</dt>
            <dd className="font-semibold">{snapshot.contactPhone}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 pt-2 border-t border-border/40">
          <dt className="text-muted-foreground">송금 금액</dt>
          <dd className="text-lg font-black text-primary">
            {formatPrice(snapshot.amount, snapshot.currency)}
          </dd>
        </div>
      </dl>

      {awaiting ? (
        <p className="text-xs text-amber-900">
          아래 계좌로 입금 후 주문 화면에서 「송금 완료 표시」를 눌러 주세요.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          입금·발송·환불 등은 구매자와 판매자 간 직접 협의합니다.
        </p>
      )}
    </div>
  );
}
