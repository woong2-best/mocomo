"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EyeOff, Loader2, Play } from "lucide-react";
import type { ProfileGridMediaItem } from "@/actions/profile-page";
import type { ProfileMediaKind, ProfileSort } from "@/lib/profile-queries";
import { Button } from "@/components/ui/button";
import { LockedMediaPaywallOverlay } from "@/components/media/locked-media-paywall-overlay";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";
import { subscribePostDeleted } from "@/lib/post-deleted-sync";

function formatDuration(sec: number | null): string | null {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MediaTile({
  item,
  username,
  paymentsEnabled,
}: {
  item: ProfileGridMediaItem;
  username: string;
  paymentsEnabled: boolean;
}) {
  const duration = item.type === "VIDEO" ? formatDuration(item.duration) : null;
  const isVideo = item.type === "VIDEO";
  const purchasePrice = item.instantPurchasePriceKrw || item.priceKrw || 0;
  const isPurchaseLocked = item.locked && item.lockReason === "purchase" && purchasePrice > 0;
  const isSubLocked = item.locked && item.lockReason === "subscription";

  const blurredThumb = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt=""
      className="h-full w-full scale-110 object-cover blur-xl"
      loading="lazy"
      draggable={false}
    />
  );

  if (item.hideNsfw) {
    return (
      <Link
        href={`/post/${item.postId}`}
        className="group relative block aspect-square min-w-0 w-full overflow-hidden bg-neutral-900"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-800/95 px-2 text-center">
          <EyeOff className="h-6 w-6 text-white/70" />
          <p className="text-[11px] font-medium leading-tight text-white/80">민감한 콘텐츠</p>
        </div>
      </Link>
    );
  }

  if (isPurchaseLocked) {
    return (
      <div className="group relative block aspect-square min-w-0 w-full overflow-hidden bg-neutral-900">
        {blurredThumb}
        <LockedMediaPaywallOverlay>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <PurchasePostMediaButton
              mediaId={item.id}
              priceKrw={purchasePrice}
              paymentsEnabled={paymentsEnabled}
              username={username}
              postId={item.postId}
              label="결제하기"
              variant="label"
            />
          </div>
        </LockedMediaPaywallOverlay>
      </div>
    );
  }

  if (isSubLocked || item.locked) {
    return (
      <Link
        href={`/post/${item.postId}`}
        className="group relative block aspect-square min-w-0 w-full overflow-hidden bg-neutral-900"
      >
        {blurredThumb}
        <LockedMediaPaywallOverlay label={isSubLocked ? "구독하기" : "결제하기"} />
      </Link>
    );
  }

  return (
    <Link
      href={`/post/${item.postId}`}
      className="group relative block aspect-square min-w-0 w-full overflow-hidden bg-neutral-900"
    >
      {isVideo ? (
        <>
          <video
            src={item.url}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            <Play className="h-3 w-3 fill-current" />
            {duration ?? "0:00"}
          </span>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          draggable={false}
        />
      )}
    </Link>
  );
}

export function ProfileMediaGrid({
  username,
  sort,
  mediaKind,
  initialItems,
  initialCursor,
  emptyMessage,
  paymentsEnabled = false,
}: {
  username: string;
  sort: ProfileSort;
  mediaKind: ProfileMediaKind;
  initialItems: ProfileGridMediaItem[];
  initialCursor: string | null;
  emptyMessage: string;
  paymentsEnabled?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const [loadError, setLoadError] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setDone(!initialCursor);
    setLoadError("");
  }, [initialItems, initialCursor, sort, mediaKind]);

  useEffect(() => {
    return subscribePostDeleted((postId) => {
      setItems((prev) => prev.filter((item) => item.postId !== postId));
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (sort === "popular") params.set("sort", "popular");
      if (mediaKind !== "all") params.set("kind", mediaKind);
      params.set("cursor", cursor);
      const res = await fetch(`/api/profile/${username}/media?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error ?? "불러오기에 실패했습니다.");
        return;
      }
      setItems((prev) => [...prev, ...(json.items as ProfileGridMediaItem[])]);
      setCursor(json.nextCursor);
      if (!json.nextCursor) setDone(true);
    } catch {
      setLoadError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, username, sort, mediaKind]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      {/* Twitter-style: full-bleed 3-col squares, 1px gutters, zero side padding */}
      <div className="grid w-full grid-cols-3 gap-px bg-border/50">
        {items.map((item) => (
          <MediaTile
            key={item.id}
            item={item}
            username={username}
            paymentsEnabled={paymentsEnabled}
          />
        ))}
      </div>
      <div ref={sentinel} className="flex flex-col items-center gap-2 py-6">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {loadError && (
          <>
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => loadMore()}>
              다시 시도
            </Button>
          </>
        )}
        {done && items.length > 0 && !loadError && (
          <p className="text-xs text-muted-foreground">더 이상 없습니다</p>
        )}
      </div>
    </>
  );
}
