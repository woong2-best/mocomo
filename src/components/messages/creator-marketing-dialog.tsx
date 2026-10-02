"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useEffect, useId, useRef, useState } from "react";
import { Images, Users, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getCreatorMarketingSettingsAction,
  saveCreatorWelcomeMessageAction,
  sendCreatorBulkDmAction,
} from "@/actions/creator-dm-marketing";
import { toAbsoluteUploadUrl, uploadImageBlob, uploadVideoBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import {
  formatUsd,
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_KRW,
} from "@/lib/money";

const PRESETS = [500, 1_000, 3_000, 5_000, 10_000];
const MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,.heic,.heif";

type MediaDraft = {
  url: string;
  type: "IMAGE" | "VIDEO";
  name?: string;
  priceKrw: number;
};

function PriceRow({
  price,
  customPrice,
  onPreset,
  onCustomChange,
}: {
  price: number;
  customPrice: string;
  onPreset: (p: number) => void;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={!customPrice && price === p ? "default" : "outline"}
            className="rounded-full h-8"
            onClick={() => {
              onPreset(p);
              onCustomChange("");
            }}
          >
            {formatUsd(p)}
          </Button>
        ))}
      </div>
      <Input
        value={customPrice}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder={t("messages.shl5meo")}
        inputMode="numeric"
      />
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatorMarketingDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const welcomeInputId = useId();
  const bulkInputId = useId();
  const welcomeInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const settingsQuery = useQuery({
    queryKey: ["creator-dm-marketing"],
    queryFn: () => getCreatorMarketingSettingsAction(),
    enabled: open,
  });

  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");
  const [welcomeMedia, setWelcomeMedia] = useState<MediaDraft | null>(null);
  const [welcomePrice, setWelcomePrice] = useState(1_000);
  const [welcomeCustomPrice, setWelcomeCustomPrice] = useState("");
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [welcomeError, setWelcomeError] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkMedia, setBulkMedia] = useState<MediaDraft | null>(null);
  const [bulkPrice, setBulkPrice] = useState(1_000);
  const [bulkCustomPrice, setBulkCustomPrice] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");

  useEffect(() => {
    if (!settingsQuery.data) return;
    const s = settingsQuery.data;
    setWelcomeEnabled(s.welcomeEnabled);
    setWelcomeText(s.welcomeText);
    if (s.welcomeMedia) {
      setWelcomeMedia({
        url: s.welcomeMedia.url,
        type: s.welcomeMedia.type === "VIDEO" ? "VIDEO" : "IMAGE",
        name: s.welcomeMedia.name ?? undefined,
        priceKrw: s.welcomeMedia.priceKrw,
      });
      setWelcomePrice(s.welcomeMedia.priceKrw);
    } else {
      setWelcomeMedia(null);
    }
  }, [settingsQuery.data]);

  const welcomeEffectivePrice = welcomeCustomPrice
    ? parseInt(welcomeCustomPrice.replace(/\D/g, ""), 10) || 0
    : welcomePrice;

  const bulkEffectivePrice = bulkCustomPrice
    ? parseInt(bulkCustomPrice.replace(/\D/g, ""), 10) || 0
    : bulkPrice;

  async function uploadMarketingFile(file: File, effectivePrice: number): Promise<MediaDraft> {
    if (effectivePrice < SALE_MEDIA_MIN_PRICE_KRW) {
      throw new Error(t("messages.scy98oc", { v0: formatUsd(SALE_MEDIA_MIN_PRICE_KRW) }));
    }
    if (effectivePrice > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      throw new Error(t("messages.s1jbu8tg", { v0: formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS) }));
    }

    const isVideo = file.type.startsWith("video/");
    let url: string;
    if (isVideo) {
      url = toAbsoluteUploadUrl(await uploadVideoBlob(file, file.name));
    } else {
      const uploadable = isGalleryImageFile(file, true) ? file : await fileToUploadableJpeg(file);
      url = toAbsoluteUploadUrl(await uploadImageBlob(uploadable, uploadable.name));
    }

    return {
      url,
      type: isVideo ? "VIDEO" : "IMAGE",
      name: file.name,
      priceKrw: effectivePrice,
    };
  }

  async function handleSaveWelcome() {
    setWelcomeError("");
    setWelcomeBusy(true);
    try {
      const media = welcomeMedia ? { ...welcomeMedia, priceKrw: welcomeEffectivePrice } : null;
      const result = await saveCreatorWelcomeMessageAction({
        enabled: welcomeEnabled,
        text: welcomeText,
        mediaUrl: media?.url ?? null,
        mediaType: media?.type ?? null,
        mediaName: media?.name ?? null,
        mediaPriceKrw: media?.priceKrw ?? null,
      });
      if (!result.ok) {
        setWelcomeError(errorText(result.error));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["creator-dm-marketing"] });
    } catch (e) {
      setWelcomeError(e instanceof Error ? e.message : t("messages.sdfw17h"));
    } finally {
      setWelcomeBusy(false);
    }
  }

  async function handleBulkSend() {
    setBulkError("");
    setBulkBusy(true);
    try {
      const media = bulkMedia ? { ...bulkMedia, priceKrw: bulkEffectivePrice } : null;
      const result = await sendCreatorBulkDmAction({
        text: bulkText,
        mediaUrl: media?.url ?? null,
        mediaType: media?.type ?? null,
        mediaName: media?.name ?? null,
        mediaPriceKrw: media?.priceKrw ?? null,
      });
      if (!result.ok) {
        setBulkError(errorText(result.error));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["creator-dm-marketing"] });
      setBulkText("");
      setBulkMedia(null);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : t("messages.sfc67jx"));
    } finally {
      setBulkBusy(false);
    }
  }

  const activeJob = settingsQuery.data?.activeBulkJob;
  const followerCount = settingsQuery.data?.followerCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-folk-terracotta drop-shadow-[0_0_8px_rgba(232,93,58,0.65)]" />
            {t("messages.s1dsu3g9")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("messages.s1clftxl")}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 pb-6 space-y-6 min-h-0">
          <section className="space-y-3">
            <div>
              <h3 className="font-bold text-sm">{t("messages.s1q8mc9o")}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("messages.1_1_dm")}
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-semibold">{t("messages.sqsd12z")}</span>
              <input
                type="checkbox"
                checked={welcomeEnabled}
                onChange={(e) => setWelcomeEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-border accent-folk-terracotta"
              />
            </label>

            <Textarea
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              placeholder={t("messages.welcome")}
              rows={3}
            />

            <p className="text-xs font-semibold text-muted-foreground">{t("messages.s1k53qao")}</p>
            <PriceRow
              price={welcomePrice}
              customPrice={welcomeCustomPrice}
              onPreset={setWelcomePrice}
              onCustomChange={setWelcomeCustomPrice}
            />

            {welcomeMedia ? (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="truncate flex-1">
                  {welcomeMedia.name ?? t("messages.suwdao")} · {formatUsd(welcomeEffectivePrice)}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWelcomeMedia(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <input
              ref={welcomeInputRef}
              id={welcomeInputId}
              type="file"
              accept={MEDIA_ACCEPT}
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setWelcomeMedia(await uploadMarketingFile(file, welcomeEffectivePrice));
                } catch (err) {
                  setWelcomeError(err instanceof Error ? err.message : t("webtoon-studio.s1vgkz0f"));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => welcomeInputRef.current?.click()}
            >
              <Images className="h-4 w-4 mr-2" />
              {t("messages.s308m73")}
            </Button>

            {welcomeError ? <p className="text-xs text-destructive">{welcomeError}</p> : null}

            <Button
              type="button"
              className="w-full rounded-full"
              disabled={welcomeBusy}
              onClick={() => void handleSaveWelcome()}
            >
              {welcomeBusy ? t("calendar.saving") : t("messages.s43a5uy")}
            </Button>
          </section>

          <hr className="border-border/60" />

          <section className="space-y-3">
            <div>
              <h3 className="font-bold text-sm">{t("messages.sdh66rx")}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                현재 팔로워 {followerCount.toLocaleString()}명 · 백그라운드 순차 발송
              </p>
            </div>

            {activeJob ? (
              <p className="text-xs font-bold text-folk-terracotta rounded-lg bg-muted px-3 py-2">
                발송 진행 중… {activeJob.sentCount}/{activeJob.totalFollowers}
                {activeJob.failedCount > 0 ? t("messages.sq1uh9x", { v0: activeJob.failedCount }) : ""}
              </p>
            ) : null}

            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={t("messages.s18ey8lj")}
              rows={3}
            />

            <p className="text-xs font-semibold text-muted-foreground">{t("messages.s1k53qao")}</p>
            <PriceRow
              price={bulkPrice}
              customPrice={bulkCustomPrice}
              onPreset={setBulkPrice}
              onCustomChange={setBulkCustomPrice}
            />

            {bulkMedia ? (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="truncate flex-1">
                  {bulkMedia.name ?? t("messages.suwdao")} · {formatUsd(bulkEffectivePrice)}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBulkMedia(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <input
              ref={bulkInputRef}
              id={bulkInputId}
              type="file"
              accept={MEDIA_ACCEPT}
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  setBulkMedia(await uploadMarketingFile(file, bulkEffectivePrice));
                } catch (err) {
                  setBulkError(err instanceof Error ? err.message : t("webtoon-studio.s1vgkz0f"));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => bulkInputRef.current?.click()}
            >
              <Images className="h-4 w-4 mr-2" />
              {t("messages.s308m73")}
            </Button>

            {bulkError ? <p className="text-xs text-destructive">{bulkError}</p> : null}

            <Button
              type="button"
              className="w-full rounded-full"
              disabled={bulkBusy || !!activeJob || followerCount === 0}
              onClick={() => void handleBulkSend()}
            >
              {bulkBusy ? t("messages.scyevue") : t("messages.s19ka965")}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreatorMarketingHeaderButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="rounded-full h-9 w-9 shrink-0"
      onClick={onClick}
      aria-label={t("messages.s1dsu3g9")}
    >
      <Users className="h-5 w-5 text-folk-terracotta drop-shadow-[0_0_8px_rgba(232,93,58,0.65)]" />
    </Button>
  );
}
