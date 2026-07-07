"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type Konva from "konva";
import {
  Download,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Loader2,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
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
import { EditorToolPanel } from "@/components/media/editor/editor-tool-panel";
import { EditorPropertiesPanel } from "@/components/media/editor/editor-properties-panel";
import { EditorHistoryPanel } from "@/components/media/editor/editor-history-panel";
import { useImageEditor } from "@/hooks/use-image-editor";
import { createProjectFromImageSrc } from "@/lib/media-editor/layers";
import { EDITOR_CROP_PRESETS, fitCropRect } from "@/lib/media-editor/crop-presets";
import { exportStageToBlob } from "@/lib/media-editor/export";
import {
  downloadProjectJson,
  listEditorProjects,
  parseProjectJsonFile,
} from "@/lib/media-editor/project-storage";
import type { SavedEditorProject } from "@/lib/media-editor/types";
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

const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4, 8];
const AUTOSAVE_MS = 30_000;

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  title = "사진 편집",
  description = "레이어 기반 전문 편집기",
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
  const projectFileId = useId();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewportZoom, setViewportZoom] = useState(1);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [exportFormat, setExportFormat] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [mobilePanel, setMobilePanel] = useState<"tools" | "layers" | "props">("tools");
  const [recentProjects, setRecentProjects] = useState<SavedEditorProject[]>([]);
  const spaceHeld = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const pinching = useRef(false);
  const lastPinchDist = useRef(0);

  const editor = useImageEditor(null);
  const { project, resetHistory } = editor;
  const activeLayer = project?.layers.find((l) => l.id === project.activeLayerId) ?? null;
  const brushMode = editor.activeTool === "brush";

  const presets = lockAspect ? aspectPresets.filter((p) => p.aspect === aspect) : aspectPresets;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setViewportZoom(1);
    setViewportOffset({ x: 0, y: 0 });
    void createProjectFromImageSrc(imageSrc, { maxWidth, maxHeight, defaultAspect: aspect })
      .then((p) => {
        if (cancelled) return;
        let next = p;
        if (lockAspect) next = { ...p, crop: fitCropRect(p.width, p.height, aspect) };
        resetHistory(next);
      })
      .catch(() => {
        if (!cancelled) setError("이미지를 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    void listEditorProjects().then(setRecentProjects).catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open || !project) return;
    const t = window.setInterval(() => {
      void editor.autosave();
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [open, project, editor]);

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
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && project.activeLayerId) {
        e.preventDefault();
        editor.groupSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void editor.autosave();
        if (project) downloadProjectJson(project);
      }
      if (e.key === "Delete" && project.activeLayerId) editor.deleteLayer(project.activeLayerId);
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
      const ext = exportFormat === "image/png" ? "png" : exportFormat === "image/webp" ? "webp" : "jpg";
      const url = await uploadImageBlob(blob, uploadFilename.replace(/\.[^.]+$/, "") + `.${ext}`, opts);
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

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (!spaceHeld.current) return;
    panStart.current = { x: e.clientX, y: e.clientY, ox: viewportOffset.x, oy: viewportOffset.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (!spaceHeld.current) return;
    setViewportOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.x),
      y: panStart.current.oy + (e.clientY - panStart.current.y),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layer="stack"
        className="max-w-[100vw] w-full h-[100dvh] sm:h-[96vh] sm:max-w-[min(98vw,1500px)] p-0 gap-0 overflow-hidden flex flex-col rounded-none sm:rounded-xl"
      >
        <DialogHeader className="px-3 py-2 border-b shrink-0 flex-row items-center justify-between space-y-0 gap-2">
          <div className="min-w-0">
            <DialogTitle className="text-sm sm:text-base">{title}</DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs line-clamp-1">{description}</DialogDescription>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 flex-wrap justify-end">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!editor.canUndo || busy} onClick={editor.undo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!editor.canRedo || busy} onClick={editor.redo}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 hidden sm:inline-flex" disabled={busy || !project} onClick={() => project && downloadProjectJson(project)}>
              <Save className="h-4 w-4" />
            </Button>
            <label htmlFor={projectFileId} className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md border cursor-pointer hover:bg-muted">
              <FolderOpen className="h-4 w-4" />
            </label>
            <input
              id={projectFileId}
              type="file"
              accept="application/json,.mocomo.json"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const p = await parseProjectJsonFile(f);
                  editor.loadProject(p);
                } catch {
                  setError("프로젝트 파일을 열 수 없습니다.");
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={busy} onClick={() => setViewportZoom((z) => Math.max(0.25, z / 1.2))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-[10px] tabular-nums w-9 text-center">{Math.round(viewportZoom * 100)}%</span>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={busy} onClick={() => setViewportZoom((z) => Math.min(8, z * 1.2))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-[10px] px-2" onClick={fitViewport}>
              맞춤
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
          <div className="hidden lg:flex">
            <EditorToolPanel
              active={editor.activeTool}
              onSelect={editor.setActiveTool}
              onAddText={editor.addTextLayer}
              onAddBlur={editor.addBlurOverlay}
              onAddOverlay={editor.addColorOverlay}
              fileInputId={fileInputId}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div
              className="flex-1 min-h-0 overflow-hidden bg-neutral-950 flex items-center justify-center relative touch-none"
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  setViewportZoom((z) => Math.min(8, Math.max(0.25, z + (e.deltaY < 0 ? 0.08 : -0.08))));
                }
              }}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  pinching.current = true;
                  const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
                  const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
                  lastPinchDist.current = Math.hypot(dx, dy);
                }
              }}
              onTouchMove={(e) => {
                if (!pinching.current || e.touches.length < 2) return;
                const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
                const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
                const dist = Math.hypot(dx, dy);
                const delta = dist - lastPinchDist.current;
                lastPinchDist.current = dist;
                setViewportZoom((z) => Math.min(8, Math.max(0.25, z + delta * 0.004)));
                if (navigator.vibrate) navigator.vibrate(1);
              }}
              onTouchEnd={() => {
                pinching.current = false;
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
                  brushMode={brushMode}
                  brushSettings={editor.brushSettings}
                  activeBrushLayerId={editor.activeBrushLayerId}
                  onSelectLayer={editor.selectLayer}
                  onTransformEnd={(layerId, attrs) => {
                    editor.transformLayer(layerId, attrs, false);
                    editor.flushTransform();
                  }}
                  onBrushStroke={editor.addBrushStroke}
                  onCreateBrushLayer={editor.ensureBrushLayer}
                />
              )}
            </div>

            <EditorHistoryPanel items={editor.historyItems} activeIndex={editor.historyIndex} onJump={editor.jumpToHistory} />

            <div className="shrink-0 border-t bg-background px-2 py-2 space-y-2 max-h-[34vh] overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => (
                  <Button key={p.id} type="button" size="sm" variant="outline" className="rounded-full h-6 px-2 text-[10px]" disabled={busy || !project} onClick={() => editor.applyCropAspect(p.aspect)}>
                    {p.label}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px]" onClick={editor.toggleSnap}>
                  스냅 {project?.snapEnabled ? "ON" : "OFF"}
                </Button>
              </div>

              {activeLayer && (
                <div className="flex flex-wrap items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => editor.rotateLayer(activeLayer.id, -90)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => editor.rotateLayer(activeLayer.id, 90)}>
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                  {(activeLayer.type === "background" || activeLayer.type === "image") && (
                    <>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => editor.flipLayer(activeLayer.id, "x")}>
                        <FlipHorizontal2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => editor.flipLayer(activeLayer.id, "y")}>
                        <FlipVertical2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <input type="range" min={0} max={1} step={0.01} value={activeLayer.opacity} onChange={(e) => editor.setOpacity(activeLayer.id, Number(e.target.value))} className="flex-1 min-w-[80px] accent-primary" />
                </div>
              )}

              <input id={fileInputId} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files?.length) void editor.addImageFiles(e.target.files); e.target.value = ""; }} />

              {watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
                <WatermarkToggleButtons value={watermarkOptions} onChange={onWatermarkOptionsChange} disabled={busy} />
              ) : null}

              <div className="flex items-center gap-2 flex-wrap">
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)} className="text-[10px] rounded border px-2 py-1 bg-background" disabled={busy}>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WEBP</option>
                </select>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" disabled={!project} onClick={() => project && downloadProjectJson(project)}>
                  <Download className="h-3 w-3 mr-1" />
                  JSON
                </Button>
                {recentProjects.slice(0, 3).map((rp) => (
                  <button key={rp.meta.id} type="button" className="text-[10px] underline text-muted-foreground" onClick={() => editor.loadProject(rp)}>
                    {rp.meta.title}
                  </button>
                ))}
                <div className="flex gap-1 ml-auto">
                  {ZOOM_STEPS.map((z) => (
                    <button key={z} type="button" className={cn("text-[9px] px-1.5 py-0.5 rounded border", Math.abs(viewportZoom - z) < 0.05 && "border-primary bg-primary/10")} onClick={() => setViewportZoom(z)}>
                      {z * 100}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden lg:flex w-52 xl:w-60 shrink-0 border-l min-h-0 flex-col">
            {project ? (
              <>
                <div className="flex-1 min-h-0 border-b">
                  <EditorLayerPanel
                    project={project}
                    onSelect={editor.selectLayer}
                    onToggleVisible={editor.toggleVisible}
                    onToggleLocked={editor.toggleLocked}
                    onDelete={editor.deleteLayer}
                    onDuplicate={editor.dupLayer}
                    onMove={editor.moveLayerOrder}
                  />
                </div>
                <div className="h-[42%] min-h-[160px]">
                  <EditorPropertiesPanel
                    project={project}
                    activeLayer={activeLayer}
                    activeTool={editor.activeTool}
                    brushSettings={editor.brushSettings}
                    onPatchText={(patch) => activeLayer?.type === "text" && editor.patchLayer(activeLayer.id, (l) => l.type === "text" ? { ...l, data: { ...l.data, ...patch } } : l)}
                    onAddEmoji={editor.addEmojiLayer}
                    onAddSticker={editor.addSticker}
                    onAddShape={editor.addShape}
                    onSetBrush={(p) => editor.setBrushSettings((b) => ({ ...b, ...p }))}
                    onSetEffects={(p) => activeLayer && editor.setImageEffects(activeLayer.id, p)}
                    onAlign={editor.alignActive}
                    onRename={editor.renameActiveLayer}
                  />
                </div>
              </>
            ) : null}
          </aside>
        </div>

        <div className="lg:hidden border-t flex">
          {(["tools", "layers", "props"] as const).map((tab) => (
            <button key={tab} type="button" className={cn("flex-1 py-2 text-xs", mobilePanel === tab && "bg-primary/10 text-primary font-semibold")} onClick={() => setMobilePanel(tab)}>
              {tab === "tools" ? "도구" : tab === "layers" ? "레이어" : "속성"}
            </button>
          ))}
        </div>
        {mobilePanel !== "tools" && project && (
          <div className="lg:hidden max-h-[28vh] overflow-y-auto border-t">
            {mobilePanel === "layers" ? (
              <EditorLayerPanel project={project} onSelect={editor.selectLayer} onToggleVisible={editor.toggleVisible} onToggleLocked={editor.toggleLocked} onDelete={editor.deleteLayer} onDuplicate={editor.dupLayer} onMove={editor.moveLayerOrder} />
            ) : (
              <EditorPropertiesPanel
                project={project}
                activeLayer={activeLayer}
                activeTool={editor.activeTool}
                brushSettings={editor.brushSettings}
                onPatchText={(patch) => activeLayer?.type === "text" && editor.patchLayer(activeLayer.id, (l) => l.type === "text" ? { ...l, data: { ...l.data, ...patch } } : l)}
                onAddEmoji={editor.addEmojiLayer}
                onAddSticker={editor.addSticker}
                onAddShape={editor.addShape}
                onSetBrush={(p) => editor.setBrushSettings((b) => ({ ...b, ...p }))}
                onSetEffects={(p) => activeLayer && editor.setImageEffects(activeLayer.id, p)}
                onAlign={editor.alignActive}
                onRename={editor.renameActiveLayer}
              />
            )}
          </div>
        )}
        <div className="lg:hidden border-t p-2">
          <EditorToolPanel active={editor.activeTool} onSelect={editor.setActiveTool} onAddText={editor.addTextLayer} onAddBlur={editor.addBlurOverlay} onAddOverlay={editor.addColorOverlay} fileInputId={fileInputId} />
        </div>

        <div className="shrink-0 border-t px-3 py-2 flex gap-2 pb-safe">
          <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => onOpenChange(false)} disabled={busy}>
            취소
          </Button>
          <Button type="button" className="rounded-xl flex-1" onClick={apply} disabled={busy || loading || !project}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />업로드…</> : "적용"}
          </Button>
        </div>
        {error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
