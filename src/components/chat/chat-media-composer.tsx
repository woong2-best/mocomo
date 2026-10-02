"use client";

import { useId, useRef, useState, useEffect, useCallback } from "react";
import { Camera, ImagePlus, Loader2, Mic, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCaptureDialog } from "@/components/media/camera-capture-dialog";
import { toAbsoluteUploadUrl, uploadAudioBlob, uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import type { ChatAttachmentInput } from "@/lib/chat-attachments";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

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
  const { t } = useLocale();
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
      setError(
        e instanceof Error ? e.message : t("ui.couldn_t_send_photo")
      );
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
      setError(t("ui.choose_an_image_file"));
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
      setError(
        err instanceof Error ? err.message : t("ui.couldn_t_send_photo")
      );
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
          setError(t("ui.recording_too_short"));
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
          setError(
            err instanceof Error ? err.message : t("ui.couldn_t_send_voice_message")
          );
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
        setError(t("ui.allow_microphone_access"));
      } else {
        setError(t("ui.couldn_t_start_voice_recording"));
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
            <span>
              {t("chat.recordingProgress", {
                current: String(recordSec),
                max: String(MAX_VOICE_SEC),
              })}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-xs"
            onClick={() => stopRecording(false)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t("calendar.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs bg-folk-terracotta hover:bg-red-700"
            onClick={() => stopRecording(true)}
          >
            {t("ui.send")}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-destructive text-center px-2 mb-1">{error}</p>
      )}

      <div className="flex items-end gap-1.5 max-w-3xl mx-auto">
        <div className="flex flex-col items-center gap-0.5 shrink-0 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground"
            disabled={disabled || uploading || recording}
            onClick={() => setCameraOpen(true)}
            aria-label={t("ui.take_photo")}
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
          <label
            htmlFor={galleryInputId}
            aria-label={t("ui.photo_from_gallery")}
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
            aria-label={
              recording
                ? t("ui.stop_recording")
                : t("ui.voice_message")
            }
          >
            {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex-1 flex items-center min-h-[44px] rounded-3xl border border-border/80 bg-muted/40 px-4 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-shadow">
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("ui.sending")}
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t("ui.write_a_message")}
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
          aria-label={t("ui.send")}
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
