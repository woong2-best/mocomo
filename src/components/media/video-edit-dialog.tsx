"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  Palette,
  Redo2,
  RotateCw,
  Scissors,
  Smile,
  Sun,
  Undo2,
  Volume2,
  Crop,
  Droplets,
} from "lucide-react";
import { VideoPreviewCanvas } from "@/components/media/video/video-preview-canvas";
import { VideoTimeline } from "@/components/media/video/video-timeline";
import { needsVideoReencode, useVideoEditor } from "@/hooks/use-video-editor";
import { processVideoBlob } from "@/lib/video-editor/process-video";
import { computeOutputDimensions } from "@/lib/video-editor/draw-frame";
import { VIDEO_FILTER_PRESETS } from "@/lib/video-editor/filters";
import { generateVideoThumbnails } from "@/lib/video-editor/thumbnails";
import type { VideoTool } from "@/lib/video-editor/types";
import { EMOJI_QUICK_PICK } from "@/lib/media-editor/constants";
import { guessVideoMime } from "@/lib/gallery-video-upload";
import { uploadVideoBlob, type UploadMediaOptions } from "@/lib/client-upload";
import { buildWatermarkSvg, hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { WatermarkToggleButtons } from "@/components/media/watermark-toggle-buttons";
import { getUploadMaxBytes, uploadSizeExceededMessage, MAX_VIDEO_DURATION_SEC } from "@/lib/upload-limits";
import { readVideoMetadata } from "@/lib/video-metadata";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const ASPECT_PRESETS = [
  { id: "free", label: t("lib.media-editor.sz1cg"), aspect: undefined as number | undefined },
  { id: "1:1", label: "1:1", aspect: 1 },
  { id: "4:5", label: "4:5", aspect: 4 / 5 },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
];

type VideoEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoBlob: Blob | null;
  uploadFilename?: string;
  maxDurationSec?: number;
  uploadOptions?: UploadMediaOptions;
  watermarkCreditLabel?: string;
  watermarkOptions?: WatermarkOptions;
  onWatermarkOptionsChange?: (next: WatermarkOptions) => void;
  onComplete: (
    publicUrl: string,
    meta?: { width?: number | null; height?: number | null; duration?: number | null }
  ) => void;
  onUploadingChange?: (busy: boolean) => void;
};

const TOOLS: { id: VideoTool; label: string; icon: typeof Scissors }[] = [
  { id: "trim", label: t("media.su4sek"), icon: Scissors },
  { id: "transform", label: t("media.sbrbioz"), icon: Crop },
  { id: "filter", label: t("media.s11f8s"), icon: Palette },
  { id: "adjust", label: t("media.sx8kh"), icon: Sun },
  { id: "sticker", label: t("lib.media-editor.su4kgc"), icon: Smile },
  { id: "audio", label: t("media.sxxuo"), icon: Volume2 },
  { id: "watermark", label: t("media.spy7kp4"), icon: Droplets },
];

function formatMaxDurationLabel(sec: number): string {
  if (sec >= 60 && sec % 60 === 0) return t("reels.s11fo", { v0: sec / 60 });
  if (sec >= 60) return t("media.srsgh8", { v0: Math.floor(sec / 60), v1: sec % 60 });
  return t("media.s14i0", { v0: sec });
}

