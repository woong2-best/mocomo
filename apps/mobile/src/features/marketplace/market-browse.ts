/** Physical Market vs Digital Studio browse sets for the mobile app. */

export type MarketTrack = "physical" | "digital";
/** Physical vs digital scope chips (no combined “all” track). */
export type MarketScope = MarketTrack;

export type HubCategory = {
  id: string;
  labelKey: string;
  category?: string;
  product?: string;
};

/** No category filter — all items in the current physical/digital track. */
export const HUB_BROWSE_ALL_ID = "ALL";

export const PHYSICAL_HUB: HubCategory[] = [
  { id: "FIGURE", labelKey: "m.market.track.figures_models", category: "FIGURE" },
  { id: "TCG", labelKey: "m.marketplace.tcg", category: "TCG" },
  { id: "GOODS", labelKey: "m.used.catalog.GOODS", category: "GOODS" },
  { id: "BOOK", labelKey: "m.marketplace.books", category: "BOOK" },
  { id: "GAMES", labelKey: "m.market.track.games", category: "GAMES" },
  { id: "COSPLAY", labelKey: "m.market.track.cosplay", category: "COSPLAY" },
];

export const DIGITAL_HUB: HubCategory[] = [
  { id: "VTUBER_3D", labelKey: "m.market.track.vtuber_3d", product: "VTUBER_3D" },
  { id: "STREAMER_ASSET", labelKey: "m.market.track.streamer_assets", product: "STREAMER_ASSET" },
  { id: "ILLUSTRATION", labelKey: "m.market.track.illustration", product: "ILLUSTRATION" },
  { id: "AUDIO_MUSIC", labelKey: "m.market.track.audio_music", product: "AUDIO_MUSIC" },
  { id: "CREATOR_RESOURCES", labelKey: "m.market.track.creator_resources", product: "CREATOR_RESOURCES" },
];

export const DIGITAL_PRODUCT_IDS = [
  "VTUBER_3D",
  "STREAMER_ASSET",
  "EMOTES_BADGES",
  "ILLUSTRATION",
  "AUDIO_MUSIC",
  "CREATOR_RESOURCES",
] as const;

export function hubForTrack(track: MarketTrack): HubCategory[] {
  return track === "digital" ? DIGITAL_HUB : PHYSICAL_HUB;
}

/** Side menu — physical used-goods categories only (digital uses scope chips). */
export const MENU_CATEGORIES: HubCategory[] = PHYSICAL_HUB;

export function findHubCategory(id: string): HubCategory | undefined {
  return PHYSICAL_HUB.find((item) => item.id === id) ?? DIGITAL_HUB.find((item) => item.id === id);
}

export function isDigitalListing(input: {
  category?: string | null;
  productType?: string | null;
}): boolean {
  return input.category === "DIGITAL" || (!!input.productType && (DIGITAL_PRODUCT_IDS as readonly string[]).includes(input.productType));
}
