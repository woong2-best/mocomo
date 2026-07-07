"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type Konva from "konva";
import {
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Loader2,
  Redo2,
  RotateCcw,
  RotateCw,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EditorCanvas } from "@/components/media/editor/editor-canvas";
import { EditorLayerPanel } from "@/components/media/editor/editor-layer-panel";
import { useImageEditor } from "@/hooks/use-image-editor";
import { createProjectFromImageSrc } from "@/lib/media-editor/layers";
import { EDITOR_CROP_PRESETS, fitCropRect } from "@/lib/media-editor/crop-presets";
import { exportStageToBlob } from "@/lib/media-editor/export";
import { uploadImageBlob, type UploadMediaOptions } from "@/lib/client-upload";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { WatermarkToggleButtons } from "@/components/media/watermark-toggle-buttons";
import type { CropAspectPreset } from "@/lib/media-editor/types";
import { cn } from "@/lib/utils";

export type ImageEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  title?: string;
  description?: string;
  maxWidth: number;
  maxHeight: number;
  uploadFilename: string;
  onComplete: (publicUrl: string) => void;
  uploadOptions?: UploadMediaOptions;
  watermarkCreditLabel?: string;
  watermarkOptions?: WatermarkOptions;
  onWatermarkOptionsChange?: (next: WatermarkOptions) => void;
  lockAspect?: boolean;
  aspect?: number;
  aspectPresets?: CropAspectPreset[];
};

