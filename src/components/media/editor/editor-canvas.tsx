"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import type { BrushStroke, CropRect, EditorProject } from "@/lib/media-editor/types";
import type { GuideLine } from "@/lib/media-editor/types";
import { EditorLayerNode } from "@/components/media/editor/editor-layer-node";

type EditorCanvasProps = {
  project: EditorProject;
  stageRef: React.RefObject<Konva.Stage | null>;
  contentGroupRef: React.RefObject<Konva.Group | null>;
  stageWidth: number;
  stageHeight: number;
  viewportZoom: number;
  viewportOffset: { x: number; y: number };
  brushMode: boolean;
  brushSettings: Pick<BrushStroke, "color" | "size" | "opacity" | "tool">;
  activeBrushLayerId: string | null;
  cropAspect?: number;
  onSelectLayer: (id: string | null) => void;
  onEditText?: (layerId: string) => void;
  onTransformEnd: (layerId: string, attrs: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }) => void;
  onBrushStroke: (layerId: string, stroke: BrushStroke) => void;
  onCreateBrushLayer: () => string;
  onCropChange: (crop: CropRect, opts?: { debounced?: boolean }) => void;
  onCropCommit: () => void;
};

export function EditorCanvas({
  project,
  stageRef,
  contentGroupRef,
  stageWidth,
  stageHeight,
  viewportZoom,
  viewportOffset,
  brushMode,
  brushSettings,
  activeBrushLayerId,
  cropAspect,
  onSelectLayer,
  onEditText,
  onTransformEnd,
  onBrushStroke,
  onCreateBrushLayer,
  onCropChange,
  onCropCommit,
}: EditorCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const cropRectRef = useRef<Konva.Rect>(null);
  const cropTransformerRef = useRef<Konva.Transformer>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const drawing = useRef(false);
  const currentPoints = useRef<number[]>([]);
  const brushLayerId = useRef<string | null>(activeBrushLayerId);

  const activeLayer = project.layers.find((l) => l.id === project.activeLayerId) ?? null;
  // 오버레이 레이어가 선택되지 않았을 때(배경/없음)만 크롭 프레임을 편집한다.
  const cropMode = !brushMode && (!activeLayer || activeLayer.type === "background");

  useEffect(() => {
    brushLayerId.current = activeBrushLayerId;
  }, [activeBrushLayerId]);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (
      !tr ||
      !stage ||
      !activeLayer ||
      activeLayer.locked ||
      activeLayer.type === "brush" ||
      activeLayer.type === "background"
    ) {
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${activeLayer.id}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [activeLayer, project.layers, stageRef, brushMode]);

  // 크롭 트랜스포머를 크롭 프레임에 붙인다(크롭 모드일 때만).
  useEffect(() => {
    const tr = cropTransformerRef.current;
    const node = cropRectRef.current;
    if (!tr) return;
    if (cropMode && node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [cropMode, project.crop, viewportZoom, viewportOffset]);

  function readCropFromNode(): CropRect | null {
    const node = cropRectRef.current;
    if (!node) return null;
    const w = Math.max(1, node.width() * node.scaleX());
    const h = Math.max(1, node.height() * node.scaleY());
    const crop = { x: node.x(), y: node.y(), width: w, height: h };
    node.scaleX(1);
    node.scaleY(1);
    node.width(w);
    node.height(h);
    return crop;
  }

  const cropOverlay = useMemo(() => {
    const { crop, width, height } = project;
    const dimPaths = [
      { x: 0, y: 0, width, height: crop.y },
      { x: 0, y: crop.y + crop.height, width, height: height - crop.y - crop.height },
      { x: 0, y: crop.y, width: crop.x, height: crop.height },
      { x: crop.x + crop.width, y: crop.y, width: width - crop.x - crop.width, height: crop.height },
    ];
    return { crop, dimPaths };
  }, [project]);

  function pointerToCanvas(stage: Konva.Stage) {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - viewportOffset.x) / viewportZoom,
      y: (pos.y - viewportOffset.y) / viewportZoom,
    };
  }

  function handlePointerDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (brushMode) {
      const stage = e.target.getStage();
      if (!stage) return;
      const p = pointerToCanvas(stage);
      if (!p) return;
      drawing.current = true;
      if (!brushLayerId.current) brushLayerId.current = onCreateBrushLayer();
      currentPoints.current = [p.x, p.y];
      return;
    }
    if (e.target === e.target.getStage()) onSelectLayer(null);
  }

  function handlePointerMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!brushMode || !drawing.current) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const p = pointerToCanvas(stage);
    if (!p || !brushLayerId.current) return;
    currentPoints.current = [...currentPoints.current, p.x, p.y];
  }

  function handlePointerUp() {
    if (!brushMode || !drawing.current || !brushLayerId.current) return;
    drawing.current = false;
    if (currentPoints.current.length >= 2) {
      onBrushStroke(brushLayerId.current, {
        points: [...currentPoints.current],
        ...brushSettings,
      });
    }
    currentPoints.current = [];
  }

  return (
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      onMouseDown={handlePointerDown}
      onMousemove={handlePointerMove}
      onMouseup={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className="absolute inset-0 touch-none"
    >
      <Layer>
        {/* 내보내기 대상: 배경 + 오버레이 (UI 장식 없음) */}
        <Group
          ref={contentGroupRef}
          x={viewportOffset.x}
          y={viewportOffset.y}
          scaleX={viewportZoom}
          scaleY={viewportZoom}
          clipX={0}
          clipY={0}
          clipWidth={project.width}
          clipHeight={project.height}
        >
          <Rect x={0} y={0} width={project.width} height={project.height} fill="transparent" listening={false} />
          {project.layers.map((layer) => (
            <EditorLayerNode
              key={layer.id}
              layer={layer}
              project={project}
              onSelect={() => !layer.locked && !brushMode && onSelectLayer(layer.id)}
              onEditText={onEditText}
              onTransformEnd={(attrs) => onTransformEnd(layer.id, attrs)}
              onGuidesChange={setGuides}
            />
          ))}
        </Group>

        {/* UI 장식: 어두운 영역 · 가이드 (비상호작용) */}
        <Group
          x={viewportOffset.x}
          y={viewportOffset.y}
          scaleX={viewportZoom}
          scaleY={viewportZoom}
          listening={false}
        >
          {cropOverlay.dimPaths.map((d, i) => (
            <Rect key={`dim-${i}`} x={d.x} y={d.y} width={d.width} height={d.height} fill="rgba(0,0,0,0.45)" listening={false} />
          ))}
          {project.showGuides &&
            guides.map((g, i) =>
              g.orientation === "v" ? (
                <Line key={`g-${i}`} points={[g.position, 0, g.position, project.height]} stroke="#22d3ee" strokeWidth={1 / viewportZoom} listening={false} />
              ) : (
                <Line key={`g-${i}`} points={[0, g.position, project.width, g.position]} stroke="#22d3ee" strokeWidth={1 / viewportZoom} listening={false} />
              )
            )}
        </Group>

        {/* 크롭 프레임 (상호작용: 이동/리사이즈) */}
        <Group
          x={viewportOffset.x}
          y={viewportOffset.y}
          scaleX={viewportZoom}
          scaleY={viewportZoom}
        >
          <Rect
            ref={cropRectRef}
            x={cropOverlay.crop.x}
            y={cropOverlay.crop.y}
            width={cropOverlay.crop.width}
            height={cropOverlay.crop.height}
            stroke="#3b82f6"
            strokeWidth={2 / viewportZoom}
            dash={[8 / viewportZoom, 6 / viewportZoom]}
            fill="rgba(0,0,0,0.001)"
            draggable={cropMode}
            listening={cropMode}
            onDragMove={() => {
              const node = cropRectRef.current;
              if (!node) return;
              onCropChange({ x: node.x(), y: node.y(), width: node.width(), height: node.height() }, { debounced: true });
            }}
            onDragEnd={onCropCommit}
            onTransform={() => {
              const crop = readCropFromNode();
              if (crop) onCropChange(crop, { debounced: true });
            }}
            onTransformEnd={onCropCommit}
          />
        </Group>

        {/* 레이어 트랜스포머: Shift 시 비율 고정(keepRatio=false + 기본 shiftBehavior) */}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          keepRatio={false}
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
        />

        {/* 크롭 트랜스포머: 자유 모드=개별 드래그, 비율 고정 모드=keepRatio */}
        <Transformer
          ref={cropTransformerRef}
          rotateEnabled={false}
          keepRatio={cropAspect !== undefined}
          enabledAnchors={
            cropAspect !== undefined
              ? ["top-left", "top-right", "bottom-left", "bottom-right"]
              : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
          }
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          borderStroke="#3b82f6"
          boundBoxFunc={(oldBox, newBox) => {
            const minX = viewportOffset.x;
            const minY = viewportOffset.y;
            const maxX = viewportOffset.x + project.width * viewportZoom;
            const maxY = viewportOffset.y + project.height * viewportZoom;
            const minSize = 24 * viewportZoom;
            let { x, y, width, height } = newBox;
            if (x < minX) { width -= minX - x; x = minX; }
            if (y < minY) { height -= minY - y; y = minY; }
            if (x + width > maxX) width = maxX - x;
            if (y + height > maxY) height = maxY - y;
            if (width < minSize || height < minSize) return oldBox;
            return { ...newBox, x, y, width, height, rotation: 0 };
          }}
        />
      </Layer>
    </Stage>
  );
}
