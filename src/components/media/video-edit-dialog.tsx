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
import { getVideoDurationSec } from "@/lib/video-metadata";
import { uploadVideoBlob } from "@/lib/client-upload";

type VideoEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoBlob: Blob | null;
  uploadFilename?: string;
  maxDurationSec?: number;
  onComplete: (publicUrl: string) => void;
};

export function VideoEditDialog({
  open,
  onOpenChange,
  videoBlob,
  uploadFilename = "post-video.webm",
  maxDurationSec = 120,
  onComplete,
}: VideoEditDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    setPreviewUrl(url);
    setError("");
    setStartSec(0);
    getVideoDurationSec(videoBlob).then((d) => {
      const capped = Math.min(d, maxDurationSec);
      setDuration(d);
      setEndSec(capped > 0 ? capped : d);
    });
    return () => URL.revokeObjectURL(url);
  }, [open, videoBlob, maxDurationSec]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !previewUrl) return;
    v.src = previewUrl;
  }, [previewUrl]);

  const clipLen = Math.max(0, endSec - startSec);

  const playPreview = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = startSec;
    v.play().catch(() => undefined);
    const onTime = () => {
      if (v.currentTime >= endSec) {
        v.pause();
        v.removeEventListener("timeupdate", onTime);
      }
    };
    v.addEventListener("timeupdate", onTime);
  }, [startSec, endSec]);

  async function apply() {
    if (!videoBlob || clipLen < 0.3) {
      setError("1초 이상 구간을 선택해 주세요.");
      return;
    }
    if (clipLen > maxDurationSec) {
      setError(`영상은 최대 ${maxDurationSec}초까지 올릴 수 있습니다.`);
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const trimmed =
        clipLen >= duration - 0.05 && startSec < 0.05
          ? videoBlob
          : await trimVideoBlob(videoBlob, startSec, endSec, setProgress);
      const ext = trimmed.type.includes("mp4") ? "mp4" : "webm";
      const url = await uploadVideoBlob(trimmed, uploadFilename.replace(/\.\w+$/, `.${ext}`));
      onComplete(url);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상 처리에 실패했습니다.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            영상 편집
          </DialogTitle>
          <DialogDescription>재생 구간을 조절한 뒤 업로드하세요.</DialogDescription>
        </DialogHeader>

        <div className="bg-black">
          <video ref={videoRef} className="w-full max-h-[40vh] object-contain" playsInline controls />
        </div>

        <div className="px-6 py-4 space-y-4 border-t">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>시작 {startSec.toFixed(1)}초</span>
              <span>길이 {clipLen.toFixed(1)}초 / 전체 {duration.toFixed(1)}초</span>
              <span>끝 {endSec.toFixed(1)}초</span>
            </div>
            <label className="text-xs font-medium">시작 지점</label>
            <input
              type="range"
              min={0}
              max={Math.max(0, duration - 0.5)}
              step={0.1}
              value={startSec}
              disabled={busy || !duration}
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
              max={duration || 1}
              step={0.1}
              value={endSec}
              disabled={busy || !duration}
              onChange={(e) => {
                const v = Number(e.target.value);
                setEndSec(v);
                if (startSec >= v - 0.3) setStartSec(Math.max(0, v - 1));
              }}
              className="w-full accent-primary"
            />
          </div>

          <Button type="button" variant="outline" className="w-full rounded-xl" onClick={playPreview} disabled={busy}>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={busy}>
              취소
            </Button>
            <Button type="button" className="rounded-xl" onClick={apply} disabled={busy || !videoBlob}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  업로드 중…
                </>
              ) : (
                "적용 · 업로드"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
