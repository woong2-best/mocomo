"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Film, ImageIcon, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { ContentVisibilitySelect } from "@/components/monetization/content-visibility-select";
import { SettlementAccountBanner } from "@/components/monetization/settlement-account-banner";
import { getBankVerificationStatus } from "@/actions/bank-verification";
import { createProfileMediaPost } from "@/actions/profile-create-media";
import { SETTLEMENT_ACCOUNT_REQUIRED_CODE, walletSettlementPath } from "@/lib/settlement-account";
import {
  formatUsd,
  parseUsdDollarsToCents,
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_USD_CENTS,
  sanitizeUsdDollarInput,
} from "@/lib/money";
import { useSuspendedAccount } from "@/hooks/use-suspended-account";
import { cn } from "@/lib/utils";
import type { ContentVisibility } from "@prisma/client";

type MediaKind = "photo" | "video";

export function ProfileCreatePanel({
  open,
  onOpenChange,
  hasPayoutAccount = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPayoutAccount?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { suspended, blockAction } = useSuspendedAccount();
  const [kind, setKind] = useState<MediaKind>("photo");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<ContentVisibility>("PUBLIC");
  const [priceUsd, setPriceUsd] = useState("");
  const [instantPriceUsd, setInstantPriceUsd] = useState("");
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [payoutAccountRegistered, setPayoutAccountRegistered] = useState(hasPayoutAccount);

  const showInstantPurchase = visibility !== "PUBLIC";
  const priceCents = parseUsdDollarsToCents(priceUsd);
  const instantPriceCents = parseUsdDollarsToCents(instantPriceUsd);
  const sellingIntent =
    priceCents > 0 ||
    instantPriceCents > 0 ||
    priceUsd.trim().length > 0 ||
    instantPriceUsd.trim().length > 0 ||
    visibility !== "PUBLIC";
  const showSettlementBanner = !payoutAccountRegistered && sellingIntent;
  const walletCallbackUrl = useMemo(
    () => (pathname?.startsWith("/") ? pathname : undefined),
    [pathname]
  );

  useEffect(() => {
    setPayoutAccountRegistered(hasPayoutAccount);
  }, [hasPayoutAccount]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      const status = await getBankVerificationStatus();
      if (cancelled || !status.signedIn) return;
      setPayoutAccountRegistered(status.payoutAccountRegistered);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  function reset() {
    setContent("");
    setVisibility("PUBLIC");
    setPriceUsd("");
    setInstantPriceUsd("");
    setMedia([]);
    setError("");
    setKind("photo");
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  function onKindChange(next: MediaKind) {
    setKind(next);
    setMedia([]);
    setError("");
  }

  function submit() {
    if (blockAction("post")) return;
    if (showSettlementBanner) {
      router.push(walletSettlementPath(walletCallbackUrl));
      return;
    }
    setError("");
    const item = media[0];
    if (!item) {
      setError(kind === "video" ? "영상을 추가해 주세요." : "사진을 추가해 주세요.");
      return;
    }

    if (priceCents > 0 && priceCents < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
      setError(`유료 판매 가격은 최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_USD_CENTS)}부터 설정할 수 있습니다.`);
      return;
    }
    if (instantPriceCents > 0 && instantPriceCents < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
      setError(`즉시 구매 가격은 최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_USD_CENTS)}부터 설정할 수 있습니다.`);
      return;
    }
    if (priceCents > SALE_MEDIA_MAX_PRICE_USD_CENTS || instantPriceCents > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      setError(`가격은 ${formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)} 이하로 설정해 주세요.`);
      return;
    }

    startTransition(async () => {
      const res = await createProfileMediaPost({
        content,
        mediaUrl: item.url,
        mediaType: kind === "video" ? "VIDEO" : "IMAGE",
        visibility,
        priceKrw: priceCents,
        instantPurchasePriceKrw: instantPriceCents,
      });
      if (res.error) {
        if ("code" in res && res.code === SETTLEMENT_ACCOUNT_REQUIRED_CODE && "redirectTo" in res) {
          router.push(String(res.redirectTo));
          return;
        }
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  if (!open) return null;

  return (
    <div className="border-b border-border/60 bg-muted/10 px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">새 게시물</p>
        <button
          type="button"
          onClick={close}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showSettlementBanner ? (
        <SettlementAccountBanner callbackUrl={walletCallbackUrl} />
      ) : null}

      <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-0.5">
        <button
          type="button"
          onClick={() => onKindChange("video")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "video"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Film className={cn("h-3.5 w-3.5", kind === "video" ? "text-violet-600" : "")} />
          비디오
        </button>
        <button
          type="button"
          onClick={() => onKindChange("photo")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            kind === "photo"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ImageIcon className={cn("h-3.5 w-3.5", kind === "photo" ? "text-violet-600" : "")} />
          사진
        </button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="무슨 생각을 하고 계신가요?"
        rows={3}
        className="resize-none rounded-xl bg-background"
        disabled={pending}
      />

      <PostMediaComposer
        items={media}
        onChange={setMedia}
        maxImages={kind === "photo" ? 1 : 0}
        maxVideos={kind === "video" ? 10 : 0}
        allowVideo={kind === "video"}
        disabled={pending}
        onUploadingChange={setUploading}
      />

      <ContentVisibilitySelect
        value={visibility}
        onChange={setVisibility}
        disabled={pending}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="profile-media-price" className="text-xs font-medium text-muted-foreground">
            유료 판매 (선택, $1.00~)
          </label>
          <Input
            id="profile-media-price"
            inputMode="decimal"
            placeholder="예: 1.00 (무료는 0)"
            value={priceUsd}
            onChange={(e) => setPriceUsd(sanitizeUsdDollarInput(e.target.value))}
            disabled={pending}
            className="rounded-xl"
          />
        </div>
        {showInstantPurchase && (
          <div className="space-y-1.5">
            <label
              htmlFor="profile-instant-price"
              className="text-xs font-medium text-muted-foreground"
            >
              즉시 구매 (등급 미달 시)
            </label>
            <Input
              id="profile-instant-price"
              inputMode="decimal"
              placeholder="예: 80.00"
              value={instantPriceUsd}
              onChange={(e) => setInstantPriceUsd(sanitizeUsdDollarInput(e.target.value))}
              disabled={pending}
              className="rounded-xl"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="rounded-xl gap-1.5"
          disabled={pending || uploading}
          onClick={submit}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          게시하기
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
