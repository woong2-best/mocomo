"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
      setError(e instanceof Error ? e.message : t("avatar.s5tiqr9"));
    } finally {
      setLoading(false);
    }
  }

  async function registerUpload() {
    if (!pending) {
      setError(t("avatar.png_jpg"));
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
      setError(e instanceof Error ? e.message : t("coupon.skg4s7s"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("avatar.medibang_clip_studio")} <strong className="text-foreground">{t("avatar.png_2")}</strong>{t("avatar.2d_jpg_png")}
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
          <img src={preview} alt={t("support.sohlxtc")} className="max-h-64 max-w-full object-contain" />
        </div>
      )}

      <Button type="button" className="w-full rounded-xl" disabled={loading || !pending} onClick={() => void registerUpload()}>
        {t("avatar.s2246wp")}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
