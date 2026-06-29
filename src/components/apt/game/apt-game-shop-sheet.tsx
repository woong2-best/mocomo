"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { X, Search, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";
import { getAptGoldShopCatalog } from "@/actions/apt-economy";
import type { GoldShopOfferDto } from "@/lib/apt/economy/gold-shop-service";
import {
  buyAptMarketListing,
  buyAptFleaNpcOffer,
  cancelAptMarketListing,
  createAptMarketListing,
  getAptFleaMarketBrowse,
  getAptMarketBrowse,
  sellAptToFleaNpc,
  suggestAptMarketPrice,
} from "@/actions/apt-market";
import type { FleaNpcOfferPublicDto } from "@/lib/apt/economy/flea-npc-service";
import type { MarketListingDto } from "@/lib/apt/economy/market-service";
import type { FleaEventDto } from "@/lib/apt/economy/flea-service";
import { hydrateLocalEconomy } from "@/lib/apt/local-home-store";
import type { StickerCategory } from "@/lib/diorama/sticker-types";

type ShopMode = "official" | "market" | "flea";

const CATS: { id: StickerCategory | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "furniture", label: "가구" },
  { id: "decor", label: "데코" },
  { id: "prop", label: "소품" },
  { id: "lighting", label: "조명" },
];

function OfferCard({
  offer,
  owned,
  onBuy,
}: {
  offer: GoldShopOfferDto;
  owned: boolean;
  onBuy: () => void;
}) {
  return (
    <button
      type="button"
      disabled={owned || offer.soldOut}
      onClick={onBuy}
      className={cn(
        "apt-game-shop-card relative flex flex-col items-center rounded-2xl p-2.5",
        (owned || offer.soldOut) && "opacity-75"
      )}
    >
      {offer.featured && (
        <span className="absolute left-1 top-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          추천
        </span>
      )}
      {offer.isNew && !offer.featured && (
        <span className="absolute left-1 top-1 rounded-md bg-violet-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          신상
        </span>
      )}
      {offer.discountPercent != null && offer.discountPercent > 0 && (
        <span className="absolute right-1 top-1 rounded-md bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">
          -{offer.discountPercent}%
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={offer.src} alt={offer.label} className="h-14 w-full object-contain" />
      <span className="mt-1 w-full truncate text-center text-[9px] font-bold text-[#5c4033]">
        {offer.label}
      </span>
      <span className="mt-0.5 text-[9px] font-black text-amber-700">
        {owned ? "보유" : offer.soldOut ? "품절" : `${offer.goldPrice.toLocaleString()}G`}
      </span>
      {offer.originalGoldPrice != null && offer.originalGoldPrice > offer.goldPrice && !owned && (
        <span className="text-[8px] text-[#a08968] line-through">
          {offer.originalGoldPrice.toLocaleString()}G
        </span>
      )}
    </button>
  );
}

function MarketListingCard({
  listing,
  mine,
  onBuy,
  onCancel,
}: {
  listing: MarketListingDto;
  mine: boolean;
  onBuy?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="apt-game-shop-card flex items-center gap-2 rounded-2xl p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={listing.src} alt={listing.label} className="h-12 w-12 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-[#5c4033]">{listing.label}</p>
        <p className="text-[9px] text-[#8b7355]">{listing.sellerName ?? "이웃"}</p>
        <p className="text-[10px] font-black text-amber-700">{listing.priceGold.toLocaleString()}G</p>
        {listing.avgPrice != null && listing.avgPrice > 0 && (
          <p className="text-[8px] text-[#8b7355]">
            최근 평균 {listing.avgPrice.toLocaleString()}G
            {listing.priceChangePercent != null && (
              <span
                className={
                  listing.priceChangePercent >= 0 ? "text-emerald-600" : "text-rose-600"
                }
              >
                {" "}
                {listing.priceChangePercent >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(listing.priceChangePercent)}%
              </span>
            )}
          </p>
        )}
      </div>
      {mine ? (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-lg bg-[#efe6da] px-2 py-1 text-[9px] font-bold"
        >
          취소
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          className="shrink-0 rounded-lg bg-[#5c4033] px-2 py-1 text-[9px] font-bold text-white"
        >
          구매
        </button>
      )}
    </div>
  );
}

function AptGameShopSheetInner() {
  const {
    game,
    economy,
    shopOpen,
    shopMode,
    setShopOpen,
    setShopMode,
    purchaseSticker,
    refreshEconomyFromServer,
    setGame,
    showToast,
  } = useAptGameRequired();

  const [mode, setMode] = useState<ShopMode>(shopMode);
  const [cat, setCat] = useState<StickerCategory | "all">("all");
  const [catalog, setCatalog] = useState<GoldShopOfferDto[]>([]);
  const [market, setMarket] = useState<MarketListingDto[]>([]);
  const [myListings, setMyListings] = useState<MarketListingDto[]>([]);
  const [fleaEvent, setFleaEvent] = useState<FleaEventDto | null>(null);
  const [npcOffers, setNpcOffers] = useState<FleaNpcOfferPublicDto[]>([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sellTypeId, setSellTypeId] = useState("");
  const [sellPrice, setSellPrice] = useState(100);

  const refreshMarket = useCallback(async () => {
    if (mode === "flea") {
      const data = await getAptFleaMarketBrowse(query);
      if (data) {
        setMarket(data.listings);
        setMyListings(data.myListings);
        setFleaEvent(data.fleaEvent);
        setNpcOffers(data.npcOffers ?? []);
      }
      return;
    }
    const data = await getAptMarketBrowse(query);
    if (data) {
      setMarket(data.listings);
      setMyListings(data.myListings);
      setFleaEvent(data.fleaEvent);
    }
  }, [mode, query]);

  useEffect(() => {
    if (shopOpen) setMode(shopMode);
  }, [shopOpen, shopMode]);

  useEffect(() => {
    if (!shopOpen) return;
    void getAptGoldShopCatalog().then(setCatalog);
    void refreshMarket();
  }, [shopOpen, refreshMarket]);

  const applyEconomy = useCallback(
    async (economySnapshot: { wallet: { gold: number; gems: number } }) => {
      await hydrateLocalEconomy(economySnapshot as Parameters<typeof hydrateLocalEconomy>[0]);
      await refreshEconomyFromServer();
      setGame((g) => ({
        ...g,
        gold: economySnapshot.wallet.gold,
        gems: economySnapshot.wallet.gems,
      }));
    },
    [refreshEconomyFromServer, setGame]
  );

  if (!shopOpen) return null;

  const featured = catalog.filter((o) => o.featured);
  const filtered = catalog.filter((o) => cat === "all" || o.category === cat);
  const storageSellable = economy.storage.filter((s) => s.quantity > 0);

  return (
    <div className="pointer-events-auto absolute inset-0 z-[100] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="apt-game-sheet max-h-[80dvh] rounded-t-[1.75rem]">
        <div className="flex items-center justify-between border-b border-[#e8dcc8] px-4 py-3">
          <div>
            <h2 className="text-base font-black text-[#5c4033]">
              {mode === "official" ? "공식 상점" : mode === "market" ? "장터" : "벼룩시장"}
            </h2>
            <p className="text-[10px] text-[#8b7355]">
              🪙 {game.gold.toLocaleString()} · 💎 {economy.wallet.gems.toLocaleString()}
            </p>
          </div>
          <button type="button" onClick={() => setShopOpen(false)} className="rounded-full p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[#e8dcc8]/80 px-3 py-2">
          {(
            [
              ["official", "공식"],
              ["market", "장터"],
              ["flea", "벼룩"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "flex-1 rounded-full py-1.5 text-[10px] font-bold",
                mode === id ? "bg-[#5c4033] text-white" : "bg-white text-[#8b7355]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && (
          <p className="mx-4 mt-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-[10px] font-bold text-amber-900">
            {msg}
          </p>
        )}

        {mode === "official" && (
          <>
            {featured.length > 0 && (
              <div className="px-4 pt-2">
                <p className="mb-1 text-[10px] font-black text-[#5c4033]">✦ 추천</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {featured.map((o) => (
                    <div key={o.itemId} className="w-28 shrink-0">
                      <OfferCard
                        offer={o}
                        owned={economy.inventory.some(
                          (i) => i.itemId === o.itemId && i.quantity > 0
                        )}
                        onBuy={async () => {
                          const res = await purchaseSticker(o.itemId);
                          if (res.error) setMsg(res.error);
                          else setMsg(`${o.label} 구매 완료!`);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto px-4 py-2">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold",
                    cat === c.id ? "bg-[#5c4033] text-white" : "bg-white text-[#8b7355]"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-4">
              {filtered.map((o) => (
                <OfferCard
                  key={o.itemId}
                  offer={o}
                  owned={economy.inventory.some((i) => i.itemId === o.itemId && i.quantity > 0)}
                  onBuy={async () => {
                    const res = await purchaseSticker(o.itemId);
                    if (res.error) setMsg(res.error);
                    else setMsg(`${o.label} 구매 완료!`);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {(mode === "market" || mode === "flea") && (
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            {mode === "flea" && fleaEvent && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/80 overflow-hidden">
                {fleaEvent.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fleaEvent.bannerUrl}
                    alt=""
                    className="w-full h-20 object-cover"
                  />
                )}
                <div className="px-3 py-2">
                  <p className="text-[11px] font-black text-violet-900">{fleaEvent.title}</p>
                  {fleaEvent.notice && (
                    <p className="text-[9px] font-semibold text-violet-800">{fleaEvent.notice}</p>
                  )}
                  <p className="text-[9px] text-violet-800/80">{fleaEvent.description}</p>
                  <p className="mt-1 text-[9px] font-semibold text-violet-700">
                    수수료 {Math.round(fleaEvent.feeRate * 100)}% · ~
                    {new Date(fleaEvent.endsAt).toLocaleDateString("ko-KR")}까지
                  </p>
                </div>
              </div>
            )}

            {mode === "flea" && npcOffers.length > 0 && (
              <div className="rounded-2xl border border-violet-200 bg-white p-3">
                <p className="mb-2 text-[10px] font-black text-violet-900">NPC 거래</p>
                <div className="space-y-2">
                  {npcOffers.map((npc) => (
                    <div
                      key={npc.id}
                      className="flex items-center gap-2 rounded-xl border border-violet-100 p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={npc.src} alt={npc.label} className="h-10 w-10 object-contain" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-[#5c4033]">
                          {npc.kind === "sell" ? "NPC 판매" : "NPC 매입"} · {npc.label}
                        </p>
                        <p className="text-[9px] text-amber-700 font-black">
                          {npc.goldPrice.toLocaleString()}G
                          {npc.discountPercent != null ? ` · ${npc.discountPercent}%↓` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={npc.kind === "sell" && npc.soldOut}
                        onClick={async () => {
                          const res =
                            npc.kind === "sell"
                              ? await buyAptFleaNpcOffer(npc.id)
                              : await sellAptToFleaNpc(npc.id);
                          if ("error" in res && res.error) {
                            setMsg(res.error);
                            return;
                          }
                          if ("economy" in res) await applyEconomy(res.economy);
                          setMsg(npc.kind === "sell" ? "NPC 구매 완료!" : "NPC 매입 완료!");
                          void refreshMarket();
                        }}
                        className="shrink-0 rounded-lg bg-violet-700 px-2 py-1 text-[9px] font-bold text-white disabled:opacity-50"
                      >
                        {npc.kind === "sell" ? (npc.soldOut ? "품절" : "구매") : "판매"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-[#e8dcc8] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[#a08968]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void refreshMarket()}
                placeholder="가구 검색"
                className="flex-1 bg-transparent text-[11px] outline-none"
              />
              <button
                type="button"
                onClick={() => void refreshMarket()}
                className="text-[10px] font-bold text-[#5c4033]"
              >
                검색
              </button>
            </div>

            {storageSellable.length > 0 && (
              <div className="rounded-2xl border border-[#e8dcc8] bg-[#faf6f0] p-3">
                <p className="mb-2 flex items-center gap-1 text-[10px] font-black text-[#5c4033]">
                  <Store className="h-3.5 w-3.5" /> 창고에서 판매 등록
                </p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={sellTypeId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSellTypeId(id);
                      if (id) setSellPrice(await suggestAptMarketPrice(id));
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-[#e8dcc8] bg-white px-2 py-1.5 text-[10px]"
                  >
                    <option value="">가구 선택</option>
                    {storageSellable.map((s) => (
                      <option key={s.itemId} value={s.itemId}>
                        {s.itemId} ×{s.quantity}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value) || 1)}
                    className="w-20 rounded-lg border border-[#e8dcc8] bg-white px-2 py-1.5 text-[10px]"
                  />
                  <button
                    type="button"
                    disabled={!sellTypeId}
                    onClick={async () => {
                      const res = await createAptMarketListing({
                        stickerTypeId: sellTypeId,
                        priceGold: sellPrice,
                        flea: mode === "flea",
                      });
                      if ("error" in res && res.error) {
                        setMsg(res.error);
                        return;
                      }
                      if ("economy" in res) await applyEconomy(res.economy);
                      setMsg("판매 등록 완료!");
                      void refreshMarket();
                    }}
                    className="rounded-lg bg-[#5c4033] px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                  >
                    등록
                  </button>
                </div>
              </div>
            )}

            {myListings.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-black text-[#5c4033]">내 판매</p>
                <div className="space-y-2">
                  {myListings.map((l) => (
                    <MarketListingCard
                      key={l.id}
                      listing={l}
                      mine
                      onCancel={async () => {
                        const res = await cancelAptMarketListing(l.id);
                        if ("error" in res && res.error) setMsg(res.error);
                        else {
                          if ("economy" in res) await applyEconomy(res.economy);
                          void refreshMarket();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1 text-[10px] font-black text-[#5c4033]">판매 목록</p>
              {market.length === 0 ? (
                <p className="py-6 text-center text-[10px] text-[#8b7355]">등록된 상품이 없어요</p>
              ) : (
                <div className="space-y-2">
                  {market.map((l) => (
                    <MarketListingCard
                      key={l.id}
                      listing={l}
                      mine={false}
                      onBuy={async () => {
                        const res = await buyAptMarketListing(l.id);
                        if ("error" in res && res.error) {
                          setMsg(res.error);
                          return;
                        }
                        if (!("economy" in res)) return;
                        await applyEconomy(res.economy);
                        showToast(`${res.stickerTypeId} 구매 완료!`, "gold");
                        void refreshMarket();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const AptGameShopSheet = memo(AptGameShopSheetInner);
