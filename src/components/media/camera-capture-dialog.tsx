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
import { FaceFilterStrip } from "@/components/media/face-filter-strip";
import { useFaceFilterPipeline } from "@/hooks/use-face-filter-pipeline";
import { Camera, FlipHorizontal, Loader2, Square, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_RECORD_SEC = 60;

export type CameraCaptureMode = "photo" | "video";

export type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CameraCaptureMode;
  onCapture: (blob: Blob, mimeType: string) => void;
  /** 라이브·게시물·영상 촬영용. 중고거래 등 상품 사진은 false */
  enableFaceFilter?: boolean;
};

function pickRecorderMime(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.reject(new Error("카메라가 준비되지 않았습니다."));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D not supported"));
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("사진 저장에 실패했습니다."))),
      "image/jpeg",
      0.92
    );
  });
}

/** 중고거래 등 — 필터·MediaPipe 없이 원본 카메라만 */
function PlainCameraCaptureDialog({
  open,
  onOpenChange,
  mode,
  onCapture,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [error, setError] = useState("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setStarting(true);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video",
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") {
        setError("카메라·마이크 권한을 허용해 주세요.");
      } else {
        setError("카메라를 시작할 수 없습니다. 다른 앱이 사용 중인지 확인해 주세요.");
      }
    } finally {
      setStarting(false);
    }
  }, [facingMode, mode, stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setRecording(false);
      setRecordSec(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      return;
    }
    void startCamera();
    return () => stopStream();
  }, [open, facingMode, startCamera, stopStream]);

  async function handleCapturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const blob = await captureVideoFrame(video);
      onCapture(blob, "image/jpeg");
      onOpenChange(false);
    } catch {
      setError("사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickRecorderMime();
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 0) onCapture(blob, mimeType);
      onOpenChange(false);
      setRecording(false);
      setRecordSec(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
    recorder.start(250);
    setRecording(true);
    setRecordSec(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSec((s) => {
        if (s + 1 >= MAX_RECORD_SEC) {
          stopRecording();
          return MAX_RECORD_SEC;
        }
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layer="stack"
        className="max-w-lg p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col"
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{mode === "photo" ? "사진 찍기" : "영상 촬영"}</DialogTitle>
          <DialogDescription>
            {mode === "photo"
              ? "상품 사진을 촬영하세요. (얼굴 필터 없음)"
              : "영상을 촬영하세요."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] max-h-[38vh] sm:max-h-[42vh] bg-black shrink-0">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          {mode === "video" && recording && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-folk-terracotta/90 px-3 py-1 text-xs font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              REC {recordSec}s
            </div>
          )}
        </div>

        <div className="px-4 py-4 flex items-center justify-between gap-2 border-t border-border bg-background shrink-0 pb-safe">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
            disabled={starting || recording}
            aria-label="카메라 전환"
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>

          {mode === "photo" ? (
            <Button
              type="button"
              className="rounded-xl flex-1 gap-2 h-11"
              onClick={() => void handleCapturePhoto()}
              disabled={starting}
            >
              <Camera className="h-4 w-4" />
              촬영
            </Button>
          ) : recording ? (
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl flex-1 gap-2 h-11"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 fill-current" />
              녹화 종료
            </Button>
          ) : (
            <Button
              type="button"
              className={cn("rounded-xl flex-1 gap-2 h-11")}
              onClick={startRecording}
              disabled={starting}
            >
              <Video className="h-4 w-4" />
              녹화 시작
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="rounded-xl shrink-0 h-11 px-4"
            onClick={() => onOpenChange(false)}
            disabled={recording}
          >
            취소
          </Button>
        </div>

        {error && <p className="px-4 pb-3 text-sm text-destructive shrink-0">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

/** 라이브·게시물·영상 — 얼굴 필터 파이프라인 */
function FilteredCameraCaptureDialog({
  open,
  onOpenChange,
  mode,
  onCapture,
}: CameraCaptureDialogProps) {
  const previewHostRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    displayCanvas,
    filterId,
    setFilterId,
    attachRawStream,
    stop,
    getCompositeStream,
    capturePhoto,
  } = useFaceFilterPipeline("natural");

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    setError("");
    setStarting(true);
    await stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video",
      });
      await attachRawStream(stream, { mirrored: facingMode === "user" });
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") {
        setError("카메라·마이크 권한을 허용해 주세요.");
      } else {
        setError("카메라를 시작할 수 없습니다. 다른 앱이 사용 중인지 확인해 주세요.");
      }
    } finally {
      setStarting(false);
    }
  }, [facingMode, mode, stop, attachRawStream]);

  useEffect(() => {
    if (!open) {
      void stop();
      setRecording(false);
      setRecordSec(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      return;
    }
    void startCamera();
    return () => {
      void stop();
    };
  }, [open, facingMode, startCamera, stop]);

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host || !displayCanvas) return;
    host.innerHTML = "";
    displayCanvas.className = "w-full h-full object-cover";
    host.appendChild(displayCanvas);
    return () => {
      if (displayCanvas.parentElement === host) host.removeChild(displayCanvas);
    };
  }, [displayCanvas]);

  async function handleCapturePhoto() {
    try {
      const blob = await capturePhoto();
      onCapture(blob, "image/jpeg");
      onOpenChange(false);
    } catch {
      setError("사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  function startRecording() {
    const stream = getCompositeStream();
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickRecorderMime();
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 0) onCapture(blob, mimeType);
      onOpenChange(false);
      setRecording(false);
      setRecordSec(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
    recorder.start(250);
    setRecording(true);
    setRecordSec(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSec((s) => {
        if (s + 1 >= MAX_RECORD_SEC) {
          stopRecording();
          return MAX_RECORD_SEC;
        }
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layer="stack"
        className="max-w-lg p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col"
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{mode === "photo" ? "사진 찍기" : "영상 촬영"}</DialogTitle>
          <DialogDescription>
            인스타 스타일 얼굴 필터를 선택한 뒤 촬영하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] max-h-[38vh] sm:max-h-[42vh] bg-black shrink-0">
          <div ref={previewHostRef} className="absolute inset-0" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          {mode === "video" && recording && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-folk-terracotta/90 px-3 py-1 text-xs font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              REC {recordSec}s
            </div>
          )}
        </div>

        <div className="px-4 py-4 flex items-center justify-between gap-2 border-t border-border bg-background shrink-0 pb-safe">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0 h-11 w-11"
            onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
            disabled={starting || recording}
            aria-label="카메라 전환"
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>

          {mode === "photo" ? (
            <Button
              type="button"
              className="rounded-xl flex-1 gap-2 h-11"
              onClick={() => void handleCapturePhoto()}
              disabled={starting}
            >
              <Camera className="h-4 w-4" />
              촬영
            </Button>
          ) : recording ? (
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl flex-1 gap-2 h-11"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 fill-current" />
              녹화 종료
            </Button>
          ) : (
            <Button
              type="button"
              className={cn("rounded-xl flex-1 gap-2 h-11")}
              onClick={startRecording}
              disabled={starting}
            >
              <Video className="h-4 w-4" />
              녹화 시작
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="rounded-xl shrink-0 h-11 px-4"
            onClick={() => onOpenChange(false)}
            disabled={recording}
          >
            취소
          </Button>
        </div>

        <div className="px-4 py-2 border-t shrink-0">
          <FaceFilterStrip
            value={filterId}
            onChange={setFilterId}
            disabled={starting || recording}
            compact
          />
        </div>

        {error && <p className="px-4 pb-3 text-sm text-destructive shrink-0">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function CameraCaptureDialog({
  enableFaceFilter = true,
  ...props
}: CameraCaptureDialogProps) {
  if (enableFaceFilter) {
    return <FilteredCameraCaptureDialog {...props} />;
  }
  return <PlainCameraCaptureDialog {...props} />;
}
