"use client";

import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import type Konva from "konva";
import {
  Crop,
  Droplets,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  Paintbrush,
  RotateCcw,
  RotateCw,
  Sun,
  Type,
} from "lucide-react";
import { EFFECT_SLIDERS } from "@/lib/media-editor/effects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EditorCanvas } from "@/components/media/editor/editor-canvas";
import { EditorSelectionToolbar } from "@/components/media/editor/editor-selection-toolbar";
import { EditorInlineText } from "@/components/media/editor/editor-inline-text";
import { useImageEditor } from "@/hooks/use-image-editor";
import { createProjectFromImageSrc, minCoverScale } from "@/lib/media-editor/layers";
import { fitCropRect } from "@/lib/media-editor/crop-presets";
import { exportStageToBlob } from "@/lib/media-editor/export";
import { uploadImageBlob, type UploadMediaOptions } from "@/lib/client-upload";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { WatermarkToggleButtons } from "@/components/media/watermark-toggle-buttons";
import type { CropAspectPreset, EditorLayer, ShapeKind } from "@/lib/media-editor/types";
import { EDITOR_FONTS, EMOJI_QUICK_PICK } from "@/lib/media-editor/constants";
import { cn } from "@/lib/utils";

export type CropAspectPresetExport = CropAspectPreset;

const DEFAULT_ASPECT_PRESETS: CropAspectPreset[] = [
  { id: "free", label: "자유" },
  { id: "1:1", label: "1:1", aspect: 1 },
  { id: "4:5", label: "4:5", aspect: 4 / 5 },
  { id: "3:4", label: "3:4", aspect: 3 / 4 },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
];

const SHAPE_OPTIONS: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "□" },
  { id: "circle", label: "○" },
  { id: "arrow", label: "→" },
  { id: "line", label: "—" },
];

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

const FONT_LABELS = ["기본", "세리프", "임팩트", "고정폭", "캐주얼"];

type LocalTool = "crop" | "adjust" | "draw" | "markup" | "watermark";

