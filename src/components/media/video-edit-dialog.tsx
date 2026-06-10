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
import { Loader2, Scissors } from "lucide-react";
import { trimVideoBlob } from "@/lib/video-trim";
import { guessVideoMime } from "@/lib/gallery-video-upload";
import { uploadVideoBlob } from "@/lib/client-upload";
import { getUploadMaxBytes, uploadSizeExceededMessage } from "@/lib/upload-limits";
import { useSession } from "next-auth/react";

type VideoEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoBlob: Blob | null;
  uploadFilename?: string;
  maxDurationSec?: number;
  onComplete: (publicUrl: string) => void;
  onUploadingChange?: (busy: boolean) => void;
};

export function VideoEditDialog({
  open,
  onOpenChange,
  videoBlob,
  uploadFilename = "post-video.mp4",
  maxDurationSec = 120,
  onComplete,
  onUploadingChange,
}: VideoEditDialogProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");

  useEffect(() => {
    if (!open || !videoBlob) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setDuration(0);
      setStartSec(0);
      setEndSec(0);
      setError("");
      setWarn("");
      return;
    }

    const url = URL.createObjectURL(videoBlob);
    previewUrlRef.current = url;
    setError("");
    setWarn("");
    setStartSec(0);
    setDuration(0);
    setEndSec(0);

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [open, videoBlob]);

  useEffect(() => {
    const v = videoRef.current;
    const url = previewUrlRef.current;
    if (!v || !url || !open) return;

    const onMeta = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        setEndSec(Math.min(d, maxDurationSec));
      } else {
        setError("영상 길이를 읽을 수 없습니다. 「원본 그대로 업로드」를 시도해 주세요.");
      }
    };

    v.addEventListener("loadedmetadata", onMeta);
    v.src = url;
    v.load();

    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [open, videoBlob, maxDurationSec]);

  const clipLen = Math.max(0, endSec - startSec);

  const playPreview = useCallback(() => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = startSec;
    v.play().catch(() => undefined);
    const onTime = () => {
      if (v.currentTime >= endSec) {
        v.pause();
        v.removeEventListener("timeupdate", onTime);
      }
    };
    v.addEventListener("timeupdate", onTime);
  }, [startSec, endSec, duration]);

  async function uploadBlob(blob: Blob, filename: string) {
    const ext = guessVideoMime(filename, blob.type).includes("webm") ? "webm" : "mp4";
    const name = filename.replace(/\.\w+$/, `.${ext}`);
    const url = await uploadVideoBlob(blob, name);
    onComplete(url);
    onOpenChange(false);
  }

  async function applyUpload(skipTrim: boolean) {
    if (!videoBlob) return;

    const maxBytes = getUploadMaxBytes(session?.user?.premiumTier, "video");
    if (videoBlob.size > maxBytes) {
      setError(uploadSizeExceededMessage(session?.user?.premiumTier, "video"));
      return;
    }

    if (!skipTrim && clipLen < 0.3) {
      setError("1초 이상 구간을 선택해 주세요.");
      return;
    }
    if (!skipTrim && clipLen > maxDurationSec) {
      setError(`영상은 최대 ${maxDurationSec}초까지 올릴 수 있습니다.`);
      return;
    }

    setBusy(true);
    onUploadingChange?.(true);
    setError("");
    setWarn("");
    setProgress(0);

    try {
      const fullOk =
        duration > 0 &&
        duration <= maxDurationSec &&
        startSec < 0.05 &&
        endSec >= duration - 0.05;

      let toUpload = videoBlob;

      if (!skipTrim && !fullOk) {
        try {
          toUpload = await trimVideoBlob(videoBlob, startSec, endSec, setProgress);
        } catch (trimErr) {
          if (duration > 0 && duration <= maxDurationSec && startSec < 0.5) {
            toUpload = videoBlob;
            setWarn("구간 자르기를 건너뛰고 원본 영상을 업로드합니다.");
          } else {
            throw trimErr instanceof Error
              ? trimErr
              : new Error("영상 자르기에 실패했습니다.");
          }
        }
      }

      await uploadBlob(toUpload, uploadFilename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상 처리에 실패했습니다.");
    } finally {
      setBusy(false);
      onUploadingChange?.(false);
      setProgress(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent layer="stack" className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            영상 편집
          </DialogTitle>
          <DialogDescription>
            구간을 조절하거나 원본 그대로 업로드할 수 있습니다. (일반 계정 최대 50MB, 프리미엄 100MB)
          </DialogDescription>
        </DialogHeader>

        <div className="bg-black">
          <video
            ref={videoRef}
            className="w-full max-h-[40vh] object-contain"
            playsInline
            controls
            muted
          />
        </div>

        <div className="px-6 py-4 space-y-4 border-t">
          {duration > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>시작 {startSec.toFixed(1)}초</span>
                <span>
                  길이 {clipLen.toFixed(1)}초 / 전체 {duration.toFixed(1)}초
                </span>
                <span>끝 {endSec.toFixed(1)}초</span>
              </div>
              <label className="text-xs font-medium">시작 지점</label>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration - 0.5)}
                step={0.1}
                value={startSec}
                disabled={busy}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStartSec(v);
                  if (endSec <= v + 0.3) setEndSec(Math.min(duration, v + 1));
                }}
                className="w-full accent-primary"
              />
              <label className="text-xs font-medium">끝 지점</label>
              <input
                type="range"
                min={0.5}
                max={duration}
                step={0.1}
                value={endSec}
                disabled={busy}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setEndSec(v);
                  if (startSec >= v - 0.3) setStartSec(Math.max(0, v - 1));
                }}
                className="w-full accent-primary"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              영상 정보를 불러오는 중이거나, 이 기기에서 미리보기가 지원되지 않을 수 있습니다.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={playPreview}
            disabled={busy || !duration}
          >
            선택 구간 미리보기
          </Button>

          {busy && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">처리·업로드 중…</p>
            </div>
          )}

          {warn && <p className="text-sm text-amber-600 dark:text-amber-400">{warn}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => void applyUpload(true)}
              disabled={busy || !videoBlob}
            >
              원본 그대로 업로드
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => void applyUpload(false)}
              disabled={busy || !videoBlob}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  업로드 중…
                </>
              ) : (
                "구간 적용 · 업로드"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
