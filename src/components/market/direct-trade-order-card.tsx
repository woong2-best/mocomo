import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{t("market.s1izxg7h")}</p>
        <p className="text-sm text-amber-950 mt-1 leading-relaxed">{snapshot.notice}</p>
      </div>

      <dl className="rounded-xl border border-amber-100 bg-white/70 p-3 text-sm space-y-2">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("market.svtn3w")}</dt>
          <dd className="font-semibold">{snapshot.sellerDisplayName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("market.sz2a1")}</dt>
          <dd className="font-semibold">{snapshot.bankName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("market.smmrdvc")}</dt>
          <dd className="font-mono font-bold">{snapshot.accountNumber}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("market.stux30")}</dt>
          <dd className="font-semibold">{snapshot.accountHolder}</dd>
        </div>
        {snapshot.contactPhone ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("market.stw1wr")}</dt>
            <dd className="font-semibold">{snapshot.contactPhone}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 pt-2 border-t border-border/40">
          <dt className="text-muted-foreground">{t("market.s1wr00pe")}</dt>
          <dd className="text-lg font-black text-primary">
            {formatPrice(snapshot.amount, snapshot.currency)}
          </dd>
        </div>
      </dl>

      {awaiting ? (
        <p className="text-xs text-amber-900">
          {t("market.se5y3r3")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("market.sxqf0vb")}
        </p>
      )}
    </div>
  );
}