const EDITOR_TOOLS: {
  id: LocalTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
  watermarkOnly?: boolean;
}[] = [
  { id: "crop", label: "자르기", icon: Crop },
  { id: "adjust", label: "보정", icon: Sun },
  { id: "draw", label: "그리기", icon: Paintbrush },
  { id: "markup", label: "텍스트", icon: Type },
  { id: "watermark", label: "워터마크", icon: Droplets, watermarkOnly: true },
];

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  title = "사진 편집",
  description = "자르고 회전한 뒤 적용하세요.",
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
  aspectPresets = DEFAULT_ASPECT_PRESETS,
}: ImageEditorDialogProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const contentGroupRef = useRef<Konva.Group>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const fileInputId = useId();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [cropAspect, setCropAspect] = useState<number | undefined>(aspect);
  const [localTool, setLocalTool] = useState<LocalTool>("crop");
  const [showEmojiPick, setShowEmojiPick] = useState(false);
  const [showShapePick, setShowShapePick] = useState(false);
  const [showAspectPick, setShowAspectPick] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const pendingTextEdit = useRef(false);

  const editor = useImageEditor(null);
  const { project, resetHistory } = editor;

  const presets = lockAspect ? aspectPresets.filter((p) => p.aspect === aspect) : aspectPresets;
  const activeLayer = project?.layers.find((l) => l.id === project.activeLayerId) ?? null;
  const bgLayer = project?.layers.find((l) => l.type === "background") ?? null;
  const brushMode = localTool === "draw";
  const cropEditing = localTool === "crop";
  const activeAspectLabel =
    presets.find((p) =>
      p.aspect === undefined ? cropAspect === undefined : p.aspect === cropAspect
    )?.label ?? "자유";

  const pad = 8;
  const viewBox = project
    ? cropEditing
      ? { x: 0, y: 0, width: project.width, height: project.height }
      : project.crop
    : { x: 0, y: 0, width: 0, height: 0 };
  const fitZoom =
    project && containerSize.w > 0 && containerSize.h > 0 && viewBox.width > 0 && viewBox.height > 0
      ? Math.max(
          0.01,
          Math.min(
            (containerSize.w - pad) / viewBox.width,
            (containerSize.h - pad) / viewBox.height,
            1
          )
        )
      : 0;
  const canvasOffset = project
    ? {
        x: (containerSize.w - viewBox.width * fitZoom) / 2 - viewBox.x * fitZoom,
        y: (containerSize.h - viewBox.height * fitZoom) / 2 - viewBox.y * fitZoom,
      }
    : { x: 0, y: 0 };
  const canvasReady = Boolean(project) && containerSize.w > 0 && containerSize.h > 0 && fitZoom > 0;

  useEffect(() => {
    if (!open) return;
    if (!imageSrc?.trim()) {
      setError("편집할 이미지가 없습니다.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setLocalTool("crop");
    setShowEmojiPick(false);
    setShowShapePick(false);
    setShowAspectPick(false);
    setEditingTextId(null);
    pendingTextEdit.current = false;
    // 비율 고정이 아니면 업로드 사진 비율에 캔버스를 맞추고 전체를 크롭(자유)으로 시작 → 검은 여백 없음
    const initialAspect = lockAspect ? aspect : undefined;
    setCropAspect(initialAspect);
    void createProjectFromImageSrc(imageSrc, {
      maxWidth,
      maxHeight,
      defaultAspect: aspect,
      fitToImage: !lockAspect,
    })
      .then((p) => {
        if (cancelled) return;
        const next = { ...p, crop: fitCropRect(p.width, p.height, initialAspect) };
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

  useEffect(() => {
    if (!open) return;
    const el = photoRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setContainerSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t1 = requestAnimationFrame(measure);
    const t2 = window.setTimeout(measure, 50);
    const t3 = window.setTimeout(measure, 200);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [open, project]);

  useEffect(() => {
    if (!pendingTextEdit.current || activeLayer?.type !== "text") return;
    pendingTextEdit.current = false;
    setEditingTextId(activeLayer.id);
  }, [activeLayer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editor]);

  // 배경(사진)은 항상 캔버스 전체를 덮는다. 줌/회전은 캔버스 중심을 피벗으로 하고,
  // 캔버스를 덮는 최소 배율 아래로는 내려가지 않게 클램프한다(흰 여백 방지).
  const bg = bgLayer && bgLayer.type === "background" ? bgLayer : null;
  const MAX_ZOOM = 4; // 커버 기준 100% → 최대 400%

  function coverAt(rot: number): number {
    if (!bg || !project) return 1;
    return minCoverScale(
      bg.data.naturalWidth,
      bg.data.naturalHeight,
      project.width,
      project.height,
      rot
    );
  }

  const bgRotation = bg?.transform.rotation ?? 0;
  const bgScaleAvg = bg ? (bg.transform.scaleX + bg.transform.scaleY) / 2 : 1;
  const coverScale = coverAt(bgRotation);
  // 표시용 줌: 커버(캔버스에 꽉 참) = 1.0(100%)
  const displayZoom = coverScale > 0 ? bgScaleAvg / coverScale : 1;
  const rotation = bgRotation;

  function canvasCenter() {
    return { x: (project?.width ?? 0) / 2, y: (project?.height ?? 0) / 2 };
  }

  function setDisplayZoom(dz: number) {
    if (!bg || !project) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(1, dz));
    const scale = coverAt(bg.transform.rotation) * clamped;
    const c = canvasCenter();
    editor.transformLayer(bg.id, { scaleX: scale, scaleY: scale, x: c.x, y: c.y }, false);
    editor.flushTransform();
  }

  function setRotation(deg: number) {
    if (!bg || !project) return;
    const cover = coverAt(deg);
    const cur = (bg.transform.scaleX + bg.transform.scaleY) / 2;
    const scale = Math.max(cur, cover);
    const c = canvasCenter();
    editor.transformLayer(bg.id, { rotation: deg, scaleX: scale, scaleY: scale, x: c.x, y: c.y }, false);
    editor.flushTransform();
  }

  function rotateBy(deg: number) {
    setRotation(bgRotation + deg);
  }

  function toggleFlip(axis: "x" | "y") {
    if (!bg) return;
    editor.flipLayer(bg.id, axis);
  }

  const initialAspect = lockAspect ? aspect : undefined;

  function handleReset() {
    if (!bg || !project) return;
    const hasEdits = project.layers.length > 1;
    if (hasEdits && typeof window !== "undefined") {
      const ok = window.confirm("추가한 레이어와 크롭·회전·확대를 모두 초기 상태로 되돌릴까요?");
      if (!ok) return;
    }
    setCropAspect(initialAspect);
    setLocalTool("crop");
    setShowEmojiPick(false);
    setShowShapePick(false);
    setShowAspectPick(false);
    setEditingTextId(null);
    editor.resetBackgroundTransform(initialAspect);
  }

  function onAspectPick(a?: number) {
    setCropAspect(a);
    editor.applyCropAspect(a);
  }

  function hasUnsavedEdits(): boolean {
    if (!project) return false;
    if (project.layers.length > 1) return true;
    if (cropAspect !== initialAspect) return true;
    if (bg) {
      if (Math.abs(bg.transform.rotation) > 0.01) return true;
      if (bg.data.flipX || bg.data.flipY) return true;
      if (displayZoom > 1.01) return true;
    }
    return false;
  }

  function requestClose() {
    if (busy) return;
    if (hasUnsavedEdits() && typeof window !== "undefined") {
      const ok = window.confirm("저장하지 않고 나가시겠습니까? 편집 내용이 사라집니다.");
      if (!ok) return;
    }
    onOpenChange(false);
  }

  async function apply() {
    const contentNode = contentGroupRef.current;
    if (!contentNode || !project) return;
    setBusy(true);
    setError("");
    try {
      editor.flushTransform();
      const blob = await exportStageToBlob(project, contentNode, project.crop, {
        mimeType: "image/jpeg",
        quality: 0.9,
        maxWidth,
        maxHeight,
        viewportOffset: canvasOffset,
        viewportZoom: fitZoom,
      });
      const opts =
        watermarkCreditLabel && watermarkOptions && hasActiveWatermark(watermarkOptions)
          ? { watermarkLabel: watermarkCreditLabel, watermarkOptions }
          : uploadOptions;
      const url = await uploadImageBlob(blob, uploadFilename.replace(/\.[^.]+$/, "") + ".jpg", opts);
      onComplete(url);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const showObjectToolbar =
    activeLayer && activeLayer.type !== "background" && localTool !== "draw" && !editingTextId;
  const visibleTools = EDITOR_TOOLS.filter((t) => !t.watermarkOnly || !!watermarkCreditLabel);
  const adjustSliders = EFFECT_SLIDERS.filter(
    (s) => s.key === "brightness" || s.key === "contrast" || s.key === "saturation"
  );

  function selectTool(id: LocalTool) {
    setShowEmojiPick(false);
    setShowShapePick(false);
    setShowAspectPick(false);
    setLocalTool(id);
    if (id === "crop" && bg) editor.selectLayer(bg.id);
    if (id === "draw") {
      editor.selectLayer(null);
      editor.ensureBrushLayer();
    }
  }

  function iconBtnClass(active?: boolean) {
    return cn(
      "h-11 w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40",
      active && "bg-primary/10 text-primary"
    );
  }

  const editingTextLayer =
    editingTextId && project
      ? (project.layers.find((l) => l.id === editingTextId && l.type === "text") as
          | (EditorLayer & { type: "text" })
          | undefined)
      : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else requestClose();
      }}
    >
      <DialogContent layer="stack" className="max-w-xl p-0 gap-0 overflow-hidden max-h-[96vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-1 pr-12 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <Button
              type="button"
              size="sm"
              className="rounded-full h-8 px-4"
              onClick={apply}
              disabled={busy || loading || !project}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "적용"}
            </Button>
          </div>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-end justify-center gap-4 sm:gap-6 px-4 pt-1 pb-2 shrink-0">
          {visibleTools.map((tool) => {
            const Icon = tool.icon;
            const active = localTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                disabled={busy}
                onClick={() => selectTool(tool.id)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[44px] pb-1 text-[11px] font-semibold border-b-2",
                  active
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        <div
          ref={photoRef}
          className="relative mx-3 w-[calc(100%-1.5rem)] h-[min(52vh,440px)] bg-[#152238] dark:bg-[#0A0E18] shrink-0 touch-none flex items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/15 shadow-[3px_4px_0_rgba(27,74,140,0.12)]"
        >
          {loading || !project || !canvasReady ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <EditorCanvas
                project={project}
                stageRef={stageRef}
                contentGroupRef={contentGroupRef}
                stageWidth={containerSize.w}
                stageHeight={containerSize.h}
                viewportZoom={fitZoom}
                viewportOffset={canvasOffset}
                brushMode={brushMode}
                brushSettings={editor.brushSettings}
                activeBrushLayerId={editor.activeBrushLayerId}
                cropAspect={cropAspect}
                cropEditing={cropEditing}
                onCropChange={(crop, opts) => editor.setCropRect(crop, opts)}
                onCropCommit={() => editor.flushTransform()}
                onSelectLayer={(id) => {
                  editor.selectLayer(id);
                  const layer = project?.layers.find((l) => l.id === id);
                  if (layer && layer.type !== "background") setLocalTool("markup");
                  setShowEmojiPick(false);
                }}
                onTransformEnd={(layerId, attrs) => {
                  editor.transformLayer(layerId, attrs, false);
                  editor.flushTransform();
                }}
                onBrushStroke={editor.addBrushStroke}
                onCreateBrushLayer={editor.ensureBrushLayer}
                onEditText={(id) => {
                  editor.selectLayer(id);
                  setEditingTextId(id);
                  setLocalTool("markup");
                }}
              />
              {editingTextLayer && (
                <EditorInlineText
                  containerRef={photoRef}
                  stageRef={stageRef}
                  layer={editingTextLayer}
                  onCommit={(text) =>
                    editor.patchLayer(editingTextLayer.id, (l) =>
                      l.type === "text" ? { ...l, data: { ...l.data, text } } : l
                    )
                  }
                  onClose={() => setEditingTextId(null)}
                />
              )}
              {showObjectToolbar && (
                <EditorSelectionToolbar
                  disabled={busy}
                  onDelete={() => editor.deleteLayer(activeLayer.id)}
                  onDuplicate={() => editor.dupLayer(activeLayer.id)}
                  onBringFront={() => editor.bringToFront(activeLayer.id)}
                  onSendBack={() => editor.sendToBack(activeLayer.id)}
                />
              )}
              {cropEditing && project ? (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white tabular-nums pointer-events-none">
                  {Math.round(project.crop.width)} × {Math.round(project.crop.height)}
                </div>
              ) : null}
            </>
          )}
        </div>

        {localTool === "crop" ? (
          <div className="shrink-0 px-4 pt-2 pb-1">
            <p className="text-center text-xs tabular-nums text-muted-foreground">{Math.round(rotation)}°</p>
            <input
              type="range"
              min={-180}
              max={180}
              step={0.5}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full accent-primary h-7"
              disabled={busy || !bg}
              aria-label="회전"
            />
          </div>
        ) : null}

        <div className="relative z-10 shrink-0 bg-background pb-safe">
          {error ? <p className="px-4 pt-2 text-sm text-destructive">{error}</p> : null}

          {localTool === "crop" ? (
            <div className="px-4 pb-4 pt-1 space-y-2">
              {!lockAspect && showAspectPick && presets.length > 1 ? (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {presets.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={
                        (p.aspect === undefined && cropAspect === undefined) || p.aspect === cropAspect
                          ? "default"
                          : "outline"
                      }
                      className="rounded-full h-8 px-3 text-xs"
                      disabled={busy}
                      onClick={() => {
                        onAspectPick(p.aspect);
                        setShowAspectPick(false);
                      }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button type="button" className={iconBtnClass()} title="90° 왼쪽" disabled={busy} onClick={() => rotateBy(-90)}>
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button type="button" className={iconBtnClass()} title="90° 오른쪽" disabled={busy} onClick={() => rotateBy(90)}>
                    <RotateCw className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={busy || lockAspect}
                  onClick={() => setShowAspectPick((v) => !v)}
                  className="flex flex-col items-center gap-0.5 min-w-[64px] text-xs font-semibold text-foreground disabled:opacity-40"
                >
                  <Crop className="h-5 w-5" />
                  {activeAspectLabel}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={iconBtnClass(!!bg?.data.flipX)}
                    title="좌우 뒤집기"
                    disabled={busy || !bg}
                    onClick={() => toggleFlip("x")}
                  >
                    <FlipHorizontal2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className={iconBtnClass(!!bg?.data.flipY)}
                    title="상하 뒤집기"
                    disabled={busy || !bg}
                    onClick={() => toggleFlip("y")}
                  >
                    <FlipVertical2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={busy} onClick={handleReset}>
                  초기화
                </button>
              </div>
            </div>
          ) : null}

          {localTool === "adjust" && bg ? (
            <div className="px-4 pb-4 pt-2 space-y-3">
              {adjustSliders.map((s) => {
                const value = bg.data.effects?.[s.key] ?? s.default;
                return (
                  <label key={s.key} className="block space-y-1">
                    <span className="flex items-center justify-between text-xs text-muted-foreground">
                      {s.label}
                      <span className="tabular-nums">{s.key === "brightness" || s.key === "saturation" ? value.toFixed(2) : Math.round(Number(value))}</span>
                    </span>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={Number(value)}
                      disabled={busy}
                      className="w-full accent-primary h-7"
                      onChange={(e) => editor.setImageEffects(bg.id, { [s.key]: Number(e.target.value) })}
                    />
                  </label>
                );
              })}
              <label className="block space-y-1">
                <span className="flex items-center justify-between text-xs text-muted-foreground">
                  확대
                  <span className="tabular-nums">{Math.round(displayZoom * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={displayZoom}
                  onChange={(e) => setDisplayZoom(Number(e.target.value))}
                  className="w-full accent-primary h-7"
                  disabled={busy || !bg}
                />
              </label>
            </div>
          ) : null}

          {localTool === "draw" ? (
            <div className="flex flex-wrap items-center gap-3 px-4 pb-4 pt-2">
              <label className="flex items-center gap-2 text-xs">
                색상
                <input
                  type="color"
                  value={editor.brushSettings.color}
                  onChange={(e) => editor.setBrushSettings((b) => ({ ...b, color: e.target.value }))}
                  className="h-8 w-10 rounded border-0"
                />
              </label>
              <label className="flex-1 min-w-[120px] text-xs">
                굵기
                <input
                  type="range"
                  min={1}
                  max={32}
                  value={editor.brushSettings.size}
                  onChange={(e) => editor.setBrushSettings((b) => ({ ...b, size: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant={editor.brushSettings.tool === "eraser" ? "default" : "outline"}
                className="rounded-full h-8 px-3 text-xs"
                onClick={() =>
                  editor.setBrushSettings((b) => ({
                    ...b,
                    tool: b.tool === "eraser" ? "pen" : "eraser",
                  }))
                }
              >
                지우개
              </Button>
            </div>
          ) : null}

          {localTool === "markup" ? (
            <div className="px-4 pb-4 pt-2 space-y-3 max-h-[32vh] overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => document.getElementById(fileInputId)?.click()}
                >
                  사진 추가
                </Button>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) void editor.addImageFiles(e.target.files);
                    e.target.value = "";
                    setLocalTool("markup");
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant={activeLayer?.type === "text" ? "default" : "outline"}
                  className="rounded-full h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => {
                    editor.addTextLayer();
                    pendingTextEdit.current = true;
                    setShowEmojiPick(false);
                    setShowShapePick(false);
                  }}
                >
                  텍스트
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showEmojiPick ? "default" : "outline"}
                  className="rounded-full h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setShowEmojiPick((v) => !v);
                    setShowShapePick(false);
                  }}
                >
                  이모지
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showShapePick ? "default" : "outline"}
                  className="rounded-full h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setShowShapePick((v) => !v);
                    setShowEmojiPick(false);
                  }}
                >
                  도형
                </Button>
              </div>

              {showEmojiPick ? (
                <div className="flex flex-wrap gap-1">
                  {EMOJI_QUICK_PICK.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="text-xl p-1.5 rounded-lg hover:bg-muted"
                      onClick={() => {
                        if (activeLayer?.type === "text") {
                          editor.patchLayer(activeLayer.id, (l) =>
                            l.type === "text" ? { ...l, data: { ...l.data, text: l.data.text + e } } : l
                          );
                        } else {
                          editor.addEmojiLayer(e);
                        }
                        setShowEmojiPick(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              ) : null}

              {showShapePick ? (
                <div className="flex flex-wrap gap-1.5">
                  {SHAPE_OPTIONS.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full h-8 w-10 text-xs"
                      disabled={busy}
                      onClick={() => {
                        editor.addShape(s.id);
                        setShowShapePick(false);
                      }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              ) : null}

              {activeLayer?.type === "text" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    className="h-8 rounded-full border border-input bg-background px-2 text-xs"
                    value={activeLayer.data.fontFamily}
                    onChange={(e) =>
                      editor.patchLayer(activeLayer.id, (l) =>
                        l.type === "text" ? { ...l, data: { ...l.data, fontFamily: e.target.value } } : l
                      )
                    }
                    title="폰트"
                  >
                    {EDITOR_FONTS.map((font, i) => (
                      <option key={font} value={font}>
                        {FONT_LABELS[i] ?? font}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={activeLayer.data.fill}
                    onChange={(e) =>
                      editor.patchLayer(activeLayer.id, (l) =>
                        l.type === "text" ? { ...l, data: { ...l.data, fill: e.target.value } } : l
                      )
                    }
                    className="h-8 w-10 rounded border"
                    title="글자색"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={activeLayer.data.fontStyle.includes("bold") ? "default" : "outline"}
                    className="rounded-full h-8 w-8 text-xs font-bold"
                    onClick={() =>
                      editor.patchLayer(activeLayer.id, (l) => {
                        if (l.type !== "text") return l;
                        const bold = l.data.fontStyle.includes("bold");
                        const italic = l.data.fontStyle.includes("italic");
                        const next = `${bold ? "" : "bold"}${italic ? " italic" : ""}`.trim() || "normal";
                        return { ...l, data: { ...l.data, fontStyle: next as typeof l.data.fontStyle } };
                      })
                    }
                  >
                    B
                  </Button>
                  <input
                    type="range"
                    min={12}
                    max={96}
                    value={activeLayer.data.fontSize}
                    onChange={(e) =>
                      editor.patchLayer(activeLayer.id, (l) =>
                        l.type === "text" ? { ...l, data: { ...l.data, fontSize: Number(e.target.value) } } : l
                      )
                    }
                    className="flex-1 min-w-[80px] accent-primary"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {localTool === "watermark" && watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
            <div className="px-4 pb-4 pt-2 space-y-1">
              <WatermarkToggleButtons value={watermarkOptions} onChange={onWatermarkOptionsChange} disabled={busy} />
              <p className="text-[10px] text-muted-foreground">
                적용 시 워터마크가 함께 들어갑니다. ({watermarkCreditLabel})
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
