"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, ShoppingBag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

const shortcuts = [
  { href: "/market/my?lane=purchased", lane: "purchased", labelKey: "market.purchases", icon: ShoppingBag },
  { href: "/market/my?lane=selling", lane: "selling", labelKey: "market.sales", icon: DollarSign },
  { href: "/market/my?lane=favorites", lane: "favorites", labelKey: "market.favorites", icon: Heart },
] as const;

export function UsedSectionHeader() {
  const { t } = useLocale();
  const { isNativeApp } = useClientPlatform();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLane =
    pathname === "/market/my" ? searchParams.get("lane") ?? "selling" : null;
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
        {shortcuts.map((item) => {
          const Icon = item.icon;
          const active = activeLane === item.lane;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "inline-flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-center hover:bg-muted/70",
                active && "bg-muted"
              )}
            >
              <Icon className="h-5 w-5 text-folk-cobalt" strokeWidth={1.6} />
              <span className="text-[10px] font-bold leading-tight">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
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
