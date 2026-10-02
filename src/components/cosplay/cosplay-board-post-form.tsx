"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCosplayBoardPost } from "@/actions/cosplay-board";
import { UsedImageComposer } from "@/components/media/post-media-composer";
import { UsedRegionSelect } from "@/components/used/used-region-select";
import { formatUsedRegion, getSigunguList, KOREA_SIDO, parseUsedRegion } from "@/lib/korea-regions";
import type { CosplayBoardMode } from "@/lib/cosplay-board-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MODES: { id: CosplayBoardMode; label: string }[] = [
  { id: "rental", label: t("cosplay.s1erulvc") },
  { id: "purchase", label: t("cosplay.suins") },
];

export function CosplayBoardPostForm({ defaultMode }: { defaultMode: CosplayBoardMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<CosplayBoardMode>(defaultMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [price, setPrice] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const initialRegion = formatUsedRegion(KOREA_SIDO[0].short, getSigunguList(KOREA_SIDO[0].id)[0] ?? t("cosplay.su9n85"));
  const [region, setRegion] = useState(initialRegion);
  const [images, setImages] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mediaUploading) {
      setError(t("cosplay.s1npk3ea"));
      setLoading(false);
      return;
    }

    const parsedRegion = parseUsedRegion(region) ? region : undefined;
    const numericPrice = price.trim() ? Math.floor(Number(price)) : undefined;

    const res = await createCosplayBoardPost({
      mode,
      title,
      content,
      price: numericPrice,
      priceLabel: priceLabel.trim() || undefined,
      region: parsedRegion,
      workTitle: workTitle.trim() || undefined,
      character: character.trim() || undefined,
      sizeLabel: sizeLabel.trim() || undefined,
      images,
    });

    setLoading(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    if ("postId" in res && res.postId) {
      router.push(`/cosplay/board/${res.postId}`);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border-2 border-[#3b4890]/30 bg-[#eef1fb] dark:bg-muted/40 p-1">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn(
                "min-w-[7.5rem] px-4 py-2 rounded-full text-sm font-bold transition-all",
                mode === item.id
                  ? "bg-[#3b4890] text-white shadow-md"
                  : "text-[#3b4890] dark:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("cosplay.sz28d")}</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "rental" ? t("cosplay.s19c0ll7") : t("cosplay.s1qjobpr")}
          maxLength={200}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("cosplay.su9he6")}</label>
          <Input
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            placeholder={t("cosplay.sgvq80y")}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("lib.avatar-2d.sv5xgz")}</label>
          <Input
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            placeholder={t("cosplay.s1a5rix6")}
            maxLength={80}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {mode === "rental" ? t("cosplay.s1a9qgi4") : t("cosplay.s1gxnrpp")}
          </label>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("cosplay.s1v0ok1r")}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("cosplay.srreff1")}</label>
          <Input
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            placeholder={t("cosplay.1_25_000")}
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("cosplay.st6zi8")}</label>
          <Input
            value={sizeLabel}
            onChange={(e) => setSizeLabel(e.target.value)}
            placeholder={t("cosplay.m_free")}
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("cosplay.s1m4s1et")}</label>
        <UsedRegionSelect value={region} onChange={setRegion} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("cosplay.s1vqyzz2")}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          required
          minLength={10}
          placeholder={
            mode === "rental"
              ? t("cosplay.s1kzsbhc")
              : t("cosplay.s1xtrpib")
          }
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y min-h-[10rem]"
        />
      </div>

      <UsedImageComposer
        images={images}
        onChange={setImages}
        max={8}
        onUploadingChange={setMediaUploading}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || mediaUploading} className="rounded-xl">
          {loading ? t("events.skg4uo9") : t("cosplay.snlmhd0")}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" asChild>
          <Link href={mode === "purchase" ? "/cosplay?mode=purchase" : "/cosplay"}>{t("toast.cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
