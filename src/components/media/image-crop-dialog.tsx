"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedImageBlob } from "@/lib/crop-image";
import { uploadImageBlob } from "@/lib/client-upload";
import { Loader2, RotateCw, ZoomIn } from "lucide-react";

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
};

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
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function apply() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        rotation,
        maxWidth,
        maxHeight,
        mimeType: "image/jpeg",
        quality: 0.88,
      });
      const url = await uploadImageBlob(blob, uploadFilename);
      onComplete(url);
      onOpenChange(false);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-[min(52vh,360px)] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="px-6 py-4 space-y-4 border-t border-border">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5" />
              확대
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <RotateCw className="h-3.5 w-3.5" />
              회전
            </label>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={busy}>
              취소
            </Button>
            <Button type="button" className="rounded-xl" onClick={apply} disabled={busy || !croppedAreaPixels}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
