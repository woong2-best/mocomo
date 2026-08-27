"use client";

import { useId, useRef, useState, useEffect, useCallback } from "react";
import { Camera, Gamepad2, ImagePlus, Loader2, Mic, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCaptureDialog } from "@/components/media/camera-capture-dialog";
import { toAbsoluteUploadUrl, uploadAudioBlob, uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import type { ChatAttachmentInput } from "@/lib/chat-attachments";
import { cn } from "@/lib/utils";
import { useActivityOptional } from "@/components/activities/activity-provider";

const MAX_VOICE_SEC = 120;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";

function pickVoiceMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

type ChatMediaComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSendText: () => void;
  onSendAttachments: (attachments: ChatAttachmentInput[], caption?: string) => Promise<void>;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatMediaComposer({
  value,
  onChange,
  onSendText,
  onSendAttachments,
  disabled,
  inputRef,
}: ChatMediaComposerProps) {
  const activity = useActivityOptional();
  const galleryInputId = useId();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendVoiceRef = useRef(true);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);

  const stopMicStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopMicStream();
    };
  }, [stopMicStream]);

  async function uploadAndSendImage(blob: Blob, filename: string) {
    setUploading(true);
    setError("");
    try {
      const file =
        blob.type.startsWith("image/") && blob.type !== "image/heic"
          ? new File([blob], filename, { type: blob.type })
          : await fileToUploadableJpeg(new File([blob], filename, { type: blob.type || "image/jpeg" }));
      const url = toAbsoluteUploadUrl(await uploadImageBlob(file, file.name));
      const caption = value.trim() || undefined;
      if (caption) onChange("");
      await onSendAttachments([{ url, type: "IMAGE", name: file.name }], caption);
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 전송에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function onCameraCapture(blob: Blob, mimeType: string) {
    const name = mimeType.includes("png") ? "dm-photo.png" : "dm-photo.jpg";
    void uploadAndSendImage(blob, name);
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isGalleryImageFile(file, true)) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const prepared = await fileToUploadableJpeg(file);
      const url = toAbsoluteUploadUrl(await uploadImageBlob(prepared, prepared.name));
      const caption = value.trim() || undefined;
      if (caption) onChange("");
      await onSendAttachments([{ url, type: "IMAGE", name: prepared.name }], caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 전송에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function stopRecording(send: boolean) {
    sendVoiceRef.current = send;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec?.state === "recording") {
      rec.stop();
    } else {
      setRecording(false);
      setRecordSec(0);
      stopMicStream();
      chunksRef.current = [];
    }
    if (!send) {
      chunksRef.current = [];
    }
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickVoiceMime();
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stopMicStream();
        setRecording(false);
        setRecordSec(0);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        if (!sendVoiceRef.current) return;
        if (blob.size < 800) {
          setError("녹음이 너무 짧습니다.");
          return;
        }
        setUploading(true);
        try {
          const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
          const url = toAbsoluteUploadUrl(await uploadAudioBlob(blob, `voice.${ext}`));
          const caption = value.trim() || undefined;
          if (caption) onChange("");
          await onSendAttachments([{ url, type: "AUDIO", name: `voice.${ext}` }], caption);
        } catch (err) {
          setError(err instanceof Error ? err.message : "음성 전송에 실패했습니다.");
        } finally {
          setUploading(false);
        }
      };
      recorder.start(200);
      setRecording(true);
      setRecordSec(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSec((s) => {
          if (s + 1 >= MAX_VOICE_SEC) {
            stopRecording(true);
            return MAX_VOICE_SEC;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") {
        setError("마이크 권한을 허용해 주세요.");
      } else {
        setError("음성 녹음을 시작할 수 없습니다.");
      }
      stopMicStream();
    }
  }

  function toggleRecording() {
    if (uploading || disabled) return;
    if (recording) {
      stopRecording(true);
    } else {
      void startRecording();
    }
  }

  const canSendText = !!value.trim() && !uploading && !recording && !disabled;

  return (
    <div className="shrink-0 bg-background px-2 py-2 sm:px-3 pb-safe">
      {recording && (
        <div className="flex items-center justify-center gap-3 mb-2 py-2 rounded-xl bg-folk-terracotta/10 border border-folk-terracotta/20">
          <span className="h-2 w-2 rounded-full bg-folk-terracotta animate-pulse" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300 tabular-nums">
            녹음 중 {recordSec}s / {MAX_VOICE_SEC}s
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-xs"
            onClick={() => stopRecording(false)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs bg-folk-terracotta hover:bg-red-700"
            onClick={() => stopRecording(true)}
          >
            보내기
          </Button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-destructive text-center px-2 mb-1">{error}</p>
      )}

      <div className="flex items-end gap-1.5 max-w-3xl mx-auto">
        <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground"
            disabled={disabled || uploading || recording}
            onClick={() => setCameraOpen(true)}
            aria-label="사진 찍기"
          >
            <Camera className="h-5 w-5" />
          </Button>
          {activity && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground"
              disabled={disabled || uploading || recording}
              onClick={activity.openPicker}
              aria-label="게임 함께하기"
              title="Play Together"
            >
              <Gamepad2 className="h-5 w-5" />
            </Button>
          )}
          <label
            htmlFor={galleryInputId}
            aria-label="갤러리에서 사진"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground cursor-pointer hover:bg-muted/60 transition-colors",
              (disabled || uploading || recording) && "pointer-events-none opacity-50"
            )}
          >
            <ImagePlus className="h-5 w-5" />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full",
              recording ? "text-folk-terracotta bg-folk-terracotta/15" : "text-muted-foreground"
            )}
            disabled={disabled || uploading}
            onClick={toggleRecording}
            aria-label={recording ? "녹음 종료" : "음성 메시지"}
          >
            {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex-1 flex items-center min-h-[44px] rounded-3xl border border-border/80 bg-muted/40 px-4 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-shadow">
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              전송 중…
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="메시지를 입력하세요"
              rows={1}
              disabled={disabled || recording}
              className="flex-1 resize-none bg-transparent text-sm leading-snug outline-none placeholder:text-muted-foreground max-h-28 min-h-[24px] py-0.5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSendText) onSendText();
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
              }}
            />
          )}
        </div>

        <Button
          type="button"
          size="icon"
          className={cn(
            "h-11 w-11 rounded-full shrink-0 shadow-sm mb-0.5",
            canSendText ? "bg-folk-terracotta text-white hover:bg-folk-terracotta-dark" : "bg-muted text-muted-foreground"
          )}
          onClick={onSendText}
          disabled={!canSendText}
          aria-label="보내기"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <input
        id={galleryInputId}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        disabled={disabled || uploading || recording}
        onChange={onGalleryPick}
      />

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode="photo"
        enableFaceFilter={false}
        onCapture={onCameraCapture}
      />

    </div>
  );
}
