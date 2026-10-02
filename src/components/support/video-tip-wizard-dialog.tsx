"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Info,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PayButton } from "@/components/payments/pay-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tipMetadataForCheckout } from "@/lib/donation-metadata";
import {
  calcSegmentDurationSec,
  calcVideoDonationAmount,
  DEFAULT_VIDEO_DONATION_SETTINGS,
  formatSecLabel,
  type VideoDonationHistoryItem,
  type VideoDonationSettings,
  youtubeEmbedUrl,
} from "@/lib/video-donation";
import { calcPlatformFee } from "@/lib/utils";
import { formatUsd } from "@/lib/money";

type PreviewData = {
  videoId: string;
  videoUrl: string;
  title: string | null;
  thumbnailUrl: string;
};

const AMOUNT_PRESETS = [
  { label: t("support.s21h2"), add: 1_000 },
  { label: t("support.s1xra"), add: 10_000 },
  { label: t("support.stima"), add: 100_000 },
  { label: t("support.100"), add: 1_000_000 },
];

export function VideoTipWizardDialog({
  creatorId,
  username,
  displayName,
  channelId,
  returnPath,
  paymentsEnabled,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  creatorId: string;
  username: string;
  displayName: string;
  channelId: string;
  returnPath?: string;
  paymentsEnabled: boolean;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<VideoDonationSettings>(
    DEFAULT_VIDEO_DONATION_SETTINGS
  );
  const [history, setHistory] = useState<VideoDonationHistoryItem[]>([]);
  const [historyScroll, setHistoryScroll] = useState(0);

  const [urlInput, setUrlInput] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [anonymous, setAnonymous] = useState(false);
  const [description, setDescription] = useState("");
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(30);
  const [playToEnd, setPlayToEnd] = useState(false);
  const [amountOverride, setAmountOverride] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);

  const viewerName =
    session?.user?.name ?? session?.user?.username ?? username ?? t("support.swfd6s");

  const durationSec = useMemo(
    () =>
      calcSegmentDurationSec({
        startSec,
        endSec,
        playToEnd,
        maxSec: settings.maxSec,
      }),
    [startSec, endSec, playToEnd, settings.maxSec]
  );

  const baseAmount = useMemo(
    () => calcVideoDonationAmount(durationSec, settings),
    [durationSec, settings]
  );

  const effectiveAmount = amountOverride ?? baseAmount;
  const fee = calcPlatformFee(effectiveAmount, 0.05);

  const resetWizard = useCallback(() => {
    setStep(1);
    setUrlInput("");
    setPreview(null);
    setPreviewError("");
    setAnonymous(false);
    setDescription("");
    setStartSec(0);
    setEndSec(30);
    setPlayToEnd(false);
    setAmountOverride(null);
    setAgreed(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetWizard();
      return;
    }
    void (async () => {
      try {
        const [settingsRes, historyRes] = await Promise.all([
          fetch(`/api/live/${channelId}/video-donations/settings`, { credentials: "include" }),
          fetch(`/api/live/${channelId}/video-donations/history`, { credentials: "include" }),
        ]);
        const settingsBody = await settingsRes.json();
        const historyBody = await historyRes.json();
        if (settingsRes.ok && settingsBody.ok) setSettings(settingsBody.settings);
        if (historyRes.ok && historyBody.ok) setHistory(historyBody.items ?? []);
      } catch {
        /* defaults */
      }
    })();
  }, [open, channelId, resetWizard]);

  async function loadPreview(rawUrl: string): Promise<PreviewData | null> {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const res = await fetch(`/api/youtube/preview?url=${encodeURIComponent(trimmed)}`);
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setPreview(null);
        setPreviewError(errorText(body.error ?? t("support.s1j3y2g7")));
        return null;
      }
      const data: PreviewData = {
        videoId: body.videoId,
        videoUrl: body.videoUrl,
        title: body.title,
        thumbnailUrl: body.thumbnailUrl,
      };
      setPreview(data);
      setEndSec(Math.min(30, settings.maxSec));
      return data;
    } catch {
      setPreviewError(t("support.s10f9nog"));
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }

  function pickHistory(item: VideoDonationHistoryItem) {
    setUrlInput(item.videoUrl);
    setPreview({
      videoId: item.videoId,
      videoUrl: item.videoUrl,
      title: item.videoTitle,
      thumbnailUrl: item.thumbnailUrl ?? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
    });
    setPreviewError("");
  }

  if (!paymentsEnabled) return null;

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2 rounded-md text-white/90 hover:bg-white/10 hover:text-white gap-1"
    >
      <Film className="h-4 w-4" />
      <span className="text-xs font-semibold hidden sm:inline">{t("support.sh6wx58")}</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null
      ) : (
        <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Film className="h-5 w-5 text-emerald-400" />
            {displayName} video tip
          </DialogTitle>
          <p className="text-xs text-white/50">
            {step}/4 · Add a YouTube video, set the clip and amount, then tip.
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image ?? undefined} />
                  <AvatarFallback className="text-xs bg-violet-600">
                    {viewerName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm truncate">{viewerName}</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-white/70 shrink-0 cursor-pointer">
                Anonymous
                <button
                  type="button"
                  role="switch"
                  aria-checked={anonymous}
                  onClick={() => setAnonymous((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    anonymous ? "bg-emerald-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      anonymous ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/10 p-3">
              <Input
                placeholder={t("support.url")}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadPreview(urlInput)}
                className="border-0 bg-transparent text-sm placeholder:text-white/40 focus-visible:ring-0 px-0 h-auto"
              />
            </div>

            {previewLoading && (
              <p className="text-xs text-white/50 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking video…
              </p>
            )}
            {previewError && <p className="text-xs text-red-400">{previewError}</p>}

            {preview && (
              <div className="flex gap-3 items-start rounded-xl overflow-hidden bg-black/30 p-2">
                <div className="w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                  <img
                    src={preview.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-medium line-clamp-2 pt-1">
                  {preview.title ?? t("support.youtube")}
                </p>
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/80">{t("support.so433r4")}</p>
                <div className="relative">
                  {historyScroll > 0 && (
                    <button
                      type="button"
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/70 flex items-center justify-center"
                      onClick={() => setHistoryScroll((v) => Math.max(0, v - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex gap-2 overflow-hidden px-6">
                    {history.slice(historyScroll, historyScroll + 3).map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => pickHistory(item)}
                        className="w-[calc(33%-0.35rem)] shrink-0 text-left group"
                      >
                        <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
                          <img
                            src={
                              item.thumbnailUrl ??
                              `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
                            }
                            alt=""
                            className="w-full h-full object-cover group-hover:opacity-90"
                          />
                          {i === 0 && historyScroll === 0 && (
                            <span className="absolute top-1 right-1 text-[9px] bg-blue-600 px-1.5 py-0.5 rounded-full">
                              Recent
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] mt-1 line-clamp-2 text-white/70">
                          {item.videoTitle ?? "YouTube"}
                        </p>
                      </button>
                    ))}
                  </div>
                  {historyScroll + 3 < history.length && (
                    <button
                      type="button"
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/70 flex items-center justify-center"
                      onClick={() =>
                        setHistoryScroll((v) => Math.min(history.length - 3, v + 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="text-[10px] text-white/40 leading-relaxed">
              Tips are blocked if embedding, region/age limits, or spam filters apply. Anonymous
              tips do not appear on rankings.
            </p>

            <Button
              className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
              disabled={previewLoading || (!urlInput.trim() && !preview)}
              onClick={async () => {
                if (preview) {
                  setStep(2);
                  return;
                }
                const loaded = await loadPreview(urlInput);
                if (loaded) setStep(2);
              }}
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && preview && (
          <div className="p-4 space-y-4">
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                title={t("support.sohlxtc")}
                src={youtubeEmbedUrl(preview.videoId, {
                  startSec,
                  endSec: playToEnd ? undefined : endSec,
                })}
                className="w-full h-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>

            <Textarea
              placeholder={t("support.s6d5edo")}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              className="rounded-xl bg-black/40 border-white/10 text-sm min-h-[72px] resize-none"
            />

            <div className="space-y-3 rounded-xl bg-black/30 p-3 border border-white/10">
              <div className="flex justify-between text-xs">
                <span>{t("support.snpzron")}</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {durationSec}s · max {settings.maxSec}s
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={playToEnd}
                  onChange={(e) => setPlayToEnd(e.target.checked)}
                  className="rounded border-white/30"
                />
                Play to end (billed up to {settings.maxSec}s)
              </label>
              {!playToEnd && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-white/50">
                      <span>Start {formatSecLabel(startSec)}</span>
                      <span>End {formatSecLabel(endSec)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={600}
                      value={startSec}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setStartSec(v);
                        if (endSec <= v) setEndSec(Math.min(v + settings.maxSec, v + 30));
                      }}
                      className="w-full accent-emerald-500"
                    />
                    <input
                      type="range"
                      min={startSec + 1}
                      max={startSec + settings.maxSec}
                      value={Math.min(endSec, startSec + settings.maxSec)}
                      onChange={(e) => setEndSec(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </>
              )}
              <p className="text-[10px] text-white/40">
                {formatUsd(settings.rateKrwPerSec)}/s × {durationSec}s ={" "}
                {formatUsd(baseAmount)} (min {formatUsd(settings.minKrw)})
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full border-white/20" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                onClick={() => {
                  setAmountOverride(null);
                  setStep(3);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && preview && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-1">
                Tip amount <Info className="h-3.5 w-3.5 text-white/40" />
              </p>
              <span className="text-[10px] text-white/50">Platform 5% · payout {formatUsd(effectiveAmount - fee)}</span>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/10 p-4 flex items-center gap-3">
              <span className="text-2xl">🧀</span>
              <Input
                value={effectiveAmount.toLocaleString()}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setAmountOverride(Number.isFinite(n) && n > 0 ? n : baseAmount);
                }}
                className="border-0 bg-transparent text-2xl font-bold tabular-nums h-auto p-0 focus-visible:ring-0"
              />
              {amountOverride != null && amountOverride !== baseAmount && (
                <button
                  type="button"
                  className="ml-auto text-white/40 hover:text-white"
                  onClick={() => setAmountOverride(null)}
                  aria-label={t("support.s1oc5v51")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/15 text-xs h-8"
                  onClick={() => setAmountOverride((effectiveAmount) => (effectiveAmount ?? baseAmount) + p.add)}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-white/15 text-xs h-8"
                onClick={() => setAmountOverride(baseAmount)}
              >
                Auto amount
              </Button>
            </div>

            <p className="text-xs text-white/50">
              Auto amount for {durationSec}s playback: {formatUsd(baseAmount)} · You can tip more
              if you want.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full border-white/20" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                disabled={effectiveAmount < baseAmount}
                onClick={() => setStep(4)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 4 && preview && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-black/30 p-3 text-xs space-y-1 border border-white/10">
              <p className="font-medium truncate">{preview.title ?? t("support.youtube")}</p>
              <p className="text-white/50">
                {formatSecLabel(startSec)} ~ {playToEnd ? t("support.sqopox") : formatSecLabel(endSec)} ·{" "}
                {durationSec}s
              </p>
              {description && <p className="text-white/70">&ldquo;{description}&rdquo;</p>}
              <p className="text-emerald-400 font-bold text-base pt-1">
                {formatUsd(effectiveAmount)}
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-white/30"
              />
              <span>
                I agree to payment and video tip terms. Clips play on stream after host review.
              </span>
            </label>

            <PayButton
              type="TIP"
              amount={effectiveAmount}
              orderName={`${displayName} video tip`}
              metadata={tipMetadataForCheckout({
                receiverId: creatorId,
                message: description.trim() || undefined,
                username,
                channelId,
                returnPath,
                tipKind: "video",
                videoUrl: preview.videoUrl,
                videoTitle: preview.title ?? undefined,
                thumbnailUrl: preview.thumbnailUrl,
                description: description.trim() || undefined,
                startSec,
                endSec: playToEnd ? undefined : endSec,
                playToEnd,
                durationSec,
                anonymous,
              })}
              disabled={!agreed || effectiveAmount < baseAmount}
              className="w-full rounded-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-bold gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Tip {formatUsd(effectiveAmount)}
            </PayButton>

            <Button variant="ghost" className="w-full text-white/50" onClick={() => setStep(3)}>
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use VideoTipWizardDialog */
export const VideoTipCreatorDialog = VideoTipWizardDialog;
