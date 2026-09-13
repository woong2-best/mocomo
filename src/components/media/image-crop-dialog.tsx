"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  buildCropperTransform,
  getCroppedImageBlob,
  normalizeRotation,
} from "@/lib/crop-image";
import { uploadImageBlob, type UploadMediaOptions } from "@/lib/client-upload";
import { WatermarkToggleButtons } from "@/components/media/watermark-toggle-buttons";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import {
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { SponsorAdPreviewFrame } from "@/components/events/sponsor-ad-preview-frame";
import { cn } from "@/lib/utils";

export type CropAspectPreset = {
  id: string;
  label: string;
  /** undefined = 자유 비율 */
  aspect?: number;
};

const DEFAULT_ASPECT_PRESETS: CropAspectPreset[] = [
  { id: "free", label: "자유", aspect: undefined },
  { id: "1:1", label: "1:1", aspect: 1 },
  { id: "4:5", label: "4:5", aspect: 4 / 5 },
  { id: "3:4", label: "3:4", aspect: 3 / 4 },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
];

type ImageCropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspect: number;
  title: string;
  description: string;
  maxWidth: number;
  maxHeight: number;
  uploadFilename: string;
  onComplete: (publicUrl: string) => void;
  /** 게시물용 워터마크 옵션 */
  uploadOptions?: UploadMediaOptions;
  watermarkCreditLabel?: string;
  watermarkOptions?: WatermarkOptions;
  onWatermarkOptionsChange?: (next: WatermarkOptions) => void;
  /** true면 비율 고정(프로필 등) */
  lockAspect?: boolean;
  aspectPresets?: CropAspectPreset[];
  /** cover=영역 채움(기본), contain=전체 이미지가 보이도록 */
  objectFit?: "cover" | "contain";
  /** 사이드바 스폰서 슬롯 실시간 미리보기 */
  showSponsorPreview?: boolean;
};

