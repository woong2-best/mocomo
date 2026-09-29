"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, ImagePlus, Link2, Loader2 } from "lucide-react";
import { WikiContent, WIKI_EDITOR_HELP } from "@/components/anime/wiki-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepareGalleryImageForUpload } from "@/lib/gallery-image-upload";
import { uploadImageBlob } from "@/lib/client-upload";
import { extractYoutubeId } from "@/lib/anime-revision";

export function AnimeWikiField({
  name,
  label,
  defaultValue = "",
  rows = 8,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [videoUrl, setVideoUrl] = useState("");
  const [preview, setPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  async function insertImage(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const prepared = await prepareGalleryImageForUpload(file);
      const url = await uploadImageBlob(prepared, prepared.name || "wiki.webp");
      const insert = `\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`;
      setValue((v) => v + insert);
    } catch {
      setUploadError("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function insertVideoLink() {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setUploadError("영상 링크를 붙여넣어 주세요.");
      return;
    }
    if (!extractYoutubeId(trimmed)) {
      setUploadError("유튜브 링크를 붙여넣어 주세요.");
      return;
    }
    setValue((v) => `${v.trim() ? `${v.trim()}\n\n` : ""}${trimmed}\n\n`);
    setVideoUrl("");
    setUploadError("");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-1">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void insertImage(f);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-lg" asChild>
              <span>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                사진 업로드
              </span>
            </Button>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-lg"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? "미리보기 끄기" : "미리보기"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="url"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            setUploadError("");
          }}
          placeholder="영상 링크 붙여넣기 (유튜브)"
          className="rounded-xl h-8 max-w-md text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-lg"
          onClick={insertVideoLink}
        >
          <Link2 className="h-3.5 w-3.5" />
          본문에 넣기
        </Button>
      </div>
      {uploadError ? (
        <p className="text-xs text-destructive" role="alert">
          {uploadError}
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground leading-snug">{WIKI_EDITOR_HELP}</p>
      <div className={preview ? "grid gap-3 lg:grid-cols-2" : ""}>
        <textarea
          ref={ref}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed resize-y min-h-[160px]"
        />
        {preview && (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 min-h-[160px] overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">실시간 미리보기</p>
            {value.trim() ? (
              <WikiContent source={value} />
            ) : (
              <p className="text-xs text-muted-foreground">내용을 입력하면 미리보기가 표시됩니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
