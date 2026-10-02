"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { createSubcultureWtbAlert } from "@/actions/subculture-wtb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usedProductTypeLabel } from "@/lib/used-catalog";

export function UsedWtbAlertPanel({
  workTitle,
  animeSlug,
  productType,
  characterName,
  currency,
  loggedIn,
}: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
  currency?: string;
  loggedIn: boolean;
}) {
  const [maxPrice, setMaxPrice] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!workTitle && !animeSlug && !productType) return null;

  async function submit() {
    setLoading(true);
    setError("");
    const res = await createSubcultureWtbAlert({
      workTitle,
      animeSlug,
      productType,
      characterName,
      maxPrice: maxPrice.trim() ? Math.floor(Number(maxPrice) || 0) : null,
      currency: currency ?? "krw",
      note: note.trim() || null,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="rounded-[14px] border-2 border-dashed border-folk-cobalt/25 px-3 py-3 text-[13px] font-bold text-folk-cobalt">
        {t("used.wtb_3")}
      </p>
    );
  }

  const summary = [workTitle, productType ? usedProductTypeLabel(productType) : null, characterName]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="space-y-2 rounded-[14px] border-2 border-dashed border-folk-cobalt/25 p-3">
      <h2 className="text-sm font-extrabold text-folk-cobalt">{t("used.wtb_4")}</h2>
      <p className="text-xs leading-[18px] text-muted-foreground">
        {t("used.wtbNotifyWhenMatch", { summary })}
      </p>
      {!loggedIn ? (
        <p className="text-xs text-muted-foreground">
          <a href="/auth/signin" className="font-bold text-folk-cobalt underline">
            {t("auth.signIn")}
          </a>
          {t("used.wtb_5")}
        </p>
      ) : (
        <>
          <Input
            type="number"
            min={0}
            placeholder={t("used.s11zgz1z")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-11 rounded-[14px] border-2 border-folk-cobalt/20 bg-card font-semibold"
          />
          <Input
            placeholder={t("used.sc1somo")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 rounded-[14px] border-2 border-folk-cobalt/20 bg-card font-semibold"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="h-11 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90"
          >
            {loading ? t("used.skg4uo9") : t("used.wtb_6")}
          </Button>
        </>
      )}
    </section>
  );
}
