"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/providers/locale-provider";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import { errorText } from "@/lib/i18n/error-text";
import { formatMocoCount, mocoCovers } from "@/lib/moco/decimal-amount";
import { SPONSORED_AD_DURATION_PRESETS } from "@/lib/sponsored-ad/constants";
import { cn } from "@/lib/utils";

type Preset = { days: number; moco: number };

type BoostStatus = {
  boostable: boolean;
  purchasedMoco: number;
  active: boolean;
  presets?: Preset[];
};

export function PostBoostDialog({
  open,
  onOpenChange,
  postId,
  onBoosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onBoosted?: () => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = usePublishedToastOptional();
  const [days, setDays] = useState<(typeof SPONSORED_AD_DURATION_PRESETS)[number]>(1);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<BoostStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAgreed(false);
    setError("");
    setDays(1);
    setLoading(true);
    void fetch(`/api/ads/boost?postId=${encodeURIComponent(postId)}`, { credentials: "same-origin" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || t("post.boost.loadFailed"));
        setStatus(body);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("post.boost.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [open, postId, t]);

  const presets = status?.presets ?? SPONSORED_AD_DURATION_PRESETS.map((d) => ({ days: d, moco: d * 0.5 }));
  const selected = presets.find((p) => p.days === days) ?? presets[0]!;
  const balance = status?.purchasedMoco ?? 0;
  const canAfford = mocoCovers(balance, selected.moco);

  async function submit() {
    if (busy || !agreed || !canAfford) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ads/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ postId, days }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(errorText(body.error) || t("post.boost.loadFailed"));
        return;
      }
      toast?.showInfoToast({ message: t("post.boost.success") });
      onOpenChange(false);
      onBoosted?.();
      router.refresh();
    } catch {
      setError(t("post.boost.loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("post.boost.title")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("post.boost.intro")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("post.loadingComments")}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => {
                const selectedTile = preset.days === days;
                const labelKey = preset.days === 1 ? "post.boost.days" : "post.boost.daysPlural";
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setDays(preset.days as (typeof SPONSORED_AD_DURATION_PRESETS)[number])}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedTile
                        ? "border-folk-cobalt bg-folk-cobalt/10 text-folk-cobalt"
                        : "border-border bg-card text-foreground hover:bg-muted/50"
                    )}
                  >
                    {t(labelKey, { days: preset.days, moco: formatMocoCount(preset.moco) })}
                  </button>
                );
              })}
            </div>

            <p className="text-sm font-medium">
              {t("post.boost.balance", { balance: formatMocoCount(balance) })}
            </p>
            {!canAfford ? (
              <p className="text-sm text-destructive">
                {t("post.boost.insufficient")}{" "}
                <Link href="/wallet" className="font-semibold underline">
                  {t("post.boost.charge")}
                </Link>
              </p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>{t("post.boost.terms")}</span>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <button
              type="button"
              disabled={busy || !agreed || !canAfford || status?.boostable === false}
              onClick={() => void submit()}
              className="inline-flex w-full items-center justify-center rounded-full bg-folk-cobalt px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? t("post.boost.busy") : t("post.boost.submit")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
