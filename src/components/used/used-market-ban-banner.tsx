import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { USED_MARKET_BAN_APPEAL_HINT, USED_MARKET_BAN_MESSAGE } from "@/lib/used-market-access";
import { USED_MARKET_APPEAL_PATH } from "@/lib/used-auction-legal";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UsedMarketBanBanner({
  banned,
  bannedAt,
  listingTitle,
}: {
  banned: boolean;
  bannedAt?: Date | null;
  listingTitle?: string | null;
}) {
  if (!banned) return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm min-w-0">
          <p className="font-semibold text-destructive">{t("used.s1pqwjk2")}</p>
          <p className="text-muted-foreground leading-relaxed">{USED_MARKET_BAN_MESSAGE}</p>
          {bannedAt && (
            <p className="text-xs text-muted-foreground">
              {t("used.sanctionAppliedAt", {
                date: new Date(bannedAt).toLocaleString("en-US"),
              })}
              {listingTitle ? ` · ${listingTitle}` : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">{USED_MARKET_BAN_APPEAL_HINT}</p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="self-start rounded-lg">
        <Link href={USED_MARKET_APPEAL_PATH}>{t("used.syla3zs")}</Link>
      </Button>
    </div>
  );
}
