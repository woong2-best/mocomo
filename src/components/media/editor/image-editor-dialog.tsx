"use client";

import { useEffect, useId, useRef, useState } from "react";
import type Konva from "konva";
import {
  FlipHorizontal2,
  FlipVertical2,
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
import { EditorSelectionToolbar } from "@/components/media/editor/editor-selection-toolbar";
import { EditorInlineText } from "@/components/media/editor/editor-inline-text";
import { useImageEditor } from "@/hooks/use-image-editor";
import { createProjectFromImageSrc } from "@/lib/media-editor/layers";
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

type LocalTool = "select" | "brush" | "emoji" | "shape";

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageSrc,
  title = "사진 편집",
  description = "드래그·확대·90° 회전·뒤집기·자유 각도·비율 변경 후 적용하세요.",
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
  const [localTool, setLocalTool] = useState<LocalTool>("select");
  const [showEmojiPick, setShowEmojiPick] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const pendingTextEdit = useRef(false);

  const editor = useImageEditor(null);
  const { project, resetHistory } = editor;

  const presets = lockAspect ? aspectPresets.filter((p) => p.aspect === aspect) : aspectPresets;
  const activeLayer = project?.layers.find((l) => l.id === project.activeLayerId) ?? null;
  const bgLayer = project?.layers.find((l) => l.type === "background") ?? null;
  const targetLayer = activeLayer && activeLayer.type !== "background" ? activeLayer : bgLayer;
  const brushMode = localTool === "brush";

  const pad = 8;
  const fitZoom =
    project && containerSize.w > 0 && containerSize.h > 0
      ? Math.max(
          0.01,
          Math.min(
            (containerSize.w - pad) / project.width,
            (containerSize.h - pad) / project.height,
            1
          )
        )
      : 0;
  const canvasOffset = project
    ? {
        x: (containerSize.w - project.width * fitZoom) / 2,
        y: (containerSize.h - project.height * fitZoom) / 2,
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
    setLocalTool("select");
    setShowEmojiPick(false);
    setEditingTextId(null);
    pendingTextEdit.current = false;
    setCropAspect(lockAspect ? aspect : aspect);
    void createProjectFromImageSrc(imageSrc, { maxWidth, maxHeight, defaultAspect: aspect })
      .then((p) => {
        if (cancelled) return;
        let next = p;
        if (lockAspect) next = { ...p, crop: fitCropRect(p.width, p.height, aspect) };
        else next = { ...p, crop: fitCropRect(p.width, p.height, cropAspect) };
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
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const raf = requestAnimationFrame(measure);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [open]);

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

  const rotation = targetLayer?.transform.rotation ?? 0;
  const zoomScale = targetLayer
    ? Math.round(((targetLayer.transform.scaleX + targetLayer.transform.scaleY) / 2) * 100) / 100
    : 1;

  function setRotation(deg: number) {
    if (!targetLayer || !project) return;
    editor.transformLayer(targetLayer.id, { rotation: deg }, false);
    editor.flushTransform();
  }

  function setZoomScale(z: number) {
    if (!targetLayer || !project) return;
    editor.transformLayer(targetLayer.id, { scaleX: z, scaleY: z }, false);
    editor.flushTransform();
  }

  function rotateBy(deg: number) {
    setRotation(rotation + deg);
  }

  function toggleFlip(axis: "x" | "y") {
    if (!targetLayer || (targetLayer.type !== "background" && targetLayer.type !== "image")) return;
    editor.flipLayer(targetLayer.id, axis);
  }

  function handleReset() {
    if (!bgLayer || !project) return;
    editor.transformLayer(bgLayer.id, { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }, false);
    editor.flushTransform();
    if (!lockAspect) {
      setCropAspect(aspect);
      editor.applyCropAspect(aspect);
    }
  }

  function onAspectPick(a?: number) {
    setCropAspect(a);
    editor.applyCropAspect(a);
  }

  async function apply() {
    const contentNode = contentGroupRef.current;
    if (!contentNode || !project) return;
    setBusy(true);
    setError("");
    try {
      editor.flushTransform();
      const blob = await exportStageToBlob(contentNode, project.crop, {
        mimeType: "image/jpeg",
        quality: 0.9,
        maxWidth,
        maxHeight,
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
    activeLayer && activeLayer.type !== "background" && localTool !== "brush" && !editingTextId;

  const editingTextLayer =
    editingTextId && project
      ? (project.layers.find((l) => l.id === editingTextId && l.type === "text") as
          | (EditorLayer & { type: "text" })
          | undefined)
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent layer="stack" className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[96vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          ref={photoRef}
          className="relative w-full h-[min(44vh,320px)] sm:h-[min(48vh,360px)] bg-neutral-900 shrink-0 touch-none flex items-center justify-center overflow-hidden"
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
                onSelectLayer={(id) => {
                  editor.selectLayer(id);
                  setLocalTool("select");
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
                  setLocalTool("select");
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
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-background pb-safe">
          {watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
            <div className="px-4 pt-3 space-y-1">
              <WatermarkToggleButtons value={watermarkOptions} onChange={onWatermarkOptionsChange} disabled={busy} />
              <p className="text-[10px] text-muted-foreground">
                업로드 전에 워터마크를 선택하세요. ({watermarkCreditLabel})
              </p>
            </div>
          ) : null}

          <div className="flex gap-2 px-4 pt-4 pb-3">
            <Button type="button" variant="outline" className="rounded-xl flex-1 h-11" onClick={() => onOpenChange(false)} disabled={busy}>
              취소
            </Button>
            <Button type="button" className="rounded-xl flex-1 h-11" onClick={apply} disabled={busy || loading || !project}>
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

          {error && <p className="px-4 -mt-1 pb-2 text-sm text-destructive">{error}</p>}

          <div className="px-4 pb-4 space-y-3 max-h-[38vh] overflow-y-auto overscroll-contain">
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
                  setLocalTool("select");
                }}
              />
              <Button
                type="button"
                size="sm"
                variant={localTool === "select" && activeLayer?.type === "text" ? "default" : "outline"}
                className="rounded-full h-8 px-3 text-xs"
                disabled={busy}
                onClick={() => {
                  editor.addTextLayer();
                  pendingTextEdit.current = true;
                  setLocalTool("select");
                  setShowEmojiPick(false);
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
                  setLocalTool("select");
                }}
              >
                이모지
              </Button>
              <Button
                type="button"
                size="sm"
                variant={localTool === "shape" ? "default" : "outline"}
                className="rounded-full h-8 px-3 text-xs"
                disabled={busy}
                onClick={() => {
                  setLocalTool((t) => (t === "shape" ? "select" : "shape"));
                  setShowEmojiPick(false);
                }}
              >
                도형
              </Button>
              <Button
                type="button"
                size="sm"
                variant={localTool === "brush" ? "default" : "outline"}
                className="rounded-full h-8 px-3 text-xs"
                disabled={busy}
                onClick={() => {
                  setLocalTool((t) => (t === "brush" ? "select" : "brush"));
                  setShowEmojiPick(false);
                  if (localTool !== "brush") editor.ensureBrushLayer();
                }}
              >
                그리기
              </Button>
            </div>

            {showEmojiPick && (
              <div className="flex flex-wrap gap-1">
                {EMOJI_QUICK_PICK.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="text-xl p-1.5 rounded-lg hover:bg-muted"
                    onClick={() => {
                      editor.addEmojiLayer(e);
                      setShowEmojiPick(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {localTool === "shape" && (
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
                      setLocalTool("select");
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}

            {localTool === "brush" && (
              <div className="flex flex-wrap items-center gap-3">
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
            )}

            {activeLayer?.type === "text" && (
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
                <Button
                  type="button"
                  size="sm"
                  variant={activeLayer.data.fontStyle.includes("italic") ? "default" : "outline"}
                  className="rounded-full h-8 w-8 text-xs italic"
                  onClick={() =>
                    editor.patchLayer(activeLayer.id, (l) => {
                      if (l.type !== "text") return l;
                      const bold = l.data.fontStyle.includes("bold");
                      const italic = l.data.fontStyle.includes("italic");
                      const next = `${bold ? "bold" : ""}${italic ? "" : " italic"}`.trim() || "normal";
                      return { ...l, data: { ...l.data, fontStyle: next as typeof l.data.fontStyle } };
                    })
                  }
                >
                  I
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeLayer.data.textDecoration.includes("underline") ? "default" : "outline"}
                  className="rounded-full h-8 w-8 text-xs underline"
                  onClick={() =>
                    editor.patchLayer(activeLayer.id, (l) =>
                      l.type === "text"
                        ? {
                            ...l,
                            data: {
                              ...l.data,
                              textDecoration: l.data.textDecoration ? "" : "underline",
                            },
                          }
                        : l
                    )
                  }
                >
                  U
                </Button>
                {(["left", "center", "right"] as const).map((align) => (
                  <Button
                    key={align}
                    type="button"
                    size="sm"
                    variant={activeLayer.data.align === align ? "default" : "outline"}
                    className="rounded-full h-8 px-2 text-[10px]"
                    onClick={() =>
                      editor.patchLayer(activeLayer.id, (l) =>
                        l.type === "text" ? { ...l, data: { ...l.data, align } } : l
                      )
                    }
                  >
                    {align === "left" ? "좌" : align === "center" ? "중" : "우"}
                  </Button>
                ))}
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
            )}

            {!lockAspect && presets.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
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
                    onClick={() => onAspectPick(p.aspect)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="실행 취소" disabled={busy || !editor.canUndo} onClick={editor.undo}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="다시 실행" disabled={busy || !editor.canRedo} onClick={editor.redo}>
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="90° 왼쪽" disabled={busy} onClick={() => rotateBy(-90)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="90° 오른쪽" disabled={busy} onClick={() => rotateBy(90)}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn("rounded-xl h-10 w-10", targetLayer?.type === "background" || targetLayer?.type === "image" ? "" : "opacity-40")}
                title="좌우 뒤집기"
                disabled={busy || !targetLayer || (targetLayer.type !== "background" && targetLayer.type !== "image")}
                onClick={() => toggleFlip("x")}
              >
                <FlipHorizontal2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl h-10 w-10"
                title="상하 뒤집기"
                disabled={busy || !targetLayer || (targetLayer.type !== "background" && targetLayer.type !== "image")}
                onClick={() => toggleFlip("y")}
              >
                <FlipVertical2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="축소" disabled={busy || zoomScale <= 0.2} onClick={() => setZoomScale(Math.max(0.2, zoomScale - 0.15))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="확대" disabled={busy || zoomScale >= 6} onClick={() => setZoomScale(Math.min(6, zoomScale + 0.15))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="rounded-xl text-xs h-10 px-3" disabled={busy} onClick={handleReset}>
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
                  <span>{Math.round(zoomScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={6}
                  step={0.01}
                  value={zoomScale}
                  onChange={(e) => setZoomScale(Number(e.target.value))}
                  className="w-full accent-primary h-8"
                  disabled={busy || !targetLayer}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="h-3.5 w-3.5" />
                    회전
                  </span>
                  <span className="tabular-nums">{Math.round(rotation)}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={0.5}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-primary h-8"
                  disabled={busy || !targetLayer}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
