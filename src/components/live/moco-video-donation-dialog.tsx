"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MocoEarthTransferHero } from "@/components/moco/moco-earth-transfer-hero";
import { formatMocoDisplay } from "@/lib/gems/display";
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { youtubeEmbedUrl } from "@/lib/video-donation";
import { useLocale } from "@/components/providers/locale-provider";

type PreviewQuote = {
  videoId: string;
  videoTitle: string | null;
  durationSec: number;
  playSec: number;
  maxPlaySec: number;
  mocoLabel: string;
  usdCents: number;
  startSec: number;
};

export function MocoVideoDonationDialog({
  streamerId,
  mocoBalance,
  userImageUrl,
  onSuccess,
  trigger,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
}: {
  streamerId: string;
  mocoBalance?: number;
  userImageUrl?: string | null;
  onSuccess?: (remaining: number) => void;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const controlled = openControlled !== undefined;
  const open = controlled ? openControlled : openUncontrolled;
  const setOpen = controlled ? (onOpenChangeControlled ?? (() => {})) : setOpenUncontrolled;
  const [step, setStep] = useState<1 | 2>(1);
  const [urlInput, setUrlInput] = useState("");
  const [message, setMessage] = useState("");
  const [startSec, setStartSec] = useState(0);
  const [playSec, setPlaySec] = useState(10);
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);
  const [quote, setQuote] = useState<PreviewQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const resetForm = useCallback(() => {
    setStep(1);
    setUrlInput("");
    setMessage("");
    setStartSec(0);
    setPlaySec(10);
    setNoRefundAccepted(false);
    setQuote(null);
    setQuoteError("");
    setError("");
    setTermsAccepted(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  async function fetchQuote(mediaUrl: string, nextPlaySec = playSec, nextStart = startSec): Promise<PreviewQuote | null> {
    setQuoteLoading(true);
    setQuoteError("");
    try {
      const res = await fetch("/api/v1/donate/video/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamer_id: streamerId,
          media_url: mediaUrl,
          play_sec: nextPlaySec,
          start_sec: nextStart,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setQuoteError(typeof body.error === "string" ? body.error : t("live.donation.video.previewFailed"));
        setQuote(null);
        return null;
      }
      const next: PreviewQuote = {
        videoId: body.video_id,
        videoTitle: body.video_title ?? null,
        durationSec: body.duration_sec,
        playSec: body.play_sec,
        maxPlaySec: body.max_play_sec,
        mocoLabel: body.moco_label,
        usdCents: body.usd_cents,
        startSec: body.start_sec,
      };
      setQuote(next);
      setPlaySec(body.play_sec);
      return next;
    } finally {
      setQuoteLoading(false);
    }
  }

  async function goToSegmentStep() {
    const url = urlInput.trim();
    if (!url) {
      setError(t("live.donation.video.urlRequired"));
      return;
    }
    setError("");
    const q = (await fetchQuote(url, 10, 0)) ?? (await fetchQuote(url, 1, 0));
    if (q) setStep(2);
  }

  async function refreshQuote() {
    const url = urlInput.trim();
    if (!url) return;
    await fetchQuote(url, playSec, startSec);
  }

  async function submit() {
    if (!termsAccepted || !noRefundAccepted) {
      setError(t("live.donation.acceptTerms"));
      return;
    }
    const url = urlInput.trim();
    if (!url || !quote) {
      setError(t("live.donation.video.quoteRetry"));
      return;
    }

    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/v1/donate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamer_id: streamerId,
          type: "VIDEO",
          media_url: url,
          message: message.trim() || undefined,
          play_sec: playSec,
          start_sec: startSec,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        setError(typeof body.error === "string" ? body.error : t("live.donation.failed"));
        return;
      }
      onSuccess?.(body.remaining_moco ?? 0);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  const defaultTrigger = (
    <Button
      size="sm"
      type="button"
      className="h-8 text-xs bg-[#0d4d2c] text-white hover:bg-[#0d4d2c]/90 gap-1.5"
    >
      <Film className="h-3.5 w-3.5" />
      {t("live.donation.video.trigger")}
    </Button>
  );

  const showTrigger = !controlled;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-4 w-4 text-emerald-600" />
            {t("live.donation.video.title")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {step === 1 ? t("live.donation.video.step1") : t("live.donation.video.step2")}
          </p>
        </DialogHeader>

        <MocoEarthTransferHero userImageUrl={userImageUrl} transferActive={pending} className="mx-4 rounded-lg">
          {typeof mocoBalance === "number" ? (
            <p className="text-xs text-muted-foreground">
              {t("live.donation.balance", { balance: formatMocoDisplay(mocoBalance) })}
            </p>
          ) : null}
        </MocoEarthTransferHero>

        <div className="space-y-3 px-4 pb-4 pt-3">
          {step === 1 ? (
            <>
              <div className="space-y-1">
                <Label>YouTube URL</Label>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="border-2 border-[#1B3A6B]"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("live.donation.video.messageOptional")}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("live.donation.video.messagePlaceholder")}
                  maxLength={500}
                  rows={2}
                  className="border-2 border-[#1B3A6B]"
                />
              </div>
              {quoteError ? <p className="text-xs text-destructive">{quoteError}</p> : null}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button
                className="w-full bg-[#0d4d2c] hover:bg-[#0a3d23]"
                disabled={quoteLoading}
                onClick={() => void goToSegmentStep()}
              >
                {quoteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.next")}
              </Button>
            </>
          ) : (
            <>
              {quote ? (
                <>
                  <p className="text-sm font-semibold line-clamp-2">
                    {quote.videoTitle ?? t("live.donation.video.fallbackTitle")}
                  </p>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      title={t("live.donation.video.previewIframeTitle")}
                      src={youtubeEmbedUrl(quote.videoId, { startSec: quote.startSec })}
                      className="h-full w-full border-0"
                      allow="accelerometer; encrypted-media; picture-in-picture"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>{t("live.donation.video.startSec")}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, quote.durationSec - 1)}
                        value={startSec}
                        onChange={(e) => setStartSec(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="border-2 border-[#1B3A6B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("live.donation.video.playSec")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={Math.min(quote.maxPlaySec, Math.max(1, quote.durationSec - startSec))}
                        value={playSec}
                        onChange={(e) => {
                          const cap = Math.min(quote.maxPlaySec, Math.max(1, quote.durationSec - startSec));
                          setPlaySec(Math.min(cap, Math.max(1, Math.floor(Number(e.target.value) || 1))));
                        }}
                        className="border-2 border-[#1B3A6B]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("live.donation.video.lengthCap", {
                      duration: String(quote.durationSec),
                      max: String(quote.maxPlaySec),
                    })}
                  </p>

                  <Button type="button" variant="outline" size="sm" disabled={quoteLoading} onClick={() => void refreshQuote()}>
                    {quoteLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("live.donation.video.recalcQuote")}
                  </Button>

                  <div className="rounded-lg border-2 border-[#E85D04]/40 bg-[#FFF8F0] px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">{t("live.donation.video.priceLabel")}</p>
                    <p className="text-xl font-black text-[#E85D04]">{quote.mocoLabel} MOCO</p>
                    <p className="text-xs text-muted-foreground">${(quote.usdCents / 100).toFixed(2)}</p>
                  </div>
                </>
              ) : null}

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={noRefundAccepted}
                  onChange={(e) => setNoRefundAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  {t("live.donation.video.noRefundSkip")}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11px] leading-relaxed text-muted-foreground">{MOCO_PURCHASE_TERMS_COPY}</span>
              </label>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              {quoteError ? <p className="text-xs text-destructive">{quoteError}</p> : null}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  {t("live.donation.video.previous")}
                </Button>
                <Button
                  className="flex-1 bg-[#0d4d2c] hover:bg-[#0a3d23]"
                  disabled={pending || !quote || quoteLoading}
                  onClick={() => void submit()}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("live.donation.video.submit")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
