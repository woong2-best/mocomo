"use client";

import { useEffect, useMemo, useRef } from "react";
import { Layer, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import type { EditorLayer, EditorProject } from "@/lib/media-editor/types";
import { EditorImageNode } from "@/components/media/editor/editor-image-node";

type EditorCanvasProps = {
  project: EditorProject;
  stageRef: React.RefObject<Konva.Stage | null>;
  viewportZoom: number;
  viewportOffset: { x: number; y: number };
  onSelectLayer: (id: string | null) => void;
  onTransformEnd: (layerId: string, attrs: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }) => void;
};

export function EditorCanvas({
  project,
  stageRef,
  viewportZoom,
  viewportOffset,
  onSelectLayer,
  onTransformEnd,
}: EditorCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const activeLayer = project.layers.find((l) => l.id === project.activeLayerId) ?? null;

  const stageWidth = project.width * viewportZoom;
  const stageHeight = project.height * viewportZoom;

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || !activeLayer || activeLayer.locked) {
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${activeLayer.id}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [activeLayer, project.layers, stageRef]);

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
        if (e.target === e.target.getStage()) onSelectLayer(null);
      }}
      onTouchStart={(e) => {
        if (e.target === e.target.getStage()) onSelectLayer(null);
      }}
      className="bg-neutral-900"
    >
      <Layer>
        <Rect x={0} y={0} width={project.width} height={project.height} fill="#ffffff" listening={false} />
        {project.layers.map((layer) => (
          <EditorImageNode
            key={layer.id}
            layer={layer}
            onSelect={() => !layer.locked && onSelectLayer(layer.id)}
            onDragEnd={(attrs) => onTransformEnd(layer.id, attrs)}
            onTransformEnd={(attrs) => onTransformEnd(layer.id, attrs)}
          />
        ))}
        {cropOverlay.dimPaths.map((d, i) => (
          <Rect
            key={`dim-${i}`}
            x={d.x}
            y={d.y}
            width={d.width}
            height={d.height}
            fill="rgba(0,0,0,0.45)"
            listening={false}
          />
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
        <Transformer
          ref={transformerRef}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 16 || newBox.height < 16) return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
