"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Film,
  ImagePlus,
  Loader2,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import { CameraCaptureDialog } from "@/components/media/camera-capture-dialog";
import { VideoEditDialog } from "@/components/media/video-edit-dialog";
import { readFileAsObjectUrl } from "@/lib/crop-image";
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
  disabled?: boolean;
  className?: string;
};

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function PostMediaComposer({
  items,
  onChange,
  maxImages = 4,
  maxVideos = 1,
  allowVideo = true,
  disabled = false,
  className,
}: PostMediaComposerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
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
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");

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

  function onCameraCapture(blob: Blob, mimeType: string) {
    if (mimeType.startsWith("image/")) {
      openImageCrop(blob, "camera-photo.jpg");
      return;
    }
    setVideoBlob(blob);
    setVideoEditOpen(true);
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const videos = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videos.length > 0 && allowVideo) {
      if (!canAddVideo) {
        setError(`영상은 최대 ${maxVideos}개까지 추가할 수 있습니다.`);
      } else {
        setVideoBlob(videos[0]);
        setVideoEditOpen(true);
      }
      return;
    }
    const remaining = maxImages - imageCount;
    if (remaining <= 0 || list.length === 0) {
      if (list.length > 0) setError(`사진은 최대 ${maxImages}장까지 추가할 수 있습니다.`);
      return;
    }
    const batch = list.slice(0, remaining);
    setPendingImageFiles(batch.slice(1));
    await openImageCrop(batch[0], batch[0].name);
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

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {items.map((m, i) => (
          <div key={`${m.url}-${i}`} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border group">
            {m.type === "VIDEO" ? (
              <video src={m.url} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {m.type === "IMAGE" && (
                <button
                  type="button"
                  className="p-1 rounded-md bg-white/20 text-white"
                  onClick={() => reEditImage(m.url, i)}
                  disabled={disabled || uploading}
                  aria-label="사진 편집"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
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
        {(canAddImage || canAddVideo) && (
          <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canAddImage && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={disabled || uploading}
              onClick={() => {
                setCameraMode("photo");
                setCameraOpen(true);
              }}
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
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {allowVideo ? "사진 선택" : "갤러리에서 선택"}
            </Button>
          </>
        )}
        {canAddVideo && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={disabled || uploading}
              onClick={() => {
                setCameraMode("video");
                setCameraOpen(true);
              }}
            >
              <Video className="h-4 w-4" />
              영상 촬영
            </Button>
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
                  if (file) {
                    setVideoBlob(file);
                    setVideoEditOpen(true);
                  }
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

      <input
        ref={galleryRef}
        type="file"
        accept={allowVideo ? `${IMAGE_ACCEPT},video/*` : IMAGE_ACCEPT}
        multiple={!allowVideo}
        className="hidden"
        onChange={onGalleryPick}
      />

      <p className="text-xs text-muted-foreground">
        {allowVideo
          ? `사진 최대 ${maxImages}장 · 영상 ${maxVideos}개 (촬영·업로드 후 앱에서 편집)`
          : `사진 최대 ${maxImages}장 (촬영·자르기·회전)`}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}

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
          description="드래그·확대·회전으로 영역을 맞춘 뒤 적용하세요."
          maxWidth={1920}
          maxHeight={1920}
          uploadFilename={cropFilename}
          onComplete={onCropComplete}
        />
      )}

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode={cameraMode}
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
      />
    </div>
  );
}

/** Used listing: images only, direct upload after crop */
export function UsedImageComposer({
  images,
  onChange,
  max = 10,
  disabled = false,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const items: PostMediaItem[] = images.map((url) => ({ url, type: "IMAGE" as const }));
  return (
    <div>
      <label className="text-sm font-medium">사진 (최대 {max}장)</label>
      <PostMediaComposer
        className="mt-2"
        items={items}
        onChange={(next) => onChange(next.map((m) => m.url))}
        maxImages={max}
        maxVideos={0}
        allowVideo={false}
        disabled={disabled}
      />
    </div>
  );
}
