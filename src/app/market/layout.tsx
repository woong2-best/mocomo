import { MarketNav } from "@/components/market/market-nav";
import { MarketPageChrome } from "@/components/market/market-page-chrome";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketPageChrome>
      <MarketNav />
      {children}
    </MarketPageChrome>
  );
}