function resetTransforms() {
  return {
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    croppedAreaPixels: null as Area | null,
  };
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  title,
  description,
  maxWidth,
  maxHeight,
  uploadFilename,
  onComplete,
  uploadOptions,
  watermarkCreditLabel,
  watermarkOptions,
  onWatermarkOptionsChange,
  lockAspect = false,
  aspectPresets = DEFAULT_ASPECT_PRESETS,
  objectFit = "cover",
  showSponsorPreview = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropAspect, setCropAspect] = useState<number | undefined>(aspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const minZoom = objectFit === "contain" ? 0.5 : 1;

  const presets = lockAspect
    ? aspectPresets.filter((p) => p.aspect === aspect)
    : aspectPresets;

  useEffect(() => {
    if (!open) return;
    const t = resetTransforms();
    setCrop(t.crop);
    setZoom(t.zoom);
    setRotation(t.rotation);
    setFlipH(t.flipH);
    setFlipV(t.flipV);
    setCroppedAreaPixels(t.croppedAreaPixels);
    setCropAspect(lockAspect ? aspect : aspect);
    setError("");
    setLivePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [open, imageSrc, aspect, lockAspect]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!showSponsorPreview || !open || !croppedAreaPixels) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
          rotation,
          flipHorizontal: flipH,
          flipVertical: flipV,
          maxWidth: Math.min(maxWidth, 480),
          maxHeight: Math.min(maxHeight, 600),
          mimeType: "image/jpeg",
          quality: 0.75,
        });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setLivePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // preview generation is best-effort
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    showSponsorPreview,
    open,
    croppedAreaPixels,
    imageSrc,
    rotation,
    flipH,
    flipV,
    maxWidth,
    maxHeight,
  ]);

  useEffect(() => {
    return () => {
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
    };
  }, [livePreviewUrl]);

  function handleReset() {
    const t = resetTransforms();
    setCrop(t.crop);
    setZoom(t.zoom);
    setRotation(t.rotation);
    setFlipH(t.flipH);
    setFlipV(t.flipV);
    setCroppedAreaPixels(t.croppedAreaPixels);
    setCropAspect(lockAspect ? aspect : aspect);
  }

  function rotateBy(deg: number) {
    setRotation((r) => normalizeRotation(r + deg));
  }

  function toggleFlipH() {
    setFlipH((v) => !v);
    setCrop((c) => ({ ...c }));
  }

  function toggleFlipV() {
    setFlipV((v) => !v);
    setCrop((c) => ({ ...c }));
  }

  const cropperTransform = useMemo(
    () => buildCropperTransform(crop, rotation, zoom, flipH, flipV),
    [crop, rotation, zoom, flipH, flipV]
  );

  async function apply() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        rotation,
        flipHorizontal: flipH,
        flipVertical: flipV,
        maxWidth,
        maxHeight,
        mimeType: "image/jpeg",
        quality: 0.9,
      });
      const opts =
        watermarkCreditLabel && watermarkOptions && hasActiveWatermark(watermarkOptions)
          ? { watermarkLabel: watermarkCreditLabel, watermarkOptions }
          : uploadOptions;
      const url = await uploadImageBlob(blob, uploadFilename, opts);
      onComplete(url);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const rotationLabel = `${Math.round(rotation)}°`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layer="stack"
        className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[96vh] flex flex-col"
      >
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "px-5 pb-3 shrink-0",
            showSponsorPreview && "grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start"
          )}
        >
          <div
            className={cn(
              "relative w-full bg-neutral-900 touch-none overflow-hidden rounded-xl",
              showSponsorPreview
                ? "aspect-[4/5] max-h-[min(52vh,420px)]"
                : "h-[min(44vh,320px)] sm:h-[min(48vh,360px)]"
            )}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              transform={cropperTransform}
              aspect={cropAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              objectFit={objectFit}
              restrictPosition={objectFit === "cover"}
              minZoom={minZoom}
              maxZoom={6}
              zoomWithScroll
            />
          </div>

          {showSponsorPreview ? (
            <div className="hidden sm:block space-y-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                스폰서 노출 미리보기
              </p>
              <SponsorAdPreviewFrame imageUrl={livePreviewUrl} />
              <p className="text-[10px] text-muted-foreground leading-snug">
                사이드바 스폰서 슬롯에 이렇게 표시됩니다.
              </p>
            </div>
          ) : null}
        </div>

        {showSponsorPreview ? (
          <div className="px-5 pb-3 sm:hidden space-y-2 shrink-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              스폰서 노출 미리보기
            </p>
            <SponsorAdPreviewFrame imageUrl={livePreviewUrl} hideHeader />
          </div>
        ) : null}

        <div className="shrink-0 border-t border-border bg-background pb-safe">
          {watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
            <div className="px-4 pt-3 space-y-1">
              <WatermarkToggleButtons
                value={watermarkOptions}
                onChange={onWatermarkOptionsChange}
                disabled={busy}
              />
              <p className="text-[10px] text-muted-foreground">
                업로드 전에 워터마크를 선택하세요. ({watermarkCreditLabel})
              </p>
            </div>
          ) : null}
          <div className="flex gap-2 px-4 pt-4 pb-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1 h-11"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              type="button"
              className="rounded-xl flex-1 h-11"
              onClick={apply}
              disabled={busy || !croppedAreaPixels}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  업로드 중…
                </>
              ) : (
                "적용"
              )}
            </Button>
          </div>

          {error && (
            <p className="px-4 -mt-1 pb-2 text-sm text-destructive">{error}</p>
          )}

          <div className="px-4 pb-4 space-y-3 max-h-[32vh] overflow-y-auto overscroll-contain">
          {!lockAspect && presets.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={
                    (p.aspect === undefined && cropAspect === undefined) ||
                    p.aspect === cropAspect
                      ? "default"
                      : "outline"
                  }
                  className="rounded-full h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setCropAspect(p.aspect);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-10 w-10"
              title="90° 왼쪽"
              disabled={busy}
              onClick={() => rotateBy(-90)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-10 w-10"
              title="90° 오른쪽"
              disabled={busy}
              onClick={() => rotateBy(90)}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("rounded-xl h-10 w-10", flipH && "border-primary bg-primary/10")}
              title="좌우 뒤집기"
              disabled={busy}
              onClick={toggleFlipH}
            >
              <FlipHorizontal2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("rounded-xl h-10 w-10", flipV && "border-primary bg-primary/10")}
              title="상하 뒤집기"
              disabled={busy}
              onClick={toggleFlipV}
            >
              <FlipVertical2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-10 w-10"
              title="축소"
              disabled={busy || zoom <= minZoom}
              onClick={() =>
                setZoom((z) => Math.max(minZoom, Math.round((z - 0.15) * 100) / 100))
              }
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-10 w-10"
              title="확대"
              disabled={busy || zoom >= 6}
              onClick={() => setZoom((z) => Math.min(6, Math.round((z + 0.15) * 100) / 100))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs h-10 px-3"
              disabled={busy}
              onClick={handleReset}
            >
              초기화
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="h-3.5 w-3.5" />
                  확대 · 축소
                </span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={minZoom}
                max={6}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-primary h-8"
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <RotateCw className="h-3.5 w-3.5" />
                  회전
                </span>
                <span className="tabular-nums">{rotationLabel}</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={0.5}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-primary h-8"
                disabled={busy}
              />
            </div>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
