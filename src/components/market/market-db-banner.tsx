import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export function MarketDbBanner({ dbReady }: { dbReady: boolean }) {
  if (dbReady) return null;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex gap-3">
      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-medium text-amber-900 dark:text-amber-100">{t("market.s169pnzt")}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("market.dbBannerPreview")}{" "}
          <strong>{t("market.sp5o4vd")}</strong> {t("market.spg8fih")} <code className="text-[10px]">npx prisma db push</code> {t("market.sac022h")}
        </p>
        <Link href="/legal" className="text-xs text-primary hover:underline">
          {t("market.s1yqwa3e")}
        </Link>
      </div>
    </div>
  );
}
