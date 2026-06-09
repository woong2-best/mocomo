"use client";

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prepareGalleryImageForUpload } from "@/lib/gallery-image-upload";
import { uploadImageBlob } from "@/lib/client-upload";
import { cn } from "@/lib/utils";

export function AnimeImageUrlField({
  name,
  label,
  defaultValue = "",
  placeholder = "https://...",
  previewAspect = "square",
  uploadLabel = "갤러리·사진에서 업로드",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  previewAspect?: "square" | "banner";
  uploadLabel?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function onFilePick(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const prepared = await prepareGalleryImageForUpload(file);
      const uploaded = await uploadImageBlob(prepared, prepared.name || `${name}.webp`);
      setUrl(uploaded);
    } catch {
      setUploadError("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        name={name}
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setUploadError("");
        }}
        placeholder={placeholder}
        className="rounded-xl"
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*,.heic,.heif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFilePick(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {uploading ? "업로드 중…" : uploadLabel}
            </span>
          </Button>
        </label>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 rounded-xl text-muted-foreground"
            onClick={() => setUrl("")}
          >
            <X className="h-3.5 w-3.5" />
            제거
          </Button>
        )}
      </div>

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      {url && (
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/70 bg-muted/30",
            previewAspect === "banner" ? "aspect-[3/1] max-h-28" : "aspect-square max-w-[120px]"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}
