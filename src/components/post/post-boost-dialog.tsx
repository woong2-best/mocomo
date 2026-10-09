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
import { BoostDayDial } from "@/components/post/boost-day-dial";
import { useLocale } from "@/components/providers/locale-provider";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import { errorText } from "@/lib/i18n/error-text";
import { formatMocoCount, mocoCovers } from "@/lib/moco/decimal-amount";
import {
  calcSponsoredAdMoco,
  SPONSORED_AD_MAX_DAYS,
} from "@/lib/sponsored-ad/constants";

type BoostStatus = {
  boostable: boolean;
  purchasedMoco: number;
  active: boolean;
  maxDays?: number;
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
  const [days, setDays] = useState(1);
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

  const maxDays = status?.maxDays ?? SPONSORED_AD_MAX_DAYS;
  const cost = calcSponsoredAdMoco(days);
  const balance = status?.purchasedMoco ?? 0;
  const canAfford = mocoCovers(balance, cost);
  const dayLabel = days === 1 ? "post.boost.days" : "post.boost.daysPlural";

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
            <BoostDayDial
              key={`${open}:${postId}`}
              value={days}
              onChange={setDays}
              maxDays={maxDays}
              label={t("post.boost.duration")}
              alignKey={`${open}:${postId}`}
            />
            <p className="text-center text-sm font-semibold text-folk-cobalt">
              {t(dayLabel, { days, moco: formatMocoCount(cost) })}
            </p>

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

            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0 cursor-pointer"
              />
              <span>
                {t("post.boost.termsBefore")}
                <Link
                  href="/legal/sponsored-content"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-folk-terracotta underline underline-offset-2 hover:text-folk-terracotta/80"
                >
                  {t("post.boost.termsLink")}
                </Link>
                {t("post.boost.termsAfter")}
              </span>
            </div>

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
