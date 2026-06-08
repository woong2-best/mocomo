"use client";

import { useMemo, useState } from "react";
import {
  StudioPanel,
  StudioSection,
} from "@/components/avatar/studio-controls";
import {
  AVATAR_CATALOG,
  SHOP_CATEGORY_LABELS,
  SHOP_FILTER_TABS,
  type CatalogItem,
} from "@/lib/virtual-avatar/avatar-catalog";
import type { ShopCategory } from "@/lib/virtual-avatar/types";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { cn } from "@/lib/utils";
import { Heart, Sparkles } from "lucide-react";

type ShopFilter = "all" | "my" | "wish" | "hot" | "new";

function ItemPreview({ item }: { item: CatalogItem }) {
  return (
    <div
      className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-sm"
      style={{
        background: item.previewTo
          ? `linear-gradient(145deg, ${item.previewFrom}, ${item.previewTo})`
          : item.previewFrom,
      }}
    >
      {item.emoji && (
        <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-80">
          {item.emoji}
        </span>
      )}
      {item.tags?.includes("new") && (
        <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />
      )}
      {item.tags?.includes("hot") && (
        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-orange-500 text-white px-1 rounded">
          HOT
        </span>
      )}
    </div>
  );
}

export function AvatarShopPanel({ studio }: { studio: VirtualAvatarStudioState }) {
  const [category, setCategory] = useState<ShopCategory>("all");
  const [filter, setFilter] = useState<ShopFilter>("all");
  const { wishlist, equipCatalogItem, toggleWishlist, isItemEquipped, shopMsg, setShopMsg } = studio;

  const items = useMemo(() => {
    let list = AVATAR_CATALOG;
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (filter === "my") list = list.filter((i) => isItemEquipped(i));
    if (filter === "wish") list = list.filter((i) => wishlist.includes(i.id));
    if (filter === "hot") list = list.filter((i) => i.tags?.includes("hot"));
    if (filter === "new") list = list.filter((i) => i.tags?.includes("new"));
    return list;
  }, [category, filter, wishlist, isItemEquipped]);

  return (
    <StudioPanel title="아바타 옷장" className="lg:col-span-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SHOP_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id === filter ? "all" : tab.id)}
            className={cn(
              "shrink-0 h-9 w-9 rounded-full border-2 text-[10px] font-bold flex items-center justify-center transition-all",
              filter === tab.id
                ? "border-pink-500 bg-pink-500 text-white"
                : tab.id === "hot"
                  ? "border-neutral-800 bg-neutral-900 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-pink-300"
            )}
            title={tab.label}
          >
            {tab.id === "wish" ? "♥" : tab.id === "new" ? "N" : tab.emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {SHOP_CATEGORY_LABELS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
              category === cat.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <StudioSection title={`${items.length}개 · 탭하면 바로 착용`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[min(52vh,520px)] overflow-y-auto pr-0.5">
          {items.map((item) => {
            const equipped = isItemEquipped(item);
            const wished = wishlist.includes(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "group rounded-2xl border-2 p-2 transition-all bg-card/80",
                  equipped
                    ? "border-pink-500 ring-2 ring-pink-200/50"
                    : "border-border/60 hover:border-pink-300/60"
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    equipCatalogItem(item);
                    setTimeout(() => setShopMsg(""), 2000);
                  }}
                >
                  <ItemPreview item={item} />
                  <p className="mt-2 text-[11px] font-semibold line-clamp-2 leading-tight min-h-[2rem]">
                    {item.name}
                  </p>
                  {equipped && (
                    <span className="mt-1 inline-block text-[9px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-950/50 px-1.5 py-0.5 rounded-full">
                      착용중
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={cn(
                    "mt-1.5 w-full flex items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-semibold border transition-colors",
                    wished
                      ? "border-pink-400 text-pink-600 bg-pink-50/80"
                      : "border-border text-muted-foreground hover:border-pink-300"
                  )}
                  onClick={() => toggleWishlist(item.id)}
                >
                  <Heart className={cn("h-3 w-3", wished && "fill-pink-500 text-pink-500")} />
                  위시
                </button>
              </div>
            );
          })}
        </div>
      </StudioSection>

      {shopMsg && (
        <p className="text-center text-[11px] font-semibold text-pink-600 flex items-center justify-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {shopMsg}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        모든 아이템 무료 · 탭하면 즉시 착용 · ♥ 위시 · HOT · NEW 필터
      </p>
    </StudioPanel>
  );
}
