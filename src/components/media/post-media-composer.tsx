"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  Film,
  ImagePlus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import { CameraCaptureDialog } from "@/components/media/camera-capture-dialog";
import { VideoEditDialog } from "@/components/media/video-edit-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
import { uploadImageBlob } from "@/lib/client-upload";
import {
  isGalleryImageFile,
  prepareGalleryImageForUpload,
} from "@/lib/gallery-image-upload";
import { normalizeGalleryVideoFile } from "@/lib/gallery-video-upload";
import { cn } from "@/lib/utils";

export type PostMediaItem = {
  url: string;
  type: "IMAGE" | "VIDEO";
};

type PostMediaComposerProps = {
  items: PostMediaItem[];
  onChange: (items: PostMediaItem[]) => void;
  maxImages?: number;
  maxVideos?: number;
  allowVideo?: boolean;
  /** false면 영상 촬영 버튼 숨김 */
  allowVideoCapture?: boolean;
  layout?: "default" | "toolbar";
  /** toolbar 레이아웃 하단 우측 (게시하기 등) */
  toolbarFooter?: ReactNode;
  /** toolbar 레이아웃 하단 좌측, 아이콘 옆 */
  toolbarFooterStart?: ReactNode;
  /** 중고거래: 자르기 없이 바로 업로드 (실패 줄임) */
  quickUpload?: boolean;
  /** false면 중고거래 등 — 얼굴 필터 없이 원본 카메라만 */
  enableFaceFilter?: boolean;
  disabled?: boolean;
  className?: string;
  onUploadingChange?: (busy: boolean) => void;
};

const IMAGE_ACCEPT = "image/*,.heic,.heif,image/heic,image/heif";

