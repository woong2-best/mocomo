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
import {
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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
  /** true면 비율 고정(프로필 등) */
  lockAspect?: boolean;
  aspectPresets?: CropAspectPreset[];
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
  lockAspect = false,
  aspectPresets = DEFAULT_ASPECT_PRESETS,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropAspect, setCropAspect] = useState<number | undefined>(aspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
  }, [open, imageSrc, aspect, lockAspect]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

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
      const url = await uploadImageBlob(blob, uploadFilename, uploadOptions);
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

        <div className="relative w-full h-[min(44vh,320px)] sm:h-[min(48vh,360px)] bg-neutral-900 shrink-0 touch-none">
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
            objectFit="cover"
            restrictPosition
            minZoom={1}
            maxZoom={6}
            zoomWithScroll
          />
        </div>

        <div className="shrink-0 border-t border-border bg-background pb-safe">
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
              disabled={busy || zoom <= 1}
              onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.15) * 100) / 100))}
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
                min={1}
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
