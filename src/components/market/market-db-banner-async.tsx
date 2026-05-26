import { getEmoticonPacks } from "@/actions/goods-shop";
import { MarketDbBanner } from "@/components/market/market-db-banner";

export async function MarketDbBannerAsync() {
  const { dbReady } = await getEmoticonPacks().catch(() => ({ dbReady: false, packs: [] }));
  return <MarketDbBanner dbReady={dbReady} />;
}
