import { USED_MARKET_BAN_MESSAGE } from "@/lib/used-market-access";
import { AlertTriangle } from "lucide-react";

export function UsedMarketBanBanner({ banned }: { banned: boolean }) {
  if (!banned) return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-destructive">중고거래 이용 제한</p>
        <p className="text-muted-foreground leading-relaxed">{USED_MARKET_BAN_MESSAGE}</p>
      </div>
    </div>
  );
}
