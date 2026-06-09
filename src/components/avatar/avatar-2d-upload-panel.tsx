"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileToPngBlob, registerFlat2dAvatar } from "@/lib/avatar-2d/register-avatar";

export function Avatar2dUploadPanel({ onRegistered }: { onRegistered?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState<{ blob: Blob; w: number; h: number } | null>(null);

  async function onFile(file: File) {
    setLoading(true);
    setError("");
    try {
      const blob = await fileToPngBlob(file);
      const url = URL.createObjectURL(blob);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      const bitmap = await createImageBitmap(blob);
      setPending({ blob, w: bitmap.width, h: bitmap.height });
      bitmap.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 처리 실패");
    } finally {
      setLoading(false);
    }
  }

  async function registerUpload() {
    if (!pending) {
      setError("먼저 PNG·JPG 파일을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registerFlat2dAvatar(pending.blob, {
        width: pending.w,
        height: pending.h,
        source: "upload",
      });
      onRegistered?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        MediBang·Clip Studio 등에서 그린 <strong className="text-foreground">투명 PNG</strong>를 올리면 2D
        방송 아바타로 등록됩니다. JPG도 PNG로 변환해 저장합니다.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.psd"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        className="rounded-xl gap-2"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        파일 선택 (PNG · JPG · WebP)
      </Button>

      {preview && (
        <div
          className="rounded-xl border border-border p-4 bg-[length:16px_16px] bg-[position:0_0,8px_8px] flex justify-center"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="미리보기" className="max-h-64 max-w-full object-contain" />
        </div>
      )}

      <Button type="button" className="w-full rounded-xl" disabled={loading || !pending} onClick={() => void registerUpload()}>
        2D 아바타로 등록 · 방송 적용
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
