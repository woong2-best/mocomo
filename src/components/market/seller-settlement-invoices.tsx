import { formatUsd } from "@/lib/money";
import type { SellerSettlementInvoiceRow } from "@/actions/marketplace-settlement-invoices";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";

const PLATFORM_FEE_LABEL = "Platform fee (10%)";

function fmt(amount: number, currency: string) {
  if (currency.toLowerCase() === "usd") return formatUsd(amount);
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function SellerSettlementInvoices({
  invoices,
}: {
  invoices: SellerSettlementInvoiceRow[];
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        정산 완료된 주문이 없습니다. 구매 확정 후 Stripe Connect로 자동 정산됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        아래는 {MARKET_BRAND_FULL} 플랫폼 수수료(10%) 차감 내역서입니다. 세무 증빙(W-8BEN 등)은
        Stripe Connect에서 관리합니다. 한국 세금계산서가 아닌 글로벌 Invoice 형식입니다.
      </p>
      {invoices.map((inv) => (
        <article
          key={inv.id}
          className="rounded-xl border border-border/60 bg-white p-4 sm:p-5 shadow-sm print:break-inside-avoid"
        >
          <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Settlement Invoice
              </p>
              <p className="font-bold mt-0.5">{inv.itemTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Order #{inv.id.slice(0, 8).toUpperCase()}
                {inv.settledAt
                  ? ` · ${new Date(inv.settledAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}`
                  : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">MoCoMo LLC · Stripe payout</p>
          </header>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Gross (subtotal)</dt>
            <dd className="text-right font-medium">{fmt(inv.grossAmount, inv.currency)}</dd>
            <dt className="text-muted-foreground">{PLATFORM_FEE_LABEL}</dt>
            <dd className="text-right font-medium text-destructive">
              −{fmt(inv.platformFee, inv.currency)}
            </dd>
            <dt className="font-semibold">Net paid to seller</dt>
            <dd className="text-right font-bold text-emerald-700">
              {fmt(inv.netPaidAmount, inv.currency)}
            </dd>
          </dl>
          {inv.stripeTransferId ? (
            <p className="mt-3 text-[11px] text-muted-foreground font-mono truncate">
              Stripe Transfer: {inv.stripeTransferId}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
