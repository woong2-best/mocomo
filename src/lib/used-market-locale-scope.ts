import type { Prisma } from "@prisma/client";
import { resolveLegalCountryCode } from "@/lib/legal-country";
import { db } from "@/lib/db";
import {
  assertUsedListingTradeAllowed,
  assertUsedListingVisible,
  buildUsedListingLocalityWhere,
  CROSS_BORDER_BLOCKED_MSG,
  OUT_OF_SERVICE_AREA_MSG,
  resolveUsedMarketLocality,
  type UsedListingLocalitySlice,
  type UsedMarketLocality,
} from "@/lib/used-market-locality";
import { normalizeUsedMarketCountry } from "@/lib/used-regions-global";

export const USED_CROSS_BORDER_BLOCKED_MSG = CROSS_BORDER_BLOCKED_MSG;
export const USED_LOCAL_REGION_MISMATCH_MSG = OUT_OF_SERVICE_AREA_MSG;

export function normalizeUsedViewerCountry(code?: string | null): string {
  return normalizeUsedMarketCountry(code);
}

export function usedListingCountryWhere(countryCode: string): Prisma.UsedListingWhereInput {
  const cc = normalizeUsedViewerCountry(countryCode);
  return {
    OR: [{ meetCountry: cc }, { meetCountry: null, seller: { countryCode: cc } }],
  };
}

/** Viewer country always wins — cross-border browse params are ignored. */
export function resolveScopedUsedCountry(
  viewerCountry: string,
  _requestedCountry?: string | null
): string {
  return normalizeUsedViewerCountry(viewerCountry);
}

export async function resolveUsedViewerCountry(opts?: {
  userId?: string | null;
  sessionCountry?: string | null;
}): Promise<string> {
  const locality = await resolveUsedMarketLocality(
    opts?.userId,
    opts?.sessionCountry ?? null
  );
  return locality.countryCode;
}

export async function resolveUsedBuyerServiceRegion(userId: string): Promise<string | null> {
  const locality = await resolveUsedMarketLocality(userId);
  return locality.serviceRegion;
}

export async function resolveUsedMarketScope(opts?: {
  userId?: string | null;
  sessionCountry?: string | null;
}): Promise<UsedMarketLocality> {
  if (opts?.userId) {
    return resolveUsedMarketLocality(opts.userId);
  }
  if (opts?.sessionCountry) {
    return resolveUsedMarketLocality(null, opts.sessionCountry);
  }
  const guestCountry = await resolveLegalCountryCode();
  return resolveUsedMarketLocality(null, guestCountry);
}

export function buildScopedUsedListingWhere(
  locality: UsedMarketLocality,
  params?: { region?: string; sido?: string }
): Prisma.UsedListingWhereInput {
  return buildUsedListingLocalityWhere(locality, params);
}

export async function assertUsedMarketTradeAccess(opts: {
  userId: string;
  buyerCountry: string;
  listing: UsedListingLocalitySlice;
}): Promise<string | null> {
  const viewerLocality = await resolveUsedMarketLocality(opts.userId);
  return assertUsedListingTradeAllowed(viewerLocality, opts.listing, opts.userId);
}

export async function assertUsedMarketListingVisible(opts: {
  userId?: string | null;
  sessionCountry?: string | null;
  listing: UsedListingLocalitySlice;
}): Promise<string | null> {
  const viewerLocality = await resolveUsedMarketScope({
    userId: opts.userId,
    sessionCountry: opts.sessionCountry,
  });
  return assertUsedListingVisible(viewerLocality, opts.listing, opts.userId);
}

/** @deprecated use assertUsedMarketListingVisible */
export function assertUsedMarketLocalMatch(_opts: {
  buyerCountry: string;
  listingMeetCountry: string | null | undefined;
  buyerServiceRegion?: string | null;
  listingRegion: string;
  isOwnListing?: boolean;
}): string | null {
  void _opts;
  return null;
}