export function VideoEditDialog({
  open,
  onOpenChange,
  videoBlob,
  uploadFilename = "post-video.mp4",
  maxDurationSec = MAX_VIDEO_DURATION_SEC,
  uploadOptions,
  watermarkCreditLabel,
  watermarkOptions,
  onWatermarkOptionsChange,
  onComplete,
  onUploadingChange,
}: VideoEditDialogProps) {
  const { data: session } = useSession();
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const durationInitRef = useRef(false);
  const editor = useVideoEditor();
  const { edit, patch, patchLive, commitLive, undo, redo, reset, canUndo, canRedo } = editor;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [tool, setTool] = useState<VideoTool>("trim");
  const [pendingEmoji, setPendingEmoji] = useState("😀");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");

  useEffect(() => {
    if (!open || !videoBlob) {
      setPreviewUrl(null);
      setDuration(0);
      setThumbnails([]);
      setPlaying(false);
      setError("");
      setWarn("");
      setBusy(false);
      setProgress(0);
      durationInitRef.current = false;
      reset(0, maxDurationSec);
      return;
    }
    // 새 영상마다 trim/필터 상태를 처음부터 맞춤 (이전 영상 길이·편집값 잔존 방지)
    durationInitRef.current = false;
    setDuration(0);
    setThumbnails([]);
    setPlaying(false);
    setError("");
    setWarn("");
    setBusy(false);
    setProgress(0);
    reset(0, maxDurationSec);
    const url = URL.createObjectURL(videoBlob);
    setPreviewUrl(url);
    setTool(watermarkCreditLabel ? "watermark" : "trim");
    return () => URL.revokeObjectURL(url);
  }, [open, videoBlob, maxDurationSec, reset, watermarkCreditLabel]);

  const loadThumbnails = useCallback(async (video: HTMLVideoElement, dur: number) => {
    const thumbs = await generateVideoThumbnails(video, dur, 14);
    setThumbnails(thumbs);
  }, []);

  function handleDuration(dur: number) {
    if (!Number.isFinite(dur) || dur <= 0) return;
    setDuration(dur);
    if (!durationInitRef.current) {
      durationInitRef.current = true;
      reset(dur, maxDurationSec);
      const v = hiddenVideoRef.current;
      if (v) void loadThumbnails(v, dur);
      return;
    }
    // 메타데이터가 늦게 보정되면(이전 영상 길이 잔존 등) trim 상한을 맞춤
    if (edit.endSec > dur + 0.05 || edit.endSec <= 0.05) {
      patch(
        (s) => ({
          ...s,
          startSec: Math.min(s.startSec, Math.max(0, dur - 0.1)),
          endSec: Math.min(Math.max(s.endSec, 0.1), Math.min(dur, maxDurationSec)),
        }),
        false
      );
    }
  }

  function handleReset() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(t("media.s113z2b5"));
      if (!ok) return;
    }
    reset(duration, maxDurationSec);
    setPlaying(false);
    setTool(watermarkCreditLabel ? "watermark" : "trim");
  }

  function hasUnsavedEdits(): boolean {
    if (!duration) return false;
    return needsVideoReencode(edit, duration);
  }

  function requestClose() {
    if (busy) return;
    if (hasUnsavedEdits() && typeof window !== "undefined") {
      const ok = window.confirm(t("media.s1ac53oi"));
      if (!ok) return;
    }
    onOpenChange(false);
  }

  async function resolveUploadMeta(blob: Blob, skipProcess: boolean) {
    const clipDur = Math.max(1, Math.round(edit.endSec - edit.startSec));
    const preview = hiddenVideoRef.current;
    if (!skipProcess && preview && preview.videoWidth > 0 && preview.videoHeight > 0) {
      const dims = computeOutputDimensions(
        preview.videoWidth,
        preview.videoHeight,
        edit.rotation,
        edit.cropAspect
      );
      return {
        width: Math.round(dims.width),
        height: Math.round(dims.height),
        duration: clipDur,
      };
    }
    const meta = await readVideoMetadata(blob);
    return {
      width: meta.width,
      height: meta.height,
      duration: meta.duration ?? (duration > 0 ? Math.max(1, Math.round(duration)) : null),
    };
  }

  async function uploadBlob(
    blob: Blob,
    filename: string,
    opts: UploadMediaOptions | undefined,
    skipProcess: boolean
  ) {
    const ext = guessVideoMime(filename, blob.type).includes("webm") ? "webm" : "mp4";
    const name = filename.replace(/\.\w+$/, `.${ext}`);
    const [url, meta] = await Promise.all([
      uploadVideoBlob(blob, name, opts),
      resolveUploadMeta(blob, skipProcess),
    ]);
    onComplete(url, meta);
    onOpenChange(false);
  }

  function resolveUploadOptions(): UploadMediaOptions | undefined {
    if (watermarkCreditLabel && watermarkOptions && hasActiveWatermark(watermarkOptions)) {
      return { watermarkLabel: watermarkCreditLabel, watermarkOptions };
    }
    return uploadOptions;
  }

  async function applyUpload(skipProcess: boolean) {
    if (!videoBlob) return;

    const maxBytes = getUploadMaxBytes(session?.user?.premiumTier, "video");
    if (videoBlob.size > maxBytes) {
      setError(uploadSizeExceededMessage(session?.user?.premiumTier, "video"));
      return;
    }

    const preview = hiddenVideoRef.current;
    const realDuration =
      preview && Number.isFinite(preview.duration) && preview.duration > 0
        ? preview.duration
        : duration;
    if (realDuration > 0 && Math.abs(realDuration - duration) > 0.5) {
      setDuration(realDuration);
    }
    const effectiveDuration = realDuration > 0 ? realDuration : duration;
    const clippedEdit = {
      ...edit,
      startSec: Math.max(0, Math.min(edit.startSec, Math.max(0, effectiveDuration - 0.1))),
      endSec: Math.max(
        0.1,
        Math.min(edit.endSec, effectiveDuration > 0 ? effectiveDuration : edit.endSec)
      ),
    };

    const clipLen = clippedEdit.endSec - clippedEdit.startSec;
    if (!skipProcess && clipLen < 0.3) {
      setError(t("media.0_3"));
      return;
    }
    if (!skipProcess && clipLen > maxDurationSec) {
      setError(t("media.si5lsid", { v0: formatMaxDurationLabel(maxDurationSec) }));
      return;
    }

    setBusy(true);
    onUploadingChange?.(true);
    setError("");
    setWarn("");
    setProgress(0);
    setPlaying(false);

    try {
      const resolved = resolveUploadOptions();
      const label = resolved?.watermarkLabel;
      const wOpts = resolved?.watermarkOptions;
      const videoWatermark =
        label && wOpts && hasActiveWatermark(wOpts) ? { label, options: wOpts } : undefined;

      let toUpload = videoBlob;
      let watermarkBurned = false;

      const mustProcess =
        !skipProcess &&
        (needsVideoReencode(clippedEdit, effectiveDuration) || !!videoWatermark);

      if (mustProcess) {
        try {
          toUpload = await processVideoBlob(videoBlob, clippedEdit, setProgress, videoWatermark);
          watermarkBurned = !!videoWatermark;
        } catch (procErr) {
          if (!needsVideoReencode(clippedEdit, effectiveDuration) && effectiveDuration <= maxDurationSec) {
            toUpload = videoBlob;
            setWarn(t("media.sodrq2z"));
          } else {
            throw procErr instanceof Error ? procErr : new Error(t("media.sw8h8m5"));
          }
        }
      }

      if (toUpload.size > maxBytes) {
        setError(uploadSizeExceededMessage(session?.user?.premiumTier, "video"));
        return;
      }

      await uploadBlob(
        toUpload,
        uploadFilename,
        watermarkBurned ? undefined : resolved,
        skipProcess
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("media.sw8h8m5"));
    } finally {
      setBusy(false);
      onUploadingChange?.(false);
      setProgress(0);
    }
  }

  function placeSticker(x: number, y: number) {
    patch((s) => ({
      ...s,
      stickers: [
        ...s.stickers,
        {
          id: crypto.randomUUID(),
          content: pendingEmoji,
          x,
          y,
          scale: 1,
        },
      ],
    }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else requestClose();
      }}
    >
      <DialogContent layer="stack" className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[96vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              {t("media.sh6wf2x")}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo || busy} onClick={undo} aria-label={t("media.s7n0b5r")}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo || busy} onClick={redo} aria-label={t("media.sdr4ix9")}>
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" disabled={busy} onClick={handleReset}>
                {t("media.sjvf7n7")}
              </Button>
            </div>
          </div>
          <DialogDescription>
            {watermarkCreditLabel
              ? t("media.s18ru9zu")
              : t("media.s1urtsg8")}
          </DialogDescription>
        </DialogHeader>

        {/* 미리보기 */}
        <div className="relative mx-5 w-[calc(100%-2.5rem)] h-[min(40vh,300px)] sm:h-[min(44vh,340px)] bg-[#152238] dark:bg-[#0A0E18] shrink-0 rounded-2xl border-2 border-primary/15 overflow-hidden shadow-[3px_4px_0_rgba(27,74,140,0.12)]">
          {previewUrl ? (
            <VideoPreviewCanvas
              src={previewUrl}
              videoRef={hiddenVideoRef}
              edit={edit}
              playing={playing}
              stickerMode={tool === "sticker"}
              onDuration={handleDuration}
              onTimeUpdate={setCurrentSec}
              onTogglePlay={() => setPlaying((p) => !p)}
              onPlaceSticker={placeSticker}
              onError={() => setError(t("media.s1ji4r89"))}
              className="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {watermarkCreditLabel && watermarkOptions && hasActiveWatermark(watermarkOptions) ? (
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              dangerouslySetInnerHTML={{
                __html: buildWatermarkSvg(720, 405, watermarkCreditLabel, watermarkOptions),
              }}
            />
          ) : null}
        </div>

        {/* 타임라인 */}
        {duration > 0 && !watermarkCreditLabel && (
          <VideoTimeline
            duration={duration}
            startSec={edit.startSec}
            endSec={edit.endSec}
            currentSec={currentSec}
            thumbnails={thumbnails}
            disabled={busy || tool !== "trim"}
            onStartChange={(sec) => patchLive((s) => ({ ...s, startSec: sec }))}
            onEndChange={(sec) => patchLive((s) => ({ ...s, endSec: sec }))}
            onSeek={(sec) => {
              const v = hiddenVideoRef.current;
              if (v) {
                v.currentTime = sec;
                setCurrentSec(sec);
              }
            }}
            onDragEnd={commitLive}
          />
        )}

        {/* 도구 바 */}
        <div className="shrink-0 border-t border-border bg-background">
          <div className="flex items-center justify-around gap-1 px-2 py-2 overflow-x-auto">
            {(watermarkCreditLabel ? TOOLS.filter((t) => t.id === "watermark") : TOOLS.filter((t) => t.id !== "watermark")).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => setTool(id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 min-w-[52px] rounded-xl px-2 py-1.5 text-[10px] transition-colors",
                  tool === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>

          {/* 도구별 패널 */}
          <div className="px-4 pb-3 min-h-[72px]">
            {tool === "transform" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => patch((s) => ({ ...s, rotation: ((s.rotation + 90) % 360) as 0 | 90 | 180 | 270 }))}>
                    <RotateCw className="h-4 w-4 mr-1" /> 90°
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => patch((s) => ({ ...s, flipX: !s.flipX }))}>
                    <FlipHorizontal2 className="h-4 w-4 mr-1" /> {t("media.sz7ac")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => patch((s) => ({ ...s, flipY: !s.flipY }))}>
                    <FlipVertical2 className="h-4 w-4 mr-1" /> {t("media.sxygn")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ASPECT_PRESETS.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={edit.cropAspect === p.aspect ? "default" : "outline"}
                      className="rounded-full h-7 px-3 text-xs"
                      disabled={busy}
                      onClick={() => patch((s) => ({ ...s, cropAspect: p.aspect }))}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {tool === "filter" && (
              <div className="flex flex-wrap gap-1.5">
                {VIDEO_FILTER_PRESETS.map((f) => (
                  <Button
                    key={f.id}
                    type="button"
                    size="sm"
                    variant={edit.filterId === f.id ? "default" : "outline"}
                    className="rounded-full h-7 px-3 text-xs"
                    disabled={busy}
                    onClick={() => patch((s) => ({ ...s, filterId: f.id }))}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            )}

            {tool === "adjust" && (
              <div className="space-y-2">
                {(
                  [
                    { key: "brightness" as const, label: t("lib.webtoon-studio.swyb7") },
                    { key: "contrast" as const, label: t("lib.media-editor.svhok") },
                    { key: "saturation" as const, label: t("lib.webtoon-studio.szqbk") },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs w-8 shrink-0 text-muted-foreground">{label}</span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={edit[key]}
                      disabled={busy}
                      onChange={(e) => patchLive((s) => ({ ...s, [key]: Number(e.target.value) }))}
                      onPointerUp={commitLive}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-[10px] w-8 text-right tabular-nums">{edit[key]}</span>
                  </div>
                ))}
              </div>
            )}

            {tool === "sticker" && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground">{t("media.s1m5w4yz")}</p>
                <div className="flex flex-wrap gap-1">
                  {EMOJI_QUICK_PICK.slice(0, 16).map((em) => (
                    <button
                      key={em}
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingEmoji(em)}
                      className={cn(
                        "h-8 w-8 rounded-lg text-lg hover:bg-muted/60",
                        pendingEmoji === em && "ring-2 ring-primary bg-primary/10"
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                {edit.stickers.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="rounded-full h-7 text-xs" disabled={busy} onClick={() => patch((s) => ({ ...s, stickers: [] }))}>
                    {t("media.sstgb7c")}
                  </Button>
                )}
              </div>
            )}

            {tool === "audio" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant={edit.muted ? "default" : "outline"} size="sm" className="rounded-full h-8" disabled={busy} onClick={() => patch((s) => ({ ...s, muted: !s.muted }))}>
                    {edit.muted ? t("media.s3btimw") : t("lib.community-server.su4r74")}
                  </Button>
                  <span className="text-xs text-muted-foreground">{t("media.sx5v0")}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(edit.volume * 100)}
                    disabled={busy || edit.muted}
                    onChange={(e) => patchLive((s) => ({ ...s, volume: Number(e.target.value) / 100 }))}
                    onPointerUp={commitLive}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-[10px] w-8 tabular-nums">{Math.round(edit.volume * 100)}%</span>
                </div>
              </div>
            )}

            {tool === "trim" && duration > 0 && (
              <p className="text-xs text-muted-foreground">
                타임라인 핸들을 드래그해 구간을 조절하세요. 길이 {(edit.endSec - edit.startSec).toFixed(1)}초 / 전체 {duration.toFixed(1)}초
              </p>
            )}

            {tool === "watermark" && watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
              <WatermarkToggleButtons
                value={watermarkOptions}
                onChange={onWatermarkOptionsChange}
                disabled={busy}
                creditLabel={watermarkCreditLabel}
              />
            ) : null}
          </div>

          {busy && (
            <div className="px-4 pb-2 space-y-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">{t("media.s1ocprir")}</p>
            </div>
          )}

          {warn && <p className="px-4 pb-1 text-sm text-amber-600 dark:text-amber-400">{warn}</p>}
          {error && <p className="px-4 pb-1 text-sm text-destructive">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2 justify-end px-4 pb-4 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" className="rounded-xl" onClick={requestClose} disabled={busy}>
              {t("toast.cancel")}
            </Button>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => void applyUpload(true)} disabled={busy || !videoBlob}>
              {t("media.s1bqxr30")}
            </Button>
            <Button type="button" className="rounded-xl" onClick={() => void applyUpload(false)} disabled={busy || !videoBlob}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("compose.uploading")}
                </>
              ) : (
                t("media.sz3yg")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
