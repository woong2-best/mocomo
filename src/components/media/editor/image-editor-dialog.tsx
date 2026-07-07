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

  // 줌·회전 슬라이더는 항상 배경(사진)을 대상으로 하고, 크롭 프레임을 덮는
  // 최소 배율 아래로는 내려가지 않도록 클램프한다(흰 여백 방지).
  const bg = bgLayer && bgLayer.type === "background" ? bgLayer : null;
  const MAX_ZOOM = 4; // 커버 기준 100% → 최대 400%

  function coverAt(rot: number): number {
    if (!bg || !project) return 1;
    return minCoverScale(
      bg.data.naturalWidth,
      bg.data.naturalHeight,
      project.crop.width,
      project.crop.height,
      rot
    );
  }

  const bgRotation = bg?.transform.rotation ?? 0;
  const bgScaleAvg = bg ? (bg.transform.scaleX + bg.transform.scaleY) / 2 : 1;
  const coverScale = coverAt(bgRotation);
  // 표시용 줌: 커버(프레임에 꽉 참) = 1.0(100%)
  const displayZoom = coverScale > 0 ? bgScaleAvg / coverScale : 1;
  const rotation = bgRotation;

  function cropCenter() {
    const c = project?.crop ?? { x: 0, y: 0, width: 0, height: 0 };
    return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  }

  function setDisplayZoom(dz: number) {
    if (!bg || !project) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(1, dz));
    const scale = coverAt(bg.transform.rotation) * clamped;
    const c = cropCenter();
    editor.transformLayer(bg.id, { scaleX: scale, scaleY: scale, x: c.x, y: c.y }, false);
    editor.flushTransform();
  }

  function setRotation(deg: number) {
    if (!bg || !project) return;
    const cover = coverAt(deg);
    const cur = (bg.transform.scaleX + bg.transform.scaleY) / 2;
    const scale = Math.max(cur, cover);
    const c = cropCenter();
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

  function handleReset() {
    if (!bg || !project) return;
    const hasEdits = project.layers.length > 1;
    if (hasEdits && typeof window !== "undefined") {
      const ok = window.confirm("추가한 레이어와 크롭·회전·확대를 모두 초기 상태로 되돌릴까요?");
      if (!ok) return;
    }
    setCropAspect(aspect);
    setLocalTool("select");
    setShowEmojiPick(false);
    setEditingTextId(null);
    editor.resetBackgroundTransform(aspect);
  }

  function onAspectPick(a?: number) {
    setCropAspect(a);
    editor.applyCropAspect(a);
  }

  function hasUnsavedEdits(): boolean {
    if (!project) return false;
    if (project.layers.length > 1) return true;
    if (cropAspect !== aspect) return true;
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
    activeLayer && activeLayer.type !== "background" && localTool !== "brush" && !editingTextId;

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

        <div className="relative z-10 shrink-0 border-t border-border bg-background pb-safe">
          {watermarkCreditLabel && watermarkOptions && onWatermarkOptionsChange ? (
            <div className="px-4 pt-3 space-y-1">
              <WatermarkToggleButtons value={watermarkOptions} onChange={onWatermarkOptionsChange} disabled={busy} />
              <p className="text-[10px] text-muted-foreground">
                업로드 전에 워터마크를 선택하세요. ({watermarkCreditLabel})
              </p>
            </div>
          ) : null}

          <div className="flex gap-2 px-4 pt-4 pb-3">
            <Button type="button" variant="outline" className="rounded-xl flex-1 h-11" onClick={requestClose} disabled={busy}>
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
                className="rounded-xl h-10 w-10"
                title="좌우 뒤집기"
                disabled={busy || !bg}
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
                disabled={busy || !bg}
                onClick={() => toggleFlip("y")}
              >
                <FlipVertical2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="축소" disabled={busy || !bg || displayZoom <= 1.001} onClick={() => setDisplayZoom(displayZoom - 0.15)}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="rounded-xl h-10 w-10" title="확대" disabled={busy || !bg || displayZoom >= MAX_ZOOM - 0.001} onClick={() => setDisplayZoom(displayZoom + 0.15)}>
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
                  <span>{Math.round(displayZoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={displayZoom}
                  onChange={(e) => setDisplayZoom(Number(e.target.value))}
                  className="w-full accent-primary h-8"
                  disabled={busy || !bg}
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
                  disabled={busy || !bg}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
