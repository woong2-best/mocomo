"use client";

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
import { formatSecLabel, youtubeEmbedUrl } from "@/lib/video-donation";

type PreviewQuote = {
  videoId: string;
  videoTitle: string | null;
  segmentSec: number;
  maxPlaySec: number;
  mocoAmount: number;
  startSec: number;
  endSec: number | null;
  playToEnd: boolean;
};

export function MocoVideoDonationDialog({
  streamerId,
  mocoBalance,
  userImageUrl,
  onSuccess,
  trigger,
}: {
  streamerId: string;
  mocoBalance?: number;
  userImageUrl?: string | null;
  onSuccess?: (remaining: number) => void;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [urlInput, setUrlInput] = useState("");
  const [message, setMessage] = useState("");
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(30);
  const [playToEnd, setPlayToEnd] = useState(false);
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
    setEndSec(30);
    setPlayToEnd(false);
    setQuote(null);
    setQuoteError("");
    setError("");
    setTermsAccepted(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  async function fetchQuote(mediaUrl: string): Promise<PreviewQuote | null> {
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
          start_sec: startSec,
          end_sec: playToEnd ? null : endSec,
          play_to_end: playToEnd,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setQuoteError(typeof body.error === "string" ? body.error : "영상을 확인할 수 없습니다.");
        setQuote(null);
        return null;
      }
      const next: PreviewQuote = {
        videoId: body.video_id,
        videoTitle: body.video_title ?? null,
        segmentSec: body.segment_sec,
        maxPlaySec: body.max_play_sec,
        mocoAmount: body.moco_amount,
        startSec: body.start_sec,
        endSec: body.end_sec,
        playToEnd: body.play_to_end,
      };
      setQuote(next);
      return next;
    } finally {
      setQuoteLoading(false);
    }
  }

  async function goToSegmentStep() {
    const url = urlInput.trim();
    if (!url) {
      setError("YouTube URL을 입력해 주세요.");
      return;
    }
    setError("");
    const q = await fetchQuote(url);
    if (q) setStep(2);
  }

  async function refreshQuote() {
    const url = urlInput.trim();
    if (!url) return;
    await fetchQuote(url);
  }

  async function submit() {
    if (!termsAccepted) {
      setError("후원 전 약관에 동의해 주세요.");
      return;
    }
    const url = urlInput.trim();
    if (!url || !quote) {
      setError("영상 견적을 다시 확인해 주세요.");
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
          start_sec: startSec,
          end_sec: playToEnd ? null : endSec,
          play_to_end: playToEnd,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        setError(typeof body.error === "string" ? body.error : "후원에 실패했습니다.");
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
      영상 후원
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-4 w-4 text-emerald-600" />
            YouTube 영상 후원
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {step === 1 ? "1/2 · URL 입력" : "2/2 · 구간·MOCO 확인"}
          </p>
        </DialogHeader>

        <MocoEarthTransferHero userImageUrl={userImageUrl} transferActive={pending} className="mx-4 rounded-lg">
          {typeof mocoBalance === "number" ? (
            <p className="text-xs text-muted-foreground">보유 MOCO: {formatMocoDisplay(mocoBalance)}</p>
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
                <Label>메시지 (선택)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="방송 화면에 함께 표시"
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
                {quoteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "다음"}
              </Button>
            </>
          ) : (
            <>
              {quote ? (
                <>
                  <p className="text-sm font-semibold line-clamp-2">{quote.videoTitle ?? "YouTube 영상"}</p>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      title="미리보기"
                      src={youtubeEmbedUrl(quote.videoId, {
                        startSec: quote.startSec,
                        endSec: quote.playToEnd ? undefined : quote.endSec ?? undefined,
                      })}
                      className="h-full w-full border-0"
                      allow="accelerometer; encrypted-media; picture-in-picture"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>시작(초)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={startSec}
                        onChange={(e) => setStartSec(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="border-2 border-[#1B3A6B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>끝(초)</Label>
                      <Input
                        type="number"
                        min={startSec + 1}
                        value={endSec}
                        disabled={playToEnd}
                        onChange={(e) => setEndSec(Math.max(startSec + 1, Math.floor(Number(e.target.value) || 0)))}
                        className="border-2 border-[#1B3A6B]"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={playToEnd} onChange={(e) => setPlayToEnd(e.target.checked)} />
                    끝까지 재생 (최대 {quote.maxPlaySec}초)
                  </label>

                  <Button type="button" variant="outline" size="sm" disabled={quoteLoading} onClick={() => void refreshQuote()}>
                    {quoteLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "구간 변경 후 MOCO 다시 계산"}
                  </Button>

                  <div className="rounded-lg border-2 border-[#E85D04]/40 bg-[#FFF8F0] px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">재생 구간 {formatSecLabel(quote.segmentSec)}</p>
                    <p className="text-xl font-black text-[#E85D04]">{formatMocoDisplay(quote.mocoAmount)} MOCO</p>
                  </div>
                </>
              ) : null}

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
                  이전
                </Button>
                <Button
                  className="flex-1 bg-[#0d4d2c] hover:bg-[#0a3d23]"
                  disabled={pending || !quote || quoteLoading}
                  onClick={() => void submit()}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "후원하기"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
