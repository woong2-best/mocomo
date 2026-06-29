"use server";

import { revalidatePath } from "next/cache";
import { getCachedCurrentUser } from "@/lib/auth";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { mirrorEconomyToGameState } from "@/actions/apt-economy";
import {
  getActiveFleaEvent,
  recordFleaEventVisit,
} from "@/lib/apt/economy/flea-service";
import {
  buyFromFleaNpc,
  listActiveFleaNpcOffers,
  sellToFleaNpc,
  type FleaNpcOfferPublicDto,
} from "@/lib/apt/economy/flea-npc-service";
import {
  buyMarketListing,
  cancelMarketListing,
  createMarketListingFromStorage,
  listMarketFeed,
  listMyMarketListings,
  suggestMarketPriceGold,
  type MarketListingDto,
} from "@/lib/apt/economy/market-service";
import { loadEconomySnapshot } from "@/lib/apt/economy/service";
import type { EconomySnapshot } from "@/lib/apt/economy/types";
import type { FleaEventDto } from "@/lib/apt/economy/flea-service";

export type AptMarketBrowse = {
  listings: MarketListingDto[];
  fleaEvent: FleaEventDto | null;
  myListings: MarketListingDto[];
  npcOffers?: FleaNpcOfferPublicDto[];
};

export async function getAptMarketBrowse(query?: string): Promise<AptMarketBrowse | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const fleaEvent = await getActiveFleaEvent();
  const [listings, myListings] = await Promise.all([
    listMarketFeed({
      fleaEventId: fleaEvent?.id ?? null,
      query,
    }),
    listMyMarketListings(user.id),
  ]);

  return { listings, fleaEvent, myListings };
}

export async function getAptFleaMarketBrowse(query?: string): Promise<AptMarketBrowse | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const fleaEvent = await getActiveFleaEvent();
  if (!fleaEvent) {
    return { listings: [], fleaEvent: null, myListings: [], npcOffers: [] };
  }

  void recordFleaEventVisit(fleaEvent.id);

  const [listings, myListings, npcOffers] = await Promise.all([
    listMarketFeed({ fleaEventId: fleaEvent.id, query }),
    listMyMarketListings(user.id),
    listActiveFleaNpcOffers(fleaEvent.id),
  ]);

  return { listings, fleaEvent, myListings, npcOffers };
}

export async function createAptMarketListing(input: {
  stickerTypeId: string;
  priceGold: number;
  flea?: boolean;
}): Promise<{ ok: true; economy: EconomySnapshot } | { error: string }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const ownerId = await resolveAptHomeOwnerId(user.id);
  let fleaEventId: string | null = null;
  if (input.flea) {
    const flea = await getActiveFleaEvent();
    if (!flea) return { error: "진행 중인 벼룩시장이 없습니다." };
    fleaEventId = flea.id;
  }

  const res = await createMarketListingFromStorage({
    sellerId: ownerId,
    stickerTypeId: input.stickerTypeId,
    priceGold: input.priceGold,
    fleaEventId,
  });
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);
  revalidatePath("/apt");
  return { ok: true, economy };
}

export async function buyAptMarketListing(
  listingId: string
): Promise<{ ok: true; economy: EconomySnapshot; stickerTypeId: string } | { error: string }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const res = await buyMarketListing(ownerId, listingId);
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);
  revalidatePath("/apt");
  return { ok: true, economy, stickerTypeId: res.stickerTypeId };
}

export async function buyAptFleaNpcOffer(
  offerId: string
): Promise<{ ok: true; economy: EconomySnapshot } | { error: string }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const res = await buyFromFleaNpc(ownerId, offerId);
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);
  revalidatePath("/apt");
  return { ok: true, economy };
}

export async function sellAptToFleaNpc(
  offerId: string
): Promise<{ ok: true; economy: EconomySnapshot } | { error: string }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const res = await sellToFleaNpc(ownerId, offerId);
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);
  revalidatePath("/apt");
  return { ok: true, economy };
}

export async function cancelAptMarketListing(
  listingId: string
): Promise<{ ok: true; economy: EconomySnapshot } | { error: string }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const res = await cancelMarketListing(ownerId, listingId);
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);
  revalidatePath("/apt");
  return { ok: true, economy };
}

export async function suggestAptMarketPrice(stickerTypeId: string): Promise<number> {
  return suggestMarketPriceGold(stickerTypeId);
}
