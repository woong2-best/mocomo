"use client";

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
} from "lucide-react";
import { VideoPreviewCanvas } from "@/components/media/video/video-preview-canvas";
import { VideoTimeline } from "@/components/media/video/video-timeline";
import { needsVideoReencode, useVideoEditor } from "@/hooks/use-video-editor";
import { processVideoBlob } from "@/lib/video-editor/process-video";
import { VIDEO_FILTER_PRESETS } from "@/lib/video-editor/filters";
import { generateVideoThumbnails } from "@/lib/video-editor/thumbnails";
import type { VideoTool } from "@/lib/video-editor/types";
import { EMOJI_QUICK_PICK } from "@/lib/media-editor/constants";
import { guessVideoMime } from "@/lib/gallery-video-upload";
import { uploadVideoBlob, type UploadMediaOptions } from "@/lib/client-upload";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { WatermarkToggleButtons } from "@/components/media/watermark-toggle-buttons";
import { getUploadMaxBytes, uploadSizeExceededMessage } from "@/lib/upload-limits";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const ASPECT_PRESETS = [
  { id: "free", label: "자유", aspect: undefined as number | undefined },
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
  onComplete: (publicUrl: string) => void;
  onUploadingChange?: (busy: boolean) => void;
};

const TOOLS: { id: VideoTool; label: string; icon: typeof Scissors }[] = [
  { id: "trim", label: "자르기", icon: Scissors },
  { id: "transform", label: "회전·비율", icon: Crop },
  { id: "filter", label: "필터", icon: Palette },
  { id: "adjust", label: "보정", icon: Sun },
  { id: "sticker", label: "이모지", icon: Smile },
  { id: "audio", label: "소리", icon: Volume2 },
];

export function VideoEditDialog({
  open,
  onOpenChange,
  videoBlob,
  uploadFilename = "post-video.mp4",
  maxDurationSec = 120,
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
      durationInitRef.current = false;
      return;
    }
    const url = URL.createObjectURL(videoBlob);
    setPreviewUrl(url);
    setTool("trim");
    return () => URL.revokeObjectURL(url);
  }, [open, videoBlob]);

  const loadThumbnails = useCallback(async (video: HTMLVideoElement, dur: number) => {
    const thumbs = await generateVideoThumbnails(video, dur, 14);
    setThumbnails(thumbs);
  }, []);

  function handleDuration(dur: number) {
    setDuration(dur);
    if (!durationInitRef.current) {
      durationInitRef.current = true;
      reset(dur, maxDurationSec);
      const v = hiddenVideoRef.current;
      if (v) void loadThumbnails(v, dur);
    }
  }

  function handleReset() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("모든 편집을 원본 상태로 되돌릴까요?");
      if (!ok) return;
    }
    reset(duration, maxDurationSec);
    setPlaying(false);
    setTool("trim");
  }

  function hasUnsavedEdits(): boolean {
    if (!duration) return false;
    return needsVideoReencode(edit, duration);
  }

  function requestClose() {
    if (busy) return;
    if (hasUnsavedEdits() && typeof window !== "undefined") {
      const ok = window.confirm("저장하지 않고 나가시겠습니까? 편집 내용이 사라집니다.");
      if (!ok) return;
    }
    onOpenChange(false);
  }

  async function uploadBlob(blob: Blob, filename: string, opts?: UploadMediaOptions) {
    const ext = guessVideoMime(filename, blob.type).includes("webm") ? "webm" : "mp4";
    const name = filename.replace(/\.\w+$/, `.${ext}`);
    const url = await uploadVideoBlob(blob, name, opts);
    onComplete(url);
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

    const clipLen = edit.endSec - edit.startSec;
    if (!skipProcess && clipLen < 0.3) {
      setError("0.3초 이상 구간을 선택해 주세요.");
      return;
    }
    if (!skipProcess && clipLen > maxDurationSec) {
      setError(`영상은 최대 ${maxDurationSec}초까지 올릴 수 있습니다.`);
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

      const mustProcess = !skipProcess && (needsVideoReencode(edit, duration) || !!videoWatermark);

      if (mustProcess) {
        try {
          toUpload = await processVideoBlob(videoBlob, edit, setProgress, videoWatermark);
          watermarkBurned = !!videoWatermark;
        } catch (procErr) {
          if (!needsVideoReencode(edit, duration) && duration <= maxDurationSec) {
            toUpload = videoBlob;
            setWarn("편집 적용을 건너뛰고 원본 영상을 업로드합니다.");
          } else {
            throw procErr instanceof Error ? procErr : new Error("영상 처리에 실패했습니다.");
          }
        }
      }

      await uploadBlob(toUpload, uploadFilename, watermarkBurned ? undefined : resolved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상 처리에 실패했습니다.");
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
              영상 편집
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo || busy} onClick={undo} aria-label="실행 취소">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo || busy} onClick={redo} aria-label="다시 실행">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" disabled={busy} onClick={handleReset}>
                원본 복원
              </Button>
            </div>
          </div>
          <DialogDescription>
            구간 자르기·회전·필터·보정·이모지·소리 조절 후 적용하세요.
          </DialogDescription>
        </DialogHeader>

        {/* 미리보기 */}
        <div className="relative w-full h-[min(40vh,300px)] sm:h-[min(44vh,340px)] bg-neutral-900 shrink-0">
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
              onError={() => setError("이 영상은 브라우저에서 미리보기가 안 됩니다.")}
              className="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* 타임라인 */}
        {duration > 0 && (
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
            {TOOLS.map(({ id, label, icon: Icon }) => (
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
                    <FlipHorizontal2 className="h-4 w-4 mr-1" /> 좌우
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => patch((s) => ({ ...s, flipY: !s.flipY }))}>
                    <FlipVertical2 className="h-4 w-4 mr-1" /> 상하
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
                    { key: "brightness" as const, label: "밝기" },
                    { key: "contrast" as const, label: "대비" },
                    { key: "saturation" as const, label: "채도" },
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
                <p className="text-[10px] text-muted-foreground">이모지를 고른 뒤 영상을 탭해 배치하세요.</p>
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
                    이모지 모두 제거
                  </Button>
                )}
              </div>
            )}

            {tool === "audio" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant={edit.muted ? "default" : "outline"} size="sm" className="rounded-full h-8" disabled={busy} onClick={() => patch((s) => ({ ...s, muted: !s.muted }))}>
                    {edit.muted ? "음소거 해제" : "음소거"}
                  </Button>
                  <span className="text-xs text-muted-foreground">볼륨</span>
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
          </div>

          {watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
            <div className="px-4 pb-2 space-y-1">
              <WatermarkToggleButtons value={watermarkOptions} onChange={onWatermarkOptionsChange} disabled={busy} />
            </div>
          ) : null}

          {busy && (
            <div className="px-4 pb-2 space-y-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">처리·업로드 중…</p>
            </div>
          )}

          {warn && <p className="px-4 pb-1 text-sm text-amber-600 dark:text-amber-400">{warn}</p>}
          {error && <p className="px-4 pb-1 text-sm text-destructive">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2 justify-end px-4 pb-4 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" className="rounded-xl" onClick={requestClose} disabled={busy}>
              취소
            </Button>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => void applyUpload(true)} disabled={busy || !videoBlob}>
              원본 그대로
            </Button>
            <Button type="button" className="rounded-xl" onClick={() => void applyUpload(false)} disabled={busy || !videoBlob}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  업로드 중…
                </>
              ) : (
                "적용"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
