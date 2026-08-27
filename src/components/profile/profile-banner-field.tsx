"use client";

import { useRef, useState } from "react";
import { Film, ImagePlus, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageEditorDialog } from "@/components/media/editor/image-editor-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
import { uploadVideoBlob } from "@/lib/client-upload";
import { isGalleryVideoFile, normalizeGalleryVideoFile } from "@/lib/gallery-video-upload";
import {
  MAX_PROFILE_BANNER_VIDEO_DURATION_SEC,
  bannerVideoMimeWarning,
  probeVideoDurationSec,
  probeVideoPlayable,
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
  const [showUrl, setShowUrl] = useState(false);
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
      setError("지원하지 않는 영상 형식입니다.");
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
        setError("영상 길이를 확인할 수 없습니다.");
        return;
      }
      if (profileBannerVideoTooLong(duration)) {
        setError(`배너 동영상은 ${MAX_PROFILE_BANNER_VIDEO_DURATION_SEC}초 이하여야 합니다.`);
        return;
      }
      const playable = await probeVideoPlayable(file);
      if (!playable) {
        setError("이 브라우저에서 재생할 수 없는 영상입니다. MP4(H.264)로 변환 후 올려 주세요.");
        return;
      }
      const url = await uploadVideoBlob(file, file.name);
      onBannerVideoUrlChange(url);
      onBannerUrlChange("");
    } catch {
      setError("영상 업로드에 실패했습니다.");
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
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">배너 (사진 또는 동영상)</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-8 rounded-lg"
          onClick={() => setShowUrl((v) => !v)}
        >
          <Link2 className="h-3.5 w-3.5 mr-1" />
          {showUrl ? "URL 숨기기" : "URL로 입력"}
        </Button>
      </div>

      <div
        className={cn(
          "relative h-32 sm:h-36 rounded-xl overflow-hidden border border-border",
          previewClassName
        )}
      >
        <ProfileBannerMedia bannerUrl={bannerUrl} bannerVideoUrl={bannerVideoUrl} active />
      </div>

      <p className="text-xs text-muted-foreground">
        마이페이지·왼쪽 메뉴 상단에 표시됩니다. 동영상은 무음 자동 재생, 최대{" "}
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
          동영상 올리기
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

      {showUrl ? (
        <div className="space-y-2">
          <Input
            type="url"
            value={bannerUrl}
            onChange={(e) => {
              onBannerUrlChange(e.target.value);
              if (e.target.value) onBannerVideoUrlChange("");
            }}
            placeholder="배너 이미지 URL (https://...)"
            className="rounded-xl text-sm"
          />
          <Input
            type="url"
            value={bannerVideoUrl}
            onChange={(e) => {
              onBannerVideoUrlChange(e.target.value);
              if (e.target.value) onBannerUrlChange("");
            }}
            placeholder="배너 동영상 URL (https://...)"
            className="rounded-xl text-sm"
          />
        </div>
      ) : null}

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
          title="배너 자르기"
          description="가로 3:1 영역에 맞게 드래그·확대·회전·뒤집기 후 적용하세요."
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
