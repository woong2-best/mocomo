import { MarketNav } from "@/components/market/market-nav";
import { ShoppingBag } from "lucide-react";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto p-4 pb-24 lg:pb-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-neon-pink" />
          굿즈샵
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          MoCoMo 이모티콘 · 마이 스토리지 · 굿즈 판매/배송/결제
        </p>
      </div>
      <MarketNav />
      {children}
    </div>
  );
}
