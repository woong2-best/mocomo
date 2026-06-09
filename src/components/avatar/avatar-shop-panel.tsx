"use client";

import { useMemo, useState } from "react";
import {
  StudioPanel,
  StudioSection,
} from "@/components/avatar/studio-controls";
import {
  AVATAR_CATALOG,
  getCatalogItem,
  SHOP_CATEGORY_LABELS,
  SHOP_FILTER_TABS,
  type CatalogItem,
} from "@/lib/virtual-avatar/avatar-catalog";
import type { ShopCategory } from "@/lib/virtual-avatar/types";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { cn } from "@/lib/utils";
import { Heart, ShoppingBag, Sparkles, X } from "lucide-react";

type ShopFilter = "all" | "my" | "wish" | "hot" | "new";

function ItemPreview({ item, large }: { item: CatalogItem; large?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/15 shadow-md transition-transform",
        large ? "aspect-[4/5] rounded-3xl" : "aspect-square rounded-2xl"
      )}
      style={{
        background: item.previewTo
          ? `linear-gradient(155deg, ${item.previewFrom} 0%, ${item.previewTo} 100%)`
          : item.previewFrom,
      }}
    >
      {item.emoji && (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center opacity-90 drop-shadow-sm",
            large ? "text-5xl" : "text-3xl"
          )}
        >
          {item.emoji}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
      {item.tags?.includes("new") && (
        <span className="absolute top-2 left-2 text-[8px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded-full shadow">
          NEW
        </span>
      )}
      {item.tags?.includes("hot") && (
        <span className="absolute top-2 right-2 text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full shadow">
          HOT
        </span>
      )}
    </div>
  );
}

export function AvatarShopPanel({ studio }: { studio: VirtualAvatarStudioState }) {
  const [category, setCategory] = useState<ShopCategory>("all");
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { wishlist, equipCatalogItem, toggleWishlist, isItemEquipped, shopMsg, setShopMsg, config } = studio;

  const equippedItems = useMemo(() => {
    const ids = [
      config.equipped.hairId,
      config.equipped.topId,
      config.equipped.bottomId,
      config.equipped.shoesId,
      config.equipped.headwearId,
      config.equipped.accessoryId,
      config.equipped.fullOutfitId,
      config.equipped.makeupId,
    ].filter(Boolean) as string[];
    return [...new Set(ids)].map((id) => getCatalogItem(id)).filter(Boolean) as CatalogItem[];
  }, [config.equipped]);

  const items = useMemo(() => {
    let list = AVATAR_CATALOG;
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (filter === "my") list = list.filter((i) => isItemEquipped(i));
    if (filter === "wish") list = list.filter((i) => wishlist.includes(i.id));
    if (filter === "hot") list = list.filter((i) => i.tags?.includes("hot"));
    if (filter === "new") list = list.filter((i) => i.tags?.includes("new"));
    return list;
  }, [category, filter, wishlist, isItemEquipped]);

  const previewItem = previewId ? getCatalogItem(previewId) : items[0] ?? null;

  const handleEquip = (item: CatalogItem) => {
    equipCatalogItem(item);
    setPreviewId(item.id);
    setTimeout(() => setShopMsg(""), 2000);
  };

  return (
    <StudioPanel
      title="옷장"
      className="lg:col-span-3 border-pink-200/40 dark:border-pink-900/30 bg-gradient-to-b from-pink-50/40 to-card dark:from-pink-950/20"
    >
      <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-white px-3 py-2 shadow-sm">
        <ShoppingBag className="h-4 w-4 shrink-0" />
        <p className="text-[11px] font-semibold leading-snug flex-1">
          탭하면 즉시 착용 · 전 아이템 무료 · 스튜디오 저장 시 라이브 VTuber에 자동 반영
        </p>
      </div>

      {equippedItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-0.5">
          {equippedItems.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name}
              onClick={() => setPreviewId(item.id)}
              className="shrink-0 w-11 h-11 rounded-xl border-2 border-pink-400 ring-2 ring-pink-200/60 overflow-hidden"
              style={{
                background: item.previewTo
                  ? `linear-gradient(145deg, ${item.previewFrom}, ${item.previewTo})`
                  : item.previewFrom,
              }}
            >
              <span className="text-lg">{item.emoji ?? "✨"}</span>
            </button>
          ))}
        </div>
      )}

      {previewItem && (
        <div className="relative rounded-3xl border-2 border-pink-300/50 bg-card/60 p-2.5 shadow-inner">
          <button
            type="button"
            className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-black/20 text-white flex items-center justify-center"
            onClick={() => setPreviewId(null)}
            aria-label="미리보기 닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3 items-center">
            <ItemPreview item={previewItem} large />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-bold leading-tight line-clamp-2">{previewItem.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {SHOP_CATEGORY_LABELS.find((c) => c.id === previewItem.category)?.label ?? "아이템"}
              </p>
              <button
                type="button"
                onClick={() => handleEquip(previewItem)}
                className={cn(
                  "w-full rounded-xl py-2 text-xs font-bold transition-all",
                  isItemEquipped(previewItem)
                    ? "bg-pink-500 text-white shadow-md"
                    : "bg-foreground text-background hover:opacity-90"
                )}
              >
                {isItemEquipped(previewItem) ? "착용 중 ✓" : "착용하기"}
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(previewItem.id)}
                className={cn(
                  "w-full flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold border",
                  wishlist.includes(previewItem.id)
                    ? "border-pink-400 text-pink-600 bg-pink-50/80"
                    : "border-border text-muted-foreground"
                )}
              >
                <Heart className={cn("h-3 w-3", wishlist.includes(previewItem.id) && "fill-pink-500 text-pink-500")} />
                위시리스트
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SHOP_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id === filter ? "all" : tab.id)}
            className={cn(
              "shrink-0 h-9 min-w-9 px-2 rounded-full border-2 text-[10px] font-bold flex items-center justify-center transition-all",
              filter === tab.id
                ? "border-pink-500 bg-pink-500 text-white shadow-md"
                : tab.id === "hot"
                  ? "border-orange-400/60 bg-orange-50 dark:bg-orange-950/30 text-orange-600"
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
              "shrink-0 px-2.5 py-2 rounded-2xl text-[10px] font-bold border transition-all flex items-center gap-1",
              category === cat.id
                ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white border-transparent shadow-md scale-[1.02]"
                : "bg-card border-border text-muted-foreground hover:border-pink-300 hover:text-foreground"
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <StudioSection title={`${items.length}개 · 탭 = 착용`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[min(48vh,480px)] overflow-y-auto pr-0.5">
          {items.map((item) => {
            const equipped = isItemEquipped(item);
            const wished = wishlist.includes(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "group rounded-2xl border-2 p-2 transition-all bg-card/90 hover:shadow-md",
                  equipped
                    ? "border-pink-500 ring-2 ring-pink-200/50 scale-[1.01]"
                    : "border-border/60 hover:border-pink-300/70"
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => handleEquip(item)}
                  onMouseEnter={() => setPreviewId(item.id)}
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
        <p className="text-center text-[11px] font-semibold text-pink-600 flex items-center justify-center gap-1 animate-pulse">
          <Sparkles className="h-3.5 w-3.5" />
          {shopMsg}
        </p>
      )}
    </StudioPanel>
  );
}
