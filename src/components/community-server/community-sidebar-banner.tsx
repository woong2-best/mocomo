"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { updateCommunity } from "@/actions/community-hub";
import { ProfileBannerMedia } from "@/components/profile/profile-banner-media";
import { ImageEditorDialog } from "@/components/media/editor/image-editor-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
import { uploadVideoBlob } from "@/lib/client-upload";
import { isGalleryVideoFile, normalizeGalleryVideoFile } from "@/lib/gallery-video-upload";
import {
  MAX_PROFILE_BANNER_VIDEO_DURATION_SEC,
  probeVideoDurationSec,
  profileBannerHasVideo,
  profileBannerImageUrl,
} from "@/lib/profile-banner";
import { hasPermission } from "@/lib/community-server/permissions";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

type Props = {
  communityId: string;
  bannerUrl: string | null;
  bannerVideoUrl: string | null;
};

export function CommunitySidebarBanner({ communityId, bannerUrl, bannerVideoUrl }: Props) {
  const router = useRouter();
  const { isOwner, permissions } = useCommunityMembership();
  const canEdit =
    isOwner ||
    hasPermission(permissions, "editBanner") ||
    hasPermission(permissions, "manageServer");

  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [error, setError] = useState("");

  const hasMedia = Boolean(
    profileBannerImageUrl(bannerUrl, bannerVideoUrl) || profileBannerHasVideo(bannerVideoUrl)
  );

  async function persist(next: { bannerUrl?: string; bannerVideoUrl?: string }) {
    setSaving(true);
    setError("");
    const res = await updateCommunity(communityId, next);
    if ("error" in res && res.error) {
      setError(res.error);
      setSaving(false);
      return false;
    }
    router.refresh();
    setSaving(false);
    setEditing(false);
    return true;
  }

  async function onImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPickingImage(true);
    try {
      const src = await readFileAsObjectUrl(file);
      setCropSrc(src);
      setCropOpen(true);
    } finally {
      setPickingImage(false);
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
    setUploadingVideo(true);
    setError("");
    try {
      const file = normalizeGalleryVideoFile(raw);
      const duration = await probeVideoDurationSec(file);
      if (duration <= 0) {
        setError("영상 길이를 확인할 수 없습니다.");
        return;
      }
      if (duration > MAX_PROFILE_BANNER_VIDEO_DURATION_SEC + 0.25) {
        setError(`배너 동영상은 ${MAX_PROFILE_BANNER_VIDEO_DURATION_SEC}초 이하여야 합니다.`);
        return;
      }
      const url = await uploadVideoBlob(file, file.name);
      await persist({ bannerVideoUrl: url, bannerUrl: "" });
    } catch {
      setError("영상 업로드에 실패했습니다.");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function removeBanner() {
    await persist({ bannerUrl: "", bannerVideoUrl: "" });
  }

  function openEditor() {
    setError("");
    setEditing(true);
  }

  if (!hasMedia && !canEdit) return null;

  return (
    <div className="hidden sm:block shrink-0 px-2 pb-2 pt-0">
      <div
        className={cn(
          "relative overflow-hidden rounded-md",
          hasMedia ? "aspect-[2/1] border border-border/50 bg-muted/30" : "min-h-[4.75rem]"
        )}
      >
        {hasMedia ? (
          <ProfileBannerMedia bannerUrl={bannerUrl} bannerVideoUrl={bannerVideoUrl} active />
        ) : (
          <button
            type="button"
            onClick={openEditor}
            className={cn(
              "flex w-full min-h-[4.75rem] flex-col items-center justify-center gap-1.5",
              "rounded-md border border-dashed border-muted-foreground/35 bg-muted/20",
              "text-muted-foreground transition-colors hover:border-muted-foreground/55 hover:bg-muted/35"
            )}
            aria-label="배너 추가"
          >
            <Plus className="h-5 w-5 text-muted-foreground/70" strokeWidth={2} />
            <span className="text-[11px] font-medium text-muted-foreground/80">배너 추가</span>
          </button>
        )}

        {canEdit && hasMedia && !editing && (
          <button
            type="button"
            onClick={openEditor}
            className="absolute inset-0 flex items-end justify-end bg-black/0 p-1.5 opacity-0 transition-opacity hover:bg-black/25 hover:opacity-100 focus-visible:opacity-100"
            aria-label="배너 편집"
          >
            <span className="inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] font-medium shadow-sm">
              <ImagePlus className="h-3 w-3" />
              편집
            </span>
          </button>
        )}

        {canEdit && editing && (
          <div className="absolute inset-0 flex flex-col justify-end gap-1.5 bg-background/95 p-2 backdrop-blur-sm">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 flex-1 rounded-md px-2 text-[10px]"
                disabled={pickingImage || saving}
                onClick={() => imageRef.current?.click()}
              >
                {pickingImage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="mr-1 h-3 w-3" />
                    사진
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 flex-1 rounded-md px-2 text-[10px]"
                disabled={uploadingVideo || saving}
                onClick={() => videoRef.current?.click()}
              >
                {uploadingVideo ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Film className="mr-1 h-3 w-3" />
                    영상
                  </>
                )}
              </Button>
              {hasMedia ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-md px-2 text-[10px]"
                  disabled={saving}
                  onClick={() => void removeBanner()}
                >
                  제거
                </Button>
              ) : null}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              영상은 무음 자동 재생 · 최대 {MAX_PROFILE_BANNER_VIDEO_DURATION_SEC}초
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-6 w-6 rounded-md p-0"
              onClick={() => setEditing(false)}
              aria-label="닫기"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {error ? <p className="mt-1 text-[10px] text-destructive">{error}</p> : null}

      <input
        ref={imageRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={onImageFileChange}
      />
      <input
        ref={videoRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={onVideoFileChange}
      />

      {cropSrc ? (
        <ImageEditorDialog
          open={cropOpen}
          onOpenChange={(o) => {
            setCropOpen(o);
            if (!o) setCropSrc(null);
          }}
          imageSrc={cropSrc}
          aspect={2}
          lockAspect
          title="사이드바 배너 자르기"
          description="2:1 비율에 맞게 조정한 뒤 적용하세요."
          maxWidth={800}
          maxHeight={400}
          uploadFilename="community-sidebar-banner.jpg"
          onComplete={async (url) => {
            setCropSrc(null);
            await persist({ bannerUrl: url, bannerVideoUrl: "" });
          }}
        />
      ) : null}
    </div>
  );
}
