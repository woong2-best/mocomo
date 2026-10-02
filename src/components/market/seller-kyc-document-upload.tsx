"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadSellerKycDocument } from "@/lib/marketplace/kyc-client-upload";

export type SellerKycDocumentUploadValue = {
  documentKey: string | null;
  previewUrl: string | null;
};

type Props = {
  value: SellerKycDocumentUploadValue;
  onChange: (value: SellerKycDocumentUploadValue) => void;
  disabled?: boolean;
  idType: string;
};

export function SellerKycDocumentUpload({ value, onChange, disabled, idType }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (value.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(value.previewUrl);
      }
    };
  }, [value.previewUrl]);

  async function onFileSelected(file: File) {
    setError("");
    setUploading(true);

    const previewUrl = URL.createObjectURL(file);
    onChange({ documentKey: null, previewUrl });

    const res = await uploadSellerKycDocument(file);
    setUploading(false);

    if ("error" in res) {
      setError(errorText(res.error));
      onChange({ documentKey: null, previewUrl: null });
      URL.revokeObjectURL(previewUrl);
      return;
    }

    onChange({ documentKey: res.documentKey, previewUrl });
  }

  function clearDocument() {
    if (value.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onChange({ documentKey: null, previewUrl: null });
    setError("");
  }

  const maskHint =
    idType === "NATIONAL_ID"
      ? t("market.sbvgjd")
      : idType === "RESIDENT_CARD"
        ? t("market.sq0l31w")
        : t("market.s10y8nss");

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <ImagePlus className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("market.sninpun")}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {t("market.kycUploadHint", { maskHint })}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFileSelected(file);
          e.target.value = "";
        }}
      />

      {value.previewUrl ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.previewUrl}
              alt={t("market.scmj2yf")}
              className="max-h-48 w-full object-contain bg-black/5"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {t("market.sv2rkft")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={clearDocument}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("toast.delete")}
            </Button>
            {value.documentKey && !uploading && (
              <span className="text-xs text-emerald-700 self-center">{t("market.s1vglegz")}</span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm transition-colors",
            disabled || uploading
              ? "opacity-60 cursor-not-allowed"
              : "hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="font-medium">{t("market.ss6rts4")}</span>
          <span className="text-xs text-muted-foreground">{t("market.jpeg_png_webp_10mb")}</span>
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
