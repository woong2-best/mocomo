"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export function UsedSectionHeader() {
  const { t } = useLocale();
  const { isNativeApp } = useClientPlatform();
  const pathname = usePathname();
  const sellActive = pathname === "/market/new" || pathname.startsWith("/market/new/");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className={cn("min-w-0 truncate text-xl font-extrabold", isNativeApp && "sr-only")}>
        {pathname === "/market" ? (
          MARKET_BRAND_NAME
        ) : (
          <Link href="/market" className="hover:text-folk-terracotta">
            {MARKET_BRAND_NAME}
          </Link>
        )}
      </h1>
      <nav className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          size="sm"
          className={cn(
            "h-9 rounded-full bg-folk-terracotta px-4 font-extrabold text-white hover:bg-folk-terracotta/90",
            sellActive && "ring-2 ring-folk-cobalt/30"
          )}
          asChild
        >
          <Link href="/market/new">{t("ui.sell")}</Link>
        </Button>
      </nav>
    </div>
  );
}
