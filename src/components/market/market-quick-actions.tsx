"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMarketplaceCartCount } from "@/lib/marketplace/cart-storage";

export function MarketQuickActions({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getMarketplaceCartCount());
    sync();
    window.addEventListener("marketplace-cart-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("marketplace-cart-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className={cn("flex shrink-0 items-stretch gap-1.5", className)}>
      <Link
        href="/market/orders"
        className="flex w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-folk-cobalt/15 bg-background px-1 py-1.5 text-foreground transition-colors hover:border-folk-terracotta/40 hover:bg-folk-cream/60"
      >
        <User className="h-5 w-5 text-folk-cobalt" strokeWidth={2} />
        <span className="text-[10px] font-bold leading-none">마이</span>
      </Link>
      <Link
        href="/market/cart"
        className="relative flex w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-folk-cobalt/15 bg-background px-1 py-1.5 text-foreground transition-colors hover:border-folk-terracotta/40 hover:bg-folk-cream/60"
      >
        <ShoppingCart className="h-5 w-5 text-folk-cobalt" strokeWidth={2} />
        {count > 0 ? (
          <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-folk-cobalt px-1 text-[9px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
        <span className="text-[10px] font-bold leading-none">장바구니</span>
      </Link>
    </div>
  );
}
