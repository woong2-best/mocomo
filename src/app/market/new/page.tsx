import { redirect } from "next/navigation";
import Link from "next/link";
import { Box, ChevronLeft, Palette } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default async function MarketSellChoicePage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/market/new");
  const { t } = await getServerTranslator();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/market"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {MARKET_BRAND_NAME}
      </Link>

      <div className="flex min-h-[58vh] items-center justify-center px-2">
        <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-5">
          <Link
            href="/market/new/physical"
            className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-4 py-10 text-center shadow-sm transition hover:border-folk-terracotta/50 hover:shadow-md"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-folk-terracotta/10 text-folk-terracotta">
              <Box className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <span className="text-xl font-extrabold">{t("market.sell.physical")}</span>
            <span className="text-sm font-semibold text-muted-foreground">{t("market.sell.physicalHint")}</span>
          </Link>
          <Link
            href="/market/new/digital"
            className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-4 py-10 text-center shadow-sm transition hover:border-folk-terracotta/50 hover:shadow-md"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-folk-terracotta/10 text-folk-terracotta">
              <Palette className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <span className="text-xl font-extrabold">{t("market.sell.digital")}</span>
            <span className="text-sm font-semibold text-muted-foreground">{t("market.sell.digitalHint")}</span>
          </Link>
        </div>
      </div>
    </AppPageChrome>
  );
}
