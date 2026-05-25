"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/market", label: "홈", match: (p: string) => p === "/market" },
  { href: "/market/emoticons", label: "이모티콘", match: (p: string) => p.startsWith("/market/emoticons") },
  { href: "/market/goods", label: "굿즈", match: (p: string) => p.startsWith("/market/goods") },
  { href: "/market/storage", label: "마이 스토리지", match: (p: string) => p === "/market/storage" },
  { href: "/market/received", label: "받은 선물", match: (p: string) => p === "/market/received" },
  { href: "/market/sell", label: "굿즈 판매", match: (p: string) => p.startsWith("/market/sell") },
  { href: "/market/orders", label: "주문", match: (p: string) => p.startsWith("/market/orders") },
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
