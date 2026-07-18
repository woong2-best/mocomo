"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/market", label: "MARKET", match: (p: string) => p === "/market" },
  { href: "/market/orders", label: "주문", match: (p: string) => p.startsWith("/market/orders") },
  { href: "/market/seller", label: "판매자", match: (p: string) => p.startsWith("/market/seller") },
  {
    href: "/market/sell-item",
    label: "판매 등록",
    match: (p: string) => p.startsWith("/market/sell-item"),
  },
  {
    href: "/market/emoticons",
    label: "이모티콘",
    match: (p: string) => p.startsWith("/market/emoticons"),
  },
  { href: "/webtoon", label: "일러스트", match: (p: string) => p.startsWith("/webtoon") },
  { href: "/used", label: "중고", match: (p: string) => p.startsWith("/used") },
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
