import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { FeedPost } from "@/api/feed";

export type StarHubCreator = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  count: number;
};

export type StarHubKind = "posts" | "qna" | "market" | "wiki";

export type StarMarketItem = {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  thumbnailUrl: string | null;
  region: string | null;
  status: string;
  saleType: string;
  viewCount: number;
  favoriteCount: number;
};

export type StarHubResponse = {
  items: FeedPost[];
  creators: StarHubCreator[];
  total: number;
};

export async function fetchStarHub(creatorId?: string | null, kind: "posts" | "qna" = "posts") {
  const params = new URLSearchParams();
  if (creatorId) params.set("creatorId", creatorId);
  params.set("kind", kind);
  const q = params.toString() ? `?${params}` : "";
  return apiRequest<StarHubResponse>(`${MobileApi.star}${q}`, { auth: true });
}

export async function fetchStarMarket() {
  return apiRequest<{ items: StarMarketItem[]; total: number }>(`${MobileApi.star}?kind=market`, {
    auth: true,
  });
}

export type StarWikiItem = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
  genre: string;
};

export async function fetchStarWiki() {
  return apiRequest<{ items: StarWikiItem[]; total: number }>(`${MobileApi.star}?kind=wiki`, {
    auth: true,
  });
}

export async function toggleAnimeStar(slug: string) {
  return apiRequest<{ starred: boolean }>(MobileApi.animeStar(slug), {
    method: "POST",
    auth: true,
  });
}

/** @deprecated Use fetchStarHub */
export async function fetchStarredPosts() {
  return fetchStarHub();
}

export async function clearAllStarBookmarks(kind?: StarHubKind | "all") {
  const q = kind ? `?kind=${kind}` : "";
  return apiRequest<{ ok: boolean; deleted: number }>(`${MobileApi.star}${q}`, {
    method: "DELETE",
    auth: true,
  });
}

export type AnimeListItem = {
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
  genre: string;
  viewCount: number;
};

export async function fetchAnimeList(opts?: { q?: string; genre?: string }) {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.genre) params.set("genre", opts.genre);
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ items: AnimeListItem[] }>(`${MobileApi.anime}${suffix}`, {
    auth: true,
  });
}

export type AnimeCreatePayload = {
  title: string;
  titleEn?: string;
  genre: string;
  synopsis?: string;
  studio?: string;
  worldInfo?: string;
  infobox?: string;
  coverUrl?: string;
  bannerUrl?: string;
  charactersText?: string;
  tags?: string;
  editSummary?: string;
};

export async function createAnimeWork(body: AnimeCreatePayload) {
  return apiRequest<{ anime: { slug: string; title: string } }>(MobileApi.anime, {
    method: "POST",
    body,
    auth: true,
  });
}

export async function updateAnimeWork(slug: string, body: AnimeCreatePayload) {
  return apiRequest<{ anime: { slug: string; title: string } }>(MobileApi.animeSlug(slug), {
    method: "PATCH",
    body,
    auth: true,
  });
}

export type AnimeDetailItem = AnimeListItem & {
  id?: string;
  bannerUrl: string | null;
  synopsis: string | null;
  studio: string | null;
  tags: string[];
  characters: unknown[];
  worldInfo: string | null;
  infobox: string | null;
  isProtected?: boolean;
  createdAt?: string;
  updatedAt?: string;
  creator?: { username: string };
  starred?: boolean;
};

export async function fetchAnimeDetail(slug: string) {
  return apiRequest<{ item: AnimeDetailItem }>(MobileApi.animeSlug(slug), { auth: true });
}

export type AnimeHistoryEntry = {
  id: string;
  username: string;
  createdAt: string;
  summary: string | null;
  restorable: boolean;
};

export async function fetchAnimeHistory(slug: string) {
  return apiRequest<{
    anime: { title: string; slug: string };
    entries: AnimeHistoryEntry[];
  }>(MobileApi.animeHistory(slug), { auth: true });
}

export async function restoreAnimeHistory(slug: string, revisionId: string) {
  return apiRequest<{ anime: { slug: string; title: string } }>(MobileApi.animeHistory(slug), {
    method: "POST",
    body: { revisionId },
    auth: true,
  });
}

export async function patchMe(body: {
  name?: string;
  bio?: string;
  locale?: string;
  countryCode?: string;
  usedServiceRegion?: string;
  timeZone?: string;
  feedRecommendationEnabled?: boolean;
  showLikeCounts?: boolean;
  postsLocked?: boolean;
  watermarkInsertEnabled?: boolean;
  watermarkPlacement?: "corner" | "diagonal" | null;
}) {
  return apiRequest<{ ok: boolean }>(MobileApi.me, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export async function fetchWallet() {
  return apiRequest<{
    availableBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    pendingPayout: number;
    bank: {
      bankName: string;
      accountMasked: string | null;
      holderName: string | null;
    } | null;
    recent: {
      id: string;
      type: string;
      amount: number;
      memo: string | null;
      createdAt: string;
    }[];
  }>(MobileApi.wallet, { auth: true });
}

export type WalletEarningsAnalytics = {
  year: number;
  years: number[];
  months: {
    month: number;
    label: string;
    earned: number;
    withdrawn: number;
    net: number;
    cumulative: number;
  }[];
  transactions?: {
    id: string;
    at: string;
    type: string;
    amount: number;
    net: number;
    cumulative: number;
    label: string;
    memo: string | null;
    referenceType: string | null;
    category?: string;
    payerUsername?: string | null;
  }[];
  yearEarned: number;
  yearWithdrawn: number;
  yearNet: number;
  bySource: { key: string; label: string; amount: number }[];
  summary: {
    availableBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    pendingPayout: number;
    withdrawable: number;
  };
};

export async function fetchWalletEarnings(year?: number) {
  const suffix = year ? `?year=${year}` : "";
  return apiRequest<WalletEarningsAnalytics>(`${MobileApi.walletEarnings}${suffix}`, {
    auth: true,
  });
}

export async function fetchGames() {
  return apiRequest<{
    items: {
      id: string;
      name: string;
      href: string | null;
      description: string | null;
      category: string;
      status: string;
    }[];
  }>(MobileApi.games, { auth: true });
}
