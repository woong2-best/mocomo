"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/market", label: "MARKET", match: (p: string) => p === "/market" },
  { href: "/market/orders", label: "주문", match: (p: string) => p.startsWith("/market/orders") },
  { href: "/market/seller", label: "판매자", match: (p: string) => p.startsWith("/market/seller") },
  { href: "/market/sell-item", label: "판매 등록", match: (p: string) => p.startsWith("/market/sell-item") },
  { href: "/market/emoticons", label: "이모티콘", match: (p: string) => p.startsWith("/market/emoticons") },
  { href: "/webtoon", label: "일러스트", match: (p: string) => p.startsWith("/webtoon") },
  { href: "/used", label: "중고", match: (p: string) => p.startsWith("/used") },
];

export function MarketNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
