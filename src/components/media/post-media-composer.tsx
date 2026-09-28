"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Camera,
  Film,
  ImagePlus,
  Loader2,
  Video,
  X,
} from "lucide-react";
import { PostMediaLightbox } from "@/components/media/post-media-lightbox";
import { Button } from "@/components/ui/button";
import { CameraCaptureDialog } from "@/components/media/camera-capture-dialog";
import { uploadImageBlob, uploadVideoBlob, type UploadMediaOptions } from "@/lib/client-upload";
import {
  isGalleryImageFile,
  prepareGalleryImageForUpload,
} from "@/lib/gallery-image-upload";
import { normalizeGalleryVideoFile } from "@/lib/gallery-video-upload";
import { readVideoMetadata } from "@/lib/video-metadata";
import { getWatermarkSettings } from "@/actions/watermark-settings";
import {
  EMPTY_WATERMARK_OPTIONS,
  hasActiveWatermark,
  optionsFromWatermarkSettings,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import { filesFromClipboard } from "@/lib/clipboard-files";
import { cn } from "@/lib/utils";

export type PostMediaItem = {
  url: string;
  type: "IMAGE" | "VIDEO";
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

type PostMediaComposerProps = {
  items: PostMediaItem[];
  onChange: (items: PostMediaItem[]) => void;
  maxImages?: number;
  maxVideos?: number;
  allowVideo?: boolean;
  /** false면 영상 촬영 버튼 숨김 */
  allowVideoCapture?: boolean;
  /** default 레이아웃 — 영상 파일 버튼 바로 옆 (유료 판매 금액 등) */
  afterVideoButton?: ReactNode;
  layout?: "default" | "toolbar";
  /** toolbar 레이아웃 하단 우측 (게시하기 등) */
  toolbarFooter?: ReactNode;
  /** toolbar 레이아웃 하단 좌측, 아이콘 옆 */
  toolbarFooterStart?: ReactNode;
  /** 중고거래: 자르기 없이 바로 업로드 (실패 줄임) */
  quickUpload?: boolean;
  /** false면 중고거래 등 — 얼굴 필터 없이 원본 카메라만 */
  enableFaceFilter?: boolean;
  /** 게시물용 — @username · site 크레딧 라벨 자동 합성 */
  watermarkCreditLabel?: string;
  disabled?: boolean;
  className?: string;
  onUploadingChange?: (busy: boolean) => void;
};

const IMAGE_ACCEPT = "image/*,.heic,.heif,image/heic,image/heif";

function isLocalPreviewUrl(url: string): boolean {
  return (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    (!url.startsWith("http") && !url.startsWith("/"))
  );
}

function isGalleryVideoFile(file: File): boolean {
  const type = file.type?.trim().toLowerCase() ?? "";
  return (
    type.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)
  );
}


export type PostMediaComposerHandle = {
  handlePaste: (event: React.ClipboardEvent) => boolean;
};

export const PostMediaComposer = forwardRef<
  PostMediaComposerHandle,
  PostMediaComposerProps
>(function PostMediaComposer({
  items,
  onChange,
  maxImages = 100,
  maxVideos = 10,
  allowVideo = true,
  allowVideoCapture = false,
  afterVideoButton,
  layout = "default",
  toolbarFooter,
  toolbarFooterStart,
  quickUpload = false,
  enableFaceFilter = true,
  watermarkCreditLabel,
  disabled = false,
  className,
  onUploadingChange,
}, ref) {
  const galleryInputId = useId();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const imageCount = items.filter((m) => m.type === "IMAGE").length;
  const videoCount = items.filter((m) => m.type === "VIDEO").length;
  const canAddImage = imageCount < maxImages;
  const canAddVideo = allowVideo && videoCount < maxVideos;

  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [watermarkOptions, setWatermarkOptions] = useState(EMPTY_WATERMARK_OPTIONS);
  const pasteLockUntilRef = useRef(0);
  const watermarkOptionsRef = useRef(watermarkOptions);
  watermarkOptionsRef.current = watermarkOptions;

  useEffect(() => {
    if (!watermarkCreditLabel) {
      setWatermarkOptions(EMPTY_WATERMARK_OPTIONS);
      return;
    }
    let cancelled = false;
    void getWatermarkSettings().then((settings) => {
      if (cancelled) return;
      setWatermarkOptions(optionsFromWatermarkSettings(settings.enabled, settings.placement));
    });
    return () => {
      cancelled = true;
    };
  }, [watermarkCreditLabel]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  function resolveUploadOpts(
    options: WatermarkOptions = watermarkOptionsRef.current
  ): UploadMediaOptions | undefined {
    if (!watermarkCreditLabel || !hasActiveWatermark(options)) return undefined;
    return { watermarkLabel: watermarkCreditLabel, watermarkOptions: options };
  }

  const pendingGalleryRef = useRef<{
    files: File[];
    previewUrls: string[];
    baseCount: number;
  } | null>(null);
  const galleryUploadTimerRef = useRef<number | null>(null);
  const galleryUploadGenRef = useRef(0);

  function schedulePendingGalleryUpload(delayMs: number) {
    if (galleryUploadTimerRef.current) {
      window.clearTimeout(galleryUploadTimerRef.current);
    }
    galleryUploadTimerRef.current = window.setTimeout(() => {
      galleryUploadTimerRef.current = null;
      void flushPendingGalleryUpload();
    }, delayMs);
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem(item: PostMediaItem) {
    onChange([...items, item]);
  }

  function finishUploadBusy(gen: number) {
    if (gen !== galleryUploadGenRef.current) return;
    setUploading(false);
    onUploadingChange?.(false);
  }

  async function flushPendingGalleryUpload() {
    const pending = pendingGalleryRef.current;
    if (!pending) return;

    const gen = ++galleryUploadGenRef.current;
    setUploading(true);
    onUploadingChange?.(true);
    setError("");

    const errors: string[] = [];

    try {
      const results = await Promise.all(
        pending.files.map(async (file, i) => {
          if (gen !== galleryUploadGenRef.current) return { i, url: null as string | null, error: null as string | null };
          try {
            const prepared = await prepareGalleryImageForUpload(file);
            const url = await uploadImageBlob(
              prepared,
              prepared.name || "photo.jpg",
              resolveUploadOpts()
            );
            return { i, url, error: null };
          } catch (e) {
            return {
              i,
              url: null,
              error: e instanceof Error ? e.message : `사진 ${i + 1} 업로드 실패`,
            };
          }
        })
      );

      if (gen !== galleryUploadGenRef.current) return;

      const next = [...itemsRef.current];
      for (const { i, url, error } of results) {
        if (error) {
          errors.push(error);
          continue;
        }
        if (!url) continue;
        const itemIndex = pending.baseCount + i;
        if (next[itemIndex]?.type === "IMAGE") {
          next[itemIndex] = { url, type: "IMAGE" };
        }
      }
      onChange(next);

      if (errors.length > 0) {
        setError(
          errors.length === pending.files.length
            ? errors[0] ?? "사진 업로드에 실패했습니다."
            : `일부 사진만 올렸습니다. ${errors[0]}`
        );
      }
    } catch (e) {
      if (gen !== galleryUploadGenRef.current) return;
      setError(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
    } finally {
      finishUploadBusy(gen);
    }
  }

  async function performGalleryUpload(
    files: File[],
    baseItems: PostMediaItem[],
    previewUrls: string[]
  ) {
    const gen = ++galleryUploadGenRef.current;
    setUploading(true);
    onUploadingChange?.(true);
    setError("");

    let next = [
      ...baseItems,
      ...previewUrls.map((url) => ({ url, type: "IMAGE" as const })),
    ];
    const errors: string[] = [];

    try {
      const results = await Promise.all(
        files.map(async (file, i) => {
          if (gen !== galleryUploadGenRef.current) {
            return { previewUrl: previewUrls[i], url: null as string | null, error: null as string | null };
          }
          try {
            const prepared = await prepareGalleryImageForUpload(file);
            const url = await uploadImageBlob(
              prepared,
              prepared.name || "photo.jpg",
              resolveUploadOpts()
            );
            return { previewUrl: previewUrls[i], url, error: null };
          } catch (e) {
            return {
              previewUrl: previewUrls[i],
              url: null,
              error: e instanceof Error ? e.message : `사진 ${i + 1} 업로드 실패`,
            };
          } finally {
            URL.revokeObjectURL(previewUrls[i]);
          }
        })
      );

      if (gen !== galleryUploadGenRef.current) return;

      for (const { previewUrl, url, error } of results) {
        if (error) {
          next = next.filter((item) => item.url !== previewUrl);
          errors.push(error);
        } else if (url) {
          next = next.map((item) =>
            item.url === previewUrl ? { url, type: "IMAGE" as const } : item
          );
        }
      }
      onChange(next);

      if (errors.length > 0) {
        setError(
          errors.length === files.length
            ? errors[0] ?? "사진 업로드에 실패했습니다."
            : `일부 사진만 올렸습니다. ${errors[0]}`
        );
      }
    } catch (e) {
      if (gen !== galleryUploadGenRef.current) return;
      onChange(baseItems);
      setError(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    } finally {
      finishUploadBusy(gen);
    }
  }

  async function uploadFilesDirect(files: File[]) {
    const baseItems = items;
    const previewUrls: string[] = [];
    files.forEach((f) => {
      previewUrls.push(URL.createObjectURL(f));
    });

    onChange([
      ...baseItems,
      ...previewUrls.map((url) => ({ url, type: "IMAGE" as const })),
    ]);

    await performGalleryUpload(files, baseItems, previewUrls);
  }

  function stageGalleryFiles(files: File[]) {
    const baseCount = items.length;
    const previewUrls = files.map((f) => URL.createObjectURL(f));
    onChange([
      ...items,
      ...previewUrls.map((url) => ({ url, type: "IMAGE" as const })),
    ]);
    pendingGalleryRef.current = { files, previewUrls, baseCount };
    setUploading(true);
    onUploadingChange?.(true);
    schedulePendingGalleryUpload(0);
  }

  useEffect(() => {
    return () => {
      if (galleryUploadTimerRef.current) {
        window.clearTimeout(galleryUploadTimerRef.current);
      }
      pendingGalleryRef.current?.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function onCameraCapture(blob: Blob, mimeType: string) {
    if (!mimeType.startsWith("image/")) return;
    const name = mimeType.includes("png") ? "camera.png" : "camera.jpg";
    void uploadFilesDirect([new File([blob], name, { type: mimeType || "image/jpeg" })]);
  }

  async function uploadVideosDirect(files: File[]) {
    const baseItems = itemsRef.current;
    const previewUrls = files.map((f) => URL.createObjectURL(f));
    onChange([
      ...baseItems,
      ...previewUrls.map((url) => ({ url, type: "VIDEO" as const })),
    ]);
    setUploading(true);
    onUploadingChange?.(true);
    setError("");
    let next = [
      ...baseItems,
      ...previewUrls.map((url) => ({ url, type: "VIDEO" as const })),
    ];
    const errors: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = normalizeGalleryVideoFile(files[i]!);
        const previewUrl = previewUrls[i]!;
        try {
          const meta = await readVideoMetadata(file);
          const url = await uploadVideoBlob(
            file,
            file.name || `video-${Date.now()}.mp4`,
            resolveUploadOpts()
          );
          next = next.map((item) =>
            item.url === previewUrl
              ? {
                  url,
                  type: "VIDEO" as const,
                  width: meta.width,
                  height: meta.height,
                  duration: meta.duration,
                }
              : item
          );
        } catch (e) {
          next = next.filter((item) => item.url !== previewUrl);
          errors.push(e instanceof Error ? e.message : `영상 ${i + 1} 업로드 실패`);
        } finally {
          URL.revokeObjectURL(previewUrl);
        }
      }
      onChange(next);
      if (errors.length > 0) {
        setError(errors[0] ?? "영상 업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function pickVideoFiles() {
    const remaining =
      maxVideos -
      itemsRef.current.filter((m) => m.type === "VIDEO").length;
    if (remaining <= 0) {
      setError(`영상은 최대 ${maxVideos}개까지 추가할 수 있습니다.`);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.multiple = true;
    input.onchange = (ev) => {
      const files = Array.from(
        (ev.target as HTMLInputElement).files ?? []
      ).filter((f) => isGalleryVideoFile(f));
      if (files.length === 0) {
        setError("영상 파일을 선택해 주세요.");
        return;
      }
      ingestVideoFiles(files);
    };
    input.click();
  }

  async function ingestGalleryImages(list: File[]) {
    setError("");
    const remaining = maxImages - itemsRef.current.filter((m) => m.type === "IMAGE").length;
    if (remaining <= 0) {
      setError(`사진은 최대 ${maxImages}장까지 추가할 수 있습니다.`);
      return;
    }
    if (list.length === 0) {
      setError("이미지 파일을 선택해 주세요. (jpg, png, webp, heic 등)");
      return;
    }
    const batch = list.slice(0, remaining);
    if (list.length > remaining) {
      setError(`사진은 최대 ${maxImages}장까지 추가할 수 있습니다. ${batch.length}장만 추가했습니다.`);
    }
    if (watermarkCreditLabel && !quickUpload) {
      stageGalleryFiles(batch);
      return;
    }
    await uploadFilesDirect(batch);
  }

  async function onGalleryImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files;
    if (!picked?.length) return;
    const list = Array.from(picked).filter((f) => isGalleryImageFile(f, true));
    e.target.value = "";
    await ingestGalleryImages(list);
  }

  function ingestVideoFiles(files: File[]) {
    const remaining =
      maxVideos - itemsRef.current.filter((m) => m.type === "VIDEO").length;
    if (remaining <= 0) {
      setError(`영상은 최대 ${maxVideos}개까지 추가할 수 있습니다.`);
      return;
    }
    const batch = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`영상은 최대 ${maxVideos}개까지 추가할 수 있습니다. ${batch.length}개만 추가했습니다.`);
    }
    setError("");
    void uploadVideosDirect(batch);
  }

  function handlePaste(event: React.ClipboardEvent): boolean {
    if (disabled || uploading) return false;
    const now = Date.now();
    if (now < pasteLockUntilRef.current) return false;
    const files = filesFromClipboard(event.clipboardData);
    if (files.length === 0) return false;

    const images = files.filter((f) => isGalleryImageFile(f, true));
    const videos = allowVideo ? files.filter((f) => isGalleryVideoFile(f)) : [];
    if (images.length === 0 && videos.length === 0) return false;

    event.preventDefault();
    event.stopPropagation();
    pasteLockUntilRef.current = now + 400;

    if (images.length > 0 && canAddImage) {
      void ingestGalleryImages(images);
    } else if (images.length > 0) {
      setError(`사진은 최대 ${maxImages}장까지 추가할 수 있습니다.`);
    }

    if (videos.length > 0 && canAddVideo) {
      ingestVideoFiles(videos.map((f) => normalizeGalleryVideoFile(f)));
    } else if (videos.length > 0) {
      setError(`영상은 최대 ${maxVideos}개까지 추가할 수 있습니다.`);
    }

    return true;
  }

  const handlePasteRef = useRef(handlePaste);
  handlePasteRef.current = handlePaste;

  useImperativeHandle(
    ref,
    () => ({
      handlePaste: (event) => handlePasteRef.current(event),
    }),
    []
  );

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
        </>
      )}
      {canAddVideo && (
        <>
          <button
            type="button"
            className={iconBtnClass}
            disabled={disabled || uploading}
            onClick={pickVideoFiles}
            aria-label="영상 파일"
            title="영상"
          >
            <Film className="h-[18px] w-[18px]" />
          </button>
          {afterVideoButton}
        </>
      )}
    </>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
        {items.map((m, i) => (
          <div key={`${m.url}-${i}`} className="relative h-20 w-20 rounded-xl overflow-hidden border border-border">
            <button
              type="button"
              className="absolute inset-0 z-0 block h-full w-full cursor-pointer"
              onClick={() => {
                setPreviewIndex(i);
                setPreviewOpen(true);
              }}
              aria-label="미리보기"
            >
              {m.type === "VIDEO" ? (
                <video src={m.url} className="h-full w-full object-cover pointer-events-none" muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover pointer-events-none" />
              )}
            </button>
            <button
              type="button"
              className="absolute top-1 right-1 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              disabled={disabled}
              aria-label="삭제"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            {m.type === "VIDEO" && (
              <span className="pointer-events-none absolute bottom-0.5 left-0.5 z-[1] rounded bg-black/70 px-1 text-[10px] text-white">
                영상
              </span>
            )}
            {isLocalPreviewUrl(m.url) && (
              <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/35">
                <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
              </div>
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
          <div className="flex flex-wrap items-center gap-2">
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
              onClick={pickVideoFiles}
            >
              <Film className="h-4 w-4" />
              영상 파일
            </Button>
            {afterVideoButton}
          </div>
        )}
      </div>
      )}

      {layout === "default" && (
      <p className="text-xs text-muted-foreground">
        {allowVideo
          ? `사진 최대 ${maxImages}장 · 영상 ${maxVideos}개`
          : `사진 최대 ${maxImages}장`}
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

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode="photo"
        enableFaceFilter={enableFaceFilter}
        onCapture={onCameraCapture}
      />

      <PostMediaLightbox
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        postId="compose-draft"
        media={items.map((m, i) => ({
          id: `compose-${i}`,
          url: m.url,
          type: m.type,
        }))}
        initialIndex={previewIndex}
        isOwner
      />
    </div>
  );
});

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
