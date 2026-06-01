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
import { Camera, FlipHorizontal, Loader2, Square, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_RECORD_SEC = 60;

export type CameraCaptureMode = "photo" | "video";

type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CameraCaptureMode;
  onCapture: (blob: Blob, mimeType: string) => void;
};

function pickRecorderMime(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

export function CameraCaptureDialog({
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

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
    startCamera();
    return () => stopStream();
  }, [open, startCamera, stopStream]);

  function capturePhoto() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setError("카메라 준비 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("사진 저장에 실패했습니다.");
          return;
        }
        onCapture(blob, "image/jpeg");
        onOpenChange(false);
      },
      "image/jpeg",
      0.92
    );
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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{mode === "photo" ? "사진 찍기" : "영상 촬영"}</DialogTitle>
          <DialogDescription>
            {mode === "photo"
              ? "촬영 후 앱에서 자르기·회전할 수 있습니다."
              : `최대 ${MAX_RECORD_SEC}초까지 녹화할 수 있습니다.`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] max-h-[55vh] bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          {mode === "video" && recording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-medium text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              REC {recordSec}s
            </div>
          )}
        </div>

        {error && <p className="px-6 text-sm text-destructive">{error}</p>}

        <div className="px-6 py-4 flex items-center justify-between gap-2 border-t">
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
              className="rounded-xl flex-1 gap-2"
              onClick={capturePhoto}
              disabled={starting}
            >
              <Camera className="h-4 w-4" />
              촬영
            </Button>
          ) : recording ? (
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl flex-1 gap-2"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 fill-current" />
              녹화 종료
            </Button>
          ) : (
            <Button
              type="button"
              className={cn("rounded-xl flex-1 gap-2")}
              onClick={startRecording}
              disabled={starting}
            >
              <Video className="h-4 w-4" />
              녹화 시작
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="rounded-xl shrink-0"
            onClick={() => onOpenChange(false)}
            disabled={recording}
          >
            취소
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
