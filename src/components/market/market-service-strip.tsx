"use client";

import Link from "next/link";
import {
  Brush,
  ClipboardList,
  Package,
  Palette,
  Sparkles,
  Store,
  Tags,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICES = [
  { href: "/market", label: "전체 MARKET", icon: Store, tone: "text-folk-terracotta" },
  { href: "/market?type=PHYSICAL", label: "일반상품", icon: Package, tone: "text-folk-cobalt" },
  { href: "/market?type=CUSTOM_ORDER", label: "주문제작", icon: Palette, tone: "text-folk-forest" },
  { href: "/market?type=DIGITAL", label: "디지털", icon: Sparkles, tone: "text-violet-700" },
  { href: "/market?type=PREORDER", label: "예약판매", icon: Truck, tone: "text-amber-700" },
  { href: "/market/emoticons", label: "이모티콘", icon: Sparkles, tone: "text-pink-600" },
  { href: "/webtoon", label: "일러스트", icon: Brush, tone: "text-sky-700" },
  { href: "/used", label: "중고·경매", icon: Tags, tone: "text-amber-600" },
  { href: "/market/orders", label: "내 주문", icon: ClipboardList, tone: "text-folk-cobalt" },
  { href: "/market/seller", label: "판매자", icon: Store, tone: "text-folk-terracotta" },
] as const;

export function MarketServiceStrip({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {SERVICES.map(({ href, label, icon: Icon, tone }) => (
          <Link
            key={`${href}-${label}`}
            href={href}
            className="group flex flex-col items-center gap-1.5 shrink-0 w-[4.5rem] sm:w-[5.25rem] py-2 rounded-xl hover:bg-folk-cream/80 transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-folk-cobalt/20 bg-background shadow-[2px_2px_0_hsl(var(--folk-cobalt)/0.08)] group-hover:border-folk-terracotta/45 group-hover:-translate-y-0.5 transition-all">
              <Icon className={cn("h-5 w-5", tone)} strokeWidth={2} />
            </span>
            <span className="text-[11px] font-semibold text-foreground/85 text-center leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