const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4];

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  title = "사진 편집",
  description = "레이어를 추가하고 배치한 뒤 적용하세요.",
  maxWidth,
  maxHeight,
  uploadFilename,
  onComplete,
  uploadOptions,
  watermarkCreditLabel,
  watermarkOptions,
  onWatermarkOptionsChange,
  lockAspect = false,
  aspect = 4 / 5,
  aspectPresets = EDITOR_CROP_PRESETS,
}: ImageEditorDialogProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputId = useId();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewportZoom, setViewportZoom] = useState(1);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [exportFormat, setExportFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const spaceHeld = useRef(false);
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const editor = useImageEditor(null);
  const { project, resetHistory } = editor;

  const presets = lockAspect
    ? aspectPresets.filter((p) => p.aspect === aspect)
    : aspectPresets;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setViewportZoom(1);
    setViewportOffset({ x: 0, y: 0 });
    void createProjectFromImageSrc(imageSrc, {
      maxWidth,
      maxHeight,
      defaultAspect: aspect,
    })
      .then((p) => {
        if (cancelled) return;
        let next = p;
        if (lockAspect) {
          next = { ...p, crop: fitCropRect(p.width, p.height, aspect) };
        }
        resetHistory(next);
      })
      .catch(() => {
        if (!cancelled) setError("이미지를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageSrc]);

  const activeLayer = project?.layers.find((l) => l.id === project.activeLayerId) ?? null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !project) return;
      if (e.code === "Space" && !spaceHeld.current) {
        spaceHeld.current = true;
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && project.activeLayerId) {
        e.preventDefault();
        editor.dupLayer(project.activeLayerId);
      }
      if (e.key === "Delete" && project.activeLayerId) {
        editor.deleteLayer(project.activeLayerId);
      }
    },
    [open, project, editor]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") spaceHeld.current = false;
    });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function apply() {
    const stage = stageRef.current;
    if (!stage || !project) return;
    setBusy(true);
    setError("");
    try {
      editor.flushTransform();
      const blob = await exportStageToBlob(stage, project.crop, {
        mimeType: exportFormat,
        quality: 0.92,
        maxWidth,
        maxHeight,
      });
      const opts =
        watermarkCreditLabel && watermarkOptions && hasActiveWatermark(watermarkOptions)
          ? { watermarkLabel: watermarkCreditLabel, watermarkOptions }
          : uploadOptions;
      const ext = exportFormat === "image/png" ? "png" : "jpg";
      const filename = uploadFilename.replace(/\.[^.]+$/, "") + `.${ext}`;
      const url = await uploadImageBlob(blob, filename, opts);
      onComplete(url);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function fitViewport() {
    if (!project) return;
    const container = stageRef.current?.container().parentElement;
    if (!container) return;
    const pad = 24;
    const zw = (container.clientWidth - pad) / project.width;
    const zh = (container.clientHeight - pad) / project.height;
    setViewportZoom(Math.min(1, zw, zh));
    setViewportOffset({ x: 12, y: 12 });
  }

  useEffect(() => {
    if (project && open) {
      const t = window.setTimeout(fitViewport, 50);
      return () => clearTimeout(t);
    }
  }, [project, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layer="stack"
        className="max-w-[100vw] w-full h-[100dvh] sm:h-[96vh] sm:max-w-[min(96vw,1400px)] p-0 gap-0 overflow-hidden flex flex-col rounded-none sm:rounded-xl"
      >
        <DialogHeader className="px-4 py-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
          <div className="min-w-0">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription className="text-xs">{description}</DialogDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={!editor.canUndo || busy}
              onClick={editor.undo}
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={!editor.canRedo || busy}
              onClick={editor.redo}
              title="다시 실행"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={busy}
              onClick={() => setViewportZoom((z) => Math.max(0.25, z / 1.2))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums w-10 text-center">{Math.round(viewportZoom * 100)}%</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={busy}
              onClick={() => setViewportZoom((z) => Math.min(4, z * 1.2))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={fitViewport}>
              맞춤
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <aside className="hidden md:flex w-14 shrink-0 border-r flex-col items-center py-3 gap-2 bg-muted/20">
            <label
              htmlFor={fileInputId}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted cursor-pointer"
              title="이미지 추가"
            >
              <ImagePlus className="h-5 w-5" />
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void editor.addImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </aside>

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div
              className="flex-1 min-h-0 overflow-auto bg-neutral-950 flex items-center justify-center relative"
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  setViewportZoom((z) =>
                    Math.min(4, Math.max(0.25, z + (e.deltaY < 0 ? 0.08 : -0.08)))
                  );
                }
              }}
            >
              {loading || !project ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <EditorCanvas
                  project={project}
                  stageRef={stageRef}
                  viewportZoom={viewportZoom}
                  viewportOffset={viewportOffset}
                  onSelectLayer={editor.selectLayer}
                  onTransformEnd={(layerId, attrs) => {
                    editor.transformLayer(layerId, attrs, false);
                    editor.flushTransform();
                  }}
                />
              )}
            </div>

            <div className="shrink-0 border-t bg-background px-3 py-2 space-y-2 max-h-[38vh] overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full h-7 px-2.5 text-[11px]"
                    disabled={busy || !project}
                    onClick={() => editor.applyCropAspect(p.aspect)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {activeLayer && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => editor.rotateLayer(activeLayer.id, -90)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => editor.rotateLayer(activeLayer.id, 90)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => editor.flipLayer(activeLayer.id, "x")}
                  >
                    <FlipHorizontal2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => editor.flipLayer(activeLayer.id, "y")}
                  >
                    <FlipVertical2 className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                    <span className="text-[10px] text-muted-foreground shrink-0">투명도</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={activeLayer.opacity}
                      onChange={(e) => editor.setOpacity(activeLayer.id, Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                  </div>
                </div>
              )}

              <div className="flex md:hidden">
                <label
                  htmlFor={`${fileInputId}-mobile`}
                  className="inline-flex items-center gap-1.5 text-xs rounded-lg border px-3 py-2"
                >
                  <ImagePlus className="h-4 w-4" />
                  이미지 추가
                </label>
                <input
                  id={`${fileInputId}-mobile`}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) void editor.addImageFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
                <WatermarkToggleButtons
                  value={watermarkOptions}
                  onChange={onWatermarkOptionsChange}
                  disabled={busy}
                />
              ) : null}

              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as "image/jpeg" | "image/png")}
                  className="text-xs rounded-lg border bg-background px-2 py-1.5"
                  disabled={busy}
                >
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                </select>
                <div className="flex gap-1 ml-auto">
                  {ZOOM_STEPS.map((z) => (
                    <button
                      key={z}
                      type="button"
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-md border",
                        Math.abs(viewportZoom - z) < 0.05 && "border-primary bg-primary/10"
                      )}
                      onClick={() => setViewportZoom(z)}
                    >
                      {z * 100}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden lg:flex w-56 shrink-0 border-l min-h-0 flex-col">
            {project ? (
              <EditorLayerPanel
                project={project}
                onSelect={editor.selectLayer}
                onToggleVisible={editor.toggleVisible}
                onToggleLocked={editor.toggleLocked}
                onDelete={editor.deleteLayer}
                onDuplicate={editor.dupLayer}
                onMove={editor.moveLayerOrder}
              />
            ) : null}
          </aside>
        </div>

        <div className="shrink-0 border-t px-4 py-3 flex gap-2 pb-safe">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl flex-1"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            type="button"
            className="rounded-xl flex-1"
            onClick={apply}
            disabled={busy || loading || !project}
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

        {error && <p className="px-4 pb-2 text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
