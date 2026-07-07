"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import type { BrushStroke, EditorProject } from "@/lib/media-editor/types";
import type { GuideLine } from "@/lib/media-editor/types";
import { EditorLayerNode } from "@/components/media/editor/editor-layer-node";

type EditorCanvasProps = {
  project: EditorProject;
  stageRef: React.RefObject<Konva.Stage | null>;
  viewportZoom: number;
  viewportOffset: { x: number; y: number };
  brushMode: boolean;
  brushSettings: Pick<BrushStroke, "color" | "size" | "opacity" | "tool">;
  activeBrushLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onTransformEnd: (layerId: string, attrs: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }) => void;
  onBrushStroke: (layerId: string, stroke: BrushStroke) => void;
  onCreateBrushLayer: () => string;
};

export function EditorCanvas({
  project,
  stageRef,
  viewportZoom,
  viewportOffset,
  brushMode,
  brushSettings,
  activeBrushLayerId,
  onSelectLayer,
  onTransformEnd,
  onBrushStroke,
  onCreateBrushLayer,
}: EditorCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const drawing = useRef(false);
  const currentPoints = useRef<number[]>([]);
  const brushLayerId = useRef<string | null>(activeBrushLayerId);

  const activeLayer = project.layers.find((l) => l.id === project.activeLayerId) ?? null;
  const stageWidth = project.width * viewportZoom;
  const stageHeight = project.height * viewportZoom;

  useEffect(() => {
    brushLayerId.current = activeBrushLayerId;
  }, [activeBrushLayerId]);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || !activeLayer || activeLayer.locked || activeLayer.type === "brush") {
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

  return (
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      scaleX={viewportZoom}
      scaleY={viewportZoom}
      x={viewportOffset.x}
      y={viewportOffset.y}
      onMouseDown={(e) => {
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
      }}
      onMousemove={(e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!brushMode || !drawing.current) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const p = pointerToCanvas(stage);
        if (!p || !brushLayerId.current) return;
        currentPoints.current = [...currentPoints.current, p.x, p.y];
      }}
      onMouseup={() => {
        if (!brushMode || !drawing.current || !brushLayerId.current) return;
        drawing.current = false;
        if (currentPoints.current.length >= 2) {
          onBrushStroke(brushLayerId.current, {
            points: [...currentPoints.current],
            ...brushSettings,
          });
        }
        currentPoints.current = [];
      }}
      onTouchStart={(e) => {
        if (brushMode) return;
        if (e.target === e.target.getStage()) onSelectLayer(null);
      }}
      className="bg-neutral-900 touch-none"
    >
      <Layer>
        <Rect x={0} y={0} width={project.width} height={project.height} fill="#ffffff" listening={false} />
        {project.layers.map((layer) => (
          <EditorLayerNode
            key={layer.id}
            layer={layer}
            project={project}
            onSelect={() => !layer.locked && !brushMode && onSelectLayer(layer.id)}
            onTransformEnd={(attrs) => onTransformEnd(layer.id, attrs)}
            onGuidesChange={setGuides}
          />
        ))}
        {cropOverlay.dimPaths.map((d, i) => (
          <Rect key={`dim-${i}`} x={d.x} y={d.y} width={d.width} height={d.height} fill="rgba(0,0,0,0.45)" listening={false} />
        ))}
        <Rect
          x={cropOverlay.crop.x}
          y={cropOverlay.crop.y}
          width={cropOverlay.crop.width}
          height={cropOverlay.crop.height}
          stroke="#3b82f6"
          strokeWidth={2 / viewportZoom}
          dash={[8 / viewportZoom, 6 / viewportZoom]}
          listening={false}
        />
        {project.showGuides &&
          guides.map((g, i) =>
            g.orientation === "v" ? (
              <Line key={`g-${i}`} points={[g.position, 0, g.position, project.height]} stroke="#22d3ee" strokeWidth={1 / viewportZoom} listening={false} />
            ) : (
              <Line key={`g-${i}`} points={[0, g.position, project.width, g.position]} stroke="#22d3ee" strokeWidth={1 / viewportZoom} listening={false} />
            )
          )}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  );
}
