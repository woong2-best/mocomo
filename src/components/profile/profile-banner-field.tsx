"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useRef, useState } from "react";
import { Film, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageEditorDialog } from "@/components/media/editor/image-editor-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
import { uploadVideoBlob } from "@/lib/client-upload";
import { isGalleryVideoFile, normalizeGalleryVideoFile } from "@/lib/gallery-video-upload";
import {
  MAX_PROFILE_BANNER_VIDEO_DURATION_SEC,
  BANNER_VIDEO_FORMAT_HINT,
  bannerVideoMimeWarning,
  probeVideoDurationSec,
  prepareBannerVideoForUpload,
  profileBannerHasVideo,
  profileBannerVideoTooLong,
} from "@/lib/profile-banner";
import { ProfileBannerMedia } from "@/components/profile/profile-banner-media";
import { cn } from "@/lib/utils";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

type Props = {
  bannerUrl: string;
  bannerVideoUrl: string;
  onBannerUrlChange: (url: string) => void;
  onBannerVideoUrlChange: (url: string) => void;
  previewClassName?: string;
};

export function ProfileBannerField({
  bannerUrl,
  bannerVideoUrl,
  onBannerUrlChange,
  onBannerVideoUrlChange,
  previewClassName,
}: Props) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState("");

  async function onImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const allowed = IMAGE_ACCEPT.split(",");
    if (!allowed.includes(file.type)) return;
    setError("");
    setPicking(true);
    try {
      const src = await readFileAsObjectUrl(file);
      setCropSrc(src);
      setCropOpen(true);
    } finally {
      setPicking(false);
    }
  }

  async function onVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    if (!isGalleryVideoFile(raw)) {
      setError(t("profile.s3hqp0n"));
      return;
    }
    setError("");
    setUploadingVideo(true);
    try {
      const file = normalizeGalleryVideoFile(raw);
      const mimeWarning = bannerVideoMimeWarning(file.type, file.name);
      if (mimeWarning) {
        setError(mimeWarning);
        return;
      }
      const duration = await probeVideoDurationSec(file);
      if (duration <= 0) {
        setError(t("lib.profile.banner.sc3e2d98af1"));
        return;
      }
      if (profileBannerVideoTooLong(duration)) {
        setError(`배너 동Video은 ${MAX_PROFILE_BANNER_VIDEO_DURATION_SEC}초 이하여야 합니다.`);
        return;
      }
      const prepared = await prepareBannerVideoForUpload(file);
      const url = await uploadVideoBlob(prepared, prepared.name);
      onBannerVideoUrlChange(url);
      onBannerUrlChange("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.s1eazbik"));
    } finally {
      setUploadingVideo(false);
    }
  }

  function clearBanner() {
    onBannerUrlChange("");
    onBannerVideoUrlChange("");
    setError("");
  }

  const hasMedia = Boolean(bannerUrl || profileBannerHasVideo(bannerVideoUrl));

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{t("profile.s1ytpxdw")}</label>

      <div
        className={cn(
          "relative h-32 sm:h-36 rounded-xl overflow-hidden border border-border",
          previewClassName
        )}
      >
        <ProfileBannerMedia bannerUrl={bannerUrl} bannerVideoUrl={bannerVideoUrl} active />
      </div>

      <p className="text-xs text-muted-foreground">
        마이페이지·왼쪽 메뉴 상단에 표시됩니다. 동Video은 무음 자동 재생, 최대{" "}
        {MAX_PROFILE_BANNER_VIDEO_DURATION_SEC}초.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          disabled={picking}
          onClick={() => imageRef.current?.click()}
        >
          {picking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          사진 올리기
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          disabled={uploadingVideo}
          onClick={() => videoRef.current?.click()}
        >
          {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
          동Video 올리기
        </Button>
        {hasMedia ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={clearBanner}
          >
            제거
          </Button>
        ) : null}
      </div>

      <input ref={imageRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={onImageFileChange} />
      <input ref={videoRef} type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={onVideoFileChange} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {cropSrc ? (
        <ImageEditorDialog
          open={cropOpen}
          onOpenChange={(o) => {
            setCropOpen(o);
            if (!o) setCropSrc(null);
          }}
          imageSrc={cropSrc}
          aspect={3}
          lockAspect
          title={t("profile.s1qwzipw")}
          description={t("profile.3_1")}
          maxWidth={1500}
          maxHeight={500}
          uploadFilename="profile-banner.jpg"
          onComplete={(url) => {
            onBannerUrlChange(url);
            onBannerVideoUrlChange("");
            setCropSrc(null);
          }}
        />
      ) : null}
    </div>
  );
}
