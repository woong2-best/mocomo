"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

const tabs = [
  { href: "/market", label: MARKET_BRAND_NAME, match: (p: string) => p === "/market" },
  { href: "/market/orders", label: t("market.sz7p8"), match: (p: string) => p.startsWith("/market/orders") },
  { href: "/market/seller", label: t("market.svtn3w"), match: (p: string) => p.startsWith("/market/seller") },
  {
    href: "/market/sell-item",
    label: t("market.s1vdpeu0"),
    match: (p: string) => p.startsWith("/market/sell-item"),
  },
  { href: "/webtoon", label: t("nav.webtoon"), match: (p: string) => p.startsWith("/webtoon") },
  { href: "/market", label: t("nav.used"), match: (p: string) => p.startsWith("/market") },
];

export function MarketNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none -mx-0.5 px-0.5 border-b border-folk-cobalt/10">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 px-3.5 py-2.5 text-sm font-bold transition-colors relative",
              active
                ? "text-folk-terracotta"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {active && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-folk-terracotta" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
