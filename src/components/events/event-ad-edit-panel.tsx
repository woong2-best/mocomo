"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { updateEventAdCreative } from "@/actions/events";
import { uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import {
  SPONSORED_AD_ASPECT,
  SPONSORED_AD_IMAGE_MAX_HEIGHT,
  SPONSORED_AD_IMAGE_MAX_WIDTH,
} from "@/lib/sponsored-ad/constants";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40";

export function EventAdEditPanel({
  eventId,
  initialImageUrl,
  initialLinkUrl,
  compact,
}: {
  eventId: string;
  initialImageUrl: string;
  initialLinkUrl: string;
  compact?: boolean;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [linkUrl, setLinkUrl] = useState(initialLinkUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isGalleryImageFile(file, true)) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }
    setError("");
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  }

  function closeCropDialog(open: boolean) {
    setCropOpen(open);
    if (!open && cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await updateEventAdCreative(eventId, { imageUrl, linkUrl });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
      {!compact && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">광고 수정</p>
          <p className="text-xs text-muted-foreground">
            이미지와 링크는 결제 기간 동안 언제든 변경할 수 있습니다.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">광고 이미지</label>
        <div className="flex flex-wrap gap-2">
          {imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="w-28 rounded-xl object-cover border border-border aspect-[4/5]"
              />
              <label className="absolute inset-0 cursor-pointer rounded-xl">
                <span className="sr-only">이미지 변경</span>
                <input type="file" accept="image/*" className="hidden" onChange={onImagePick} />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border border-border"
                onClick={() => setImageUrl("")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <label className="flex w-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border aspect-[4/5] hover:border-[#A855F7]/40">
              <span className="text-xs text-muted-foreground">이미지</span>
              <input type="file" accept="image/*" className="hidden" onChange={onImagePick} />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">클릭 시 이동 링크</label>
        <Input
          placeholder="https://"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className={fieldClass}
          type="url"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">저장되었습니다.</p>}

      <Button
        type="submit"
        variant="outline"
        className="w-full rounded-xl"
        disabled={saving || !imageUrl.trim() || !linkUrl.trim()}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중…
          </>
        ) : (
          "변경사항 저장"
        )}
      </Button>

      {cropSrc && (
        <ImageCropDialog
          open={cropOpen}
          onOpenChange={closeCropDialog}
          imageSrc={cropSrc}
          aspect={SPONSORED_AD_ASPECT}
          lockAspect
          objectFit="contain"
          showSponsorPreview
          title="광고 이미지"
          description="스폰서 슬롯(4:5) 비율로 맞춰 주세요. 전체 이미지가 보이도록 조절한 뒤 원하는 영역을 선택하세요."
          maxWidth={SPONSORED_AD_IMAGE_MAX_WIDTH}
          maxHeight={SPONSORED_AD_IMAGE_MAX_HEIGHT}
          uploadFilename="event-ad.jpg"
          onComplete={(url) => {
            setImageUrl(url);
            closeCropDialog(false);
          }}
        />
      )}
    </form>
  );
}
