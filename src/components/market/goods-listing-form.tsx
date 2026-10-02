"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { createGoodsListingRequest } from "@/actions/goods-shop";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
import { formatUsd } from "@/lib/money";
import { uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2 } from "lucide-react";

export function GoodsListingForm({ paymentsEnabled }: { paymentsEnabled: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => isGalleryImageFile(f, true));
    if (list.length === 0) {
      setError(t("market.s13qm3zj"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of list.slice(0, 6)) {
        const prepared = await fileToUploadableJpeg(file);
        const url = await uploadImageBlob(prepared, prepared.name);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("market.s1vgkz0f"));
    } finally {
      setUploading(false);
    }
  }

  async function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await createGoodsListingRequest({
      title,
      description,
      images,
      videoUrl: videoUrl || undefined,
    });
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    if ("requestId" in res && res.requestId) setRequestId(res.requestId);
  }

  if (requestId) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 space-y-4">
        <p className="font-semibold">{t("market.s1o5i0cl")}</p>
        <p className="text-sm text-muted-foreground">
          {t("market.s1v7j3a9")} <strong>{formatUsd(LISTING_FEE_KRW)}</strong>{t("market.syv5x3e")}
        </p>
        {paymentsEnabled ? (
          <PayButton
            type="LISTING_FEE"
            amount={LISTING_FEE_KRW}
            orderName={t("market.spm93yc")}
            metadata={{ requestId }}
            className="w-full rounded-2xl"
          >
            {t("market.listingFeePay", { fee: formatUsd(LISTING_FEE_KRW) })}
          </PayButton>
        ) : (
          <p className="text-sm text-destructive">{t("market.s13ujlm2")}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submitDraft} className="space-y-4 rounded-2xl border border-border/60 p-5 bg-card">
      <Input
        placeholder={t("market.st9k72")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl"
        required
      />
      <textarea
        placeholder={t("market.s1pibgil")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3 text-sm"
        required
      />
      <Input
        placeholder={t("market.url")}
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="rounded-xl"
        type="url"
      />

      <div>
            <label className="text-sm font-medium">{t("market.s1mbr4rw")}</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ))}
          <label className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onImages} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full rounded-2xl" disabled={uploading}>
        {t("market.shdflk2")}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        {t("market.goodsListingAdFee", { fee: formatUsd(LISTING_FEE_KRW) })}
      </p>
    </form>
  );
}