export function PostMediaComposer({
  items,
  onChange,
  maxImages = 4,
  maxVideos = 1,
  allowVideo = true,
  allowVideoCapture = false,
  layout = "default",
  toolbarFooter,
  toolbarFooterStart,
  quickUpload = false,
  enableFaceFilter = true,
  disabled = false,
  className,
  onUploadingChange,
}: PostMediaComposerProps) {
  const galleryInputId = useId();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const imageCount = items.filter((m) => m.type === "IMAGE").length;
  const videoCount = items.filter((m) => m.type === "VIDEO").length;
  const canAddImage = imageCount < maxImages;
  const canAddVideo = allowVideo && videoCount < maxVideos;

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFilename, setCropFilename] = useState("post-image.jpg");

  const [cameraOpen, setCameraOpen] = useState(false);

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoEditOpen, setVideoEditOpen] = useState(false);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem(item: PostMediaItem) {
    onChange([...items, item]);
  }

  async function openImageCrop(file: File | Blob, filename: string) {
    const src = await readFileAsObjectUrl(file instanceof File ? file : new File([file], filename));
    setCropFilename(filename);
    setCropSrc(src);
    setCropOpen(true);
  }

  async function uploadFilesDirect(files: File[]) {
    const baseItems = items;
    const previewUrls: string[] = [];
    const optimistic: PostMediaItem[] = files.map((f) => {
      const preview = URL.createObjectURL(f);
      previewUrls.push(preview);
      return { url: preview, type: "IMAGE" as const };
    });

    onChange([...baseItems, ...optimistic]);
    setUploading(true);
    onUploadingChange?.(true);
    setError("");

    let next = [...baseItems];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const imgCount = next.filter((m) => m.type === "IMAGE").length;
        if (imgCount >= maxImages) break;

        try {
          const prepared = await prepareGalleryImageForUpload(files[i]);
          const url = await uploadImageBlob(prepared, prepared.name || "photo.jpg");
          next = [...next, { url, type: "IMAGE" as const }];
          onChange(next);
        } catch (e) {
          errors.push(
            e instanceof Error ? e.message : `사진 ${i + 1} 업로드 실패`
          );
        } finally {
          URL.revokeObjectURL(previewUrls[i]);
        }
      }

      if (errors.length > 0) {
        onChange(next);
        setError(
          errors.length === files.length
            ? errors[0] ?? "사진 업로드에 실패했습니다."
            : `일부 사진만 올렸습니다. ${errors[0]}`
        );
      }
    } catch (e) {
      onChange(baseItems);
      setError(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function onCameraCapture(blob: Blob, mimeType: string) {
    if (!mimeType.startsWith("image/")) return;
    if (quickUpload) {
      const name = mimeType.includes("png") ? "camera.png" : "camera.jpg";
      void uploadFilesDirect([new File([blob], name, { type: mimeType || "image/jpeg" })]);
      return;
    }
    openImageCrop(blob, "camera-photo.jpg");
  }

  function openVideoEditor(file: File | Blob) {
    const normalized =
      file instanceof File ? normalizeGalleryVideoFile(file) : file;
    setVideoBlob(normalized);
    setVideoEditOpen(true);
  }

  async function onGalleryImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (!picked?.length) return;
    const list = Array.from(picked).filter((f) => isGalleryImageFile(f, true));
    e.target.value = "";
    setError("");
    const remaining = maxImages - imageCount;
    if (remaining <= 0) {
      setError(`사진은 최대 ${maxImages}장까지 추가할 수 있습니다.`);
      return;
    }
    if (list.length === 0) {
      setError("이미지 파일을 선택해 주세요. (jpg, png, webp, heic 등)");
      return;
    }
    await uploadFilesDirect(list.slice(0, remaining));
  }

  async function onCropComplete(url: string) {
    const nextImages = imageCount + 1;
    if (nextImages > maxImages) {
      setError(`사진은 최대 ${maxImages}장까지 추가할 수 있습니다.`);
      setPendingImageFiles([]);
      return;
    }
    onChange([...items, { url, type: "IMAGE" }]);
    setCropSrc(null);
    if (pendingImageFiles.length > 0 && nextImages < maxImages) {
      const [next, ...rest] = pendingImageFiles;
      setPendingImageFiles(rest);
      await openImageCrop(next, next.name);
    } else {
      setPendingImageFiles([]);
    }
  }

  function onVideoComplete(url: string) {
    addItem({ url, type: "VIDEO" });
    setVideoBlob(null);
  }

  async function reEditVideo(url: string, index: number) {
    setUploading(true);
    onUploadingChange?.(true);
    setError("");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      onChange(items.filter((_, i) => i !== index));
      openVideoEditor(blob);
    } catch {
      setError("영상을 다시 불러올 수 없습니다.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  async function reEditImage(url: string, index: number) {
    setUploading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const removeFirst = () => onChange(items.filter((_, i) => i !== index));
      removeFirst();
      await openImageCrop(blob, "post-image-edit.jpg");
    } catch {
      setError("이미지를 다시 불러올 수 없습니다.");
    } finally {
      setUploading(false);
    }
  }

  const iconBtnClass =
    "h-9 w-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40";

  const toolbarIcons = (
    <>
      {canAddImage && (
        <>
          <button
            type="button"
            className={iconBtnClass}
            disabled={disabled || uploading}
            onClick={() => galleryInputRef.current?.click()}
            aria-label="사진 선택"
            title="사진"
          >
            <ImagePlus className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            className={iconBtnClass}
            disabled={disabled || uploading}
            onClick={() => setCameraOpen(true)}
            aria-label="사진 촬영"
            title="카메라"
          >
            <Camera className="h-[18px] w-[18px]" />
          </button>
        </>
      )}
      {canAddVideo && (
        <button
          type="button"
          className={iconBtnClass}
          disabled={disabled || uploading}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "video/*";
            input.onchange = (ev) => {
              const file = (ev.target as HTMLInputElement).files?.[0];
              if (file) openVideoEditor(file);
            };
            input.click();
          }}
          aria-label="영상 파일"
          title="영상"
        >
          <Film className="h-[18px] w-[18px]" />
        </button>
      )}
    </>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
        {items.map((m, i) => (
          <div key={`${m.url}-${i}`} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border group">
            {m.type === "VIDEO" ? (
              <video src={m.url} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                className="p-1 rounded-md bg-white/20 text-white"
                onClick={() =>
                  m.type === "VIDEO"
                    ? void reEditVideo(m.url, i)
                    : void reEditImage(m.url, i)
                }
                disabled={disabled || uploading}
                aria-label={m.type === "VIDEO" ? "영상 편집" : "사진 편집"}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-1 rounded-md bg-white/20 text-white"
                onClick={() => removeAt(i)}
                disabled={disabled}
                aria-label="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {m.type === "VIDEO" && (
              <span className="absolute bottom-0.5 left-0.5 text-[10px] bg-black/70 text-white px-1 rounded">
                영상
              </span>
            )}
          </div>
        ))}
        {(canAddImage || canAddVideo) && layout === "default" && (
          <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
        </div>
      )}

      {layout === "toolbar" ? (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-0.5 flex-wrap min-w-0">
            {toolbarIcons}
            {toolbarFooterStart}
          </div>
          {toolbarFooter}
        </div>
      ) : (
      <div className="flex flex-wrap gap-2">
        {canAddImage && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={disabled || uploading}
              onClick={() => setCameraOpen(true)}
            >
              <Camera className="h-4 w-4" />
              사진 찍기
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={disabled || uploading}
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {allowVideo ? "사진 선택" : "갤러리에서 선택"}
            </Button>
          </>
        )}
        {canAddVideo && (
          <>
            {allowVideoCapture && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5"
                disabled={disabled || uploading}
                onClick={() => setCameraOpen(true)}
              >
                <Video className="h-4 w-4" />
                영상 촬영
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={disabled || uploading}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "video/*";
                input.onchange = (ev) => {
                  const file = (ev.target as HTMLInputElement).files?.[0];
                  if (file) openVideoEditor(file);
                };
                input.click();
              }}
            >
              <Film className="h-4 w-4" />
              영상 파일
            </Button>
          </>
        )}
      </div>
      )}

      {layout === "default" && (
      <p className="text-xs text-muted-foreground">
        {allowVideo
          ? `사진 최대 ${maxImages}장 · 영상 ${maxVideos}개 (갤러리는 바로 업로드, 연필로 편집)`
          : enableFaceFilter
            ? `사진 최대 ${maxImages}장 (갤러리 바로 업로드 · 촬영 후 자르기)`
            : `사진 최대 ${maxImages}장 (갤러리·카메라, 필터 없음)`}
      </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        id={galleryInputId}
        ref={galleryInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={onGalleryImagePick}
      />

      {cropSrc && (
        <ImageCropDialog
          open={cropOpen}
          onOpenChange={(o) => {
            setCropOpen(o);
            if (!o) setCropSrc(null);
          }}
          imageSrc={cropSrc}
          aspect={4 / 5}
          title="사진 편집"
          description="드래그·확대·90° 회전·뒤집기·자유 각도·비율 변경 후 적용하세요."
          maxWidth={1920}
          maxHeight={1920}
          uploadFilename={cropFilename}
          onComplete={onCropComplete}
        />
      )}

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode="photo"
        enableFaceFilter={enableFaceFilter}
        onCapture={onCameraCapture}
      />

      <VideoEditDialog
        open={videoEditOpen}
        onOpenChange={(o) => {
          setVideoEditOpen(o);
          if (!o) setVideoBlob(null);
        }}
        videoBlob={videoBlob}
        onComplete={onVideoComplete}
        onUploadingChange={(busy) => {
          setUploading(busy);
          onUploadingChange?.(busy);
        }}
      />
    </div>
  );
}

/** Used listing: 갤러리/카메라 → 바로 Storage 업로드 */
export function UsedImageComposer({
  images,
  onChange,
  max = 10,
  disabled = false,
  onUploadingChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  disabled?: boolean;
  onUploadingChange?: (busy: boolean) => void;
}) {
  const items: PostMediaItem[] = images.map((url) => ({ url, type: "IMAGE" as const }));
  return (
    <div>
      <label className="text-sm font-medium">사진 (최대 {max}장)</label>
      <p className="text-xs text-muted-foreground mt-0.5">
        갤러리에서 고른 뒤 썸네일이 보이면 업로드 완료입니다.
      </p>
      <PostMediaComposer
        className="mt-2"
        items={items}
        onChange={(next) => onChange(next.map((m) => m.url))}
        maxImages={max}
        maxVideos={0}
        allowVideo={false}
        quickUpload
        enableFaceFilter={false}
        disabled={disabled}
        onUploadingChange={onUploadingChange}
      />
    </div>
  );
}
