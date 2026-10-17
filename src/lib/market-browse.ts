/** Web market chips — keep in sync with apps/mobile/src/features/marketplace/market-browse.ts */

export type MarketTrack = "physical" | "digital";

export const PHYSICAL_MARKET_CATEGORIES = [
  { id: "FIGURE", key: "market.track.figures" },
  { id: "TCG", key: "market.track.tcg" },
  { id: "GOODS", key: "market.track.goods" },
  { id: "BOOK", key: "market.track.books" },
  { id: "GAMES", key: "market.track.games" },
  { id: "COSPLAY", key: "market.track.cosplay" },
] as const;

export const DIGITAL_MARKET_CATEGORIES = [
  { id: "VTUBER_3D", key: "market.track.vtuber" },
  { id: "STREAMER_ASSET", key: "market.track.streamer" },
  { id: "ILLUSTRATION", key: "market.track.illustration" },
  { id: "AUDIO_MUSIC", key: "market.track.audio" },
  { id: "CREATOR_RESOURCES", key: "market.track.resources" },
] as const;

export const PHYSICAL_SELL_KIND_IDS = PHYSICAL_MARKET_CATEGORIES.map((item) => item.id);

export const MARKET_LANE_CHIPS = [
  { id: "purchased", key: "market.purchases" },
  { id: "sales", key: "market.sales" },
  { id: "my", key: "market.my_tab" },
  { id: "favorites", key: "market.favorites" },
] as const;

export type MarketLaneChip = (typeof MARKET_LANE_CHIPS)[number]["id"];

export function parseMarketTrack(raw: string | undefined | null): MarketTrack {
  return raw === "digital" ? "digital" : "physical";
}

export function parseMarketLane(raw: string | undefined | null): MarketLaneChip | undefined {
  if (raw === "purchased" || raw === "sales" || raw === "my" || raw === "favorites") return raw;
  if (raw === "selling") return "my";
  return undefined;
}
