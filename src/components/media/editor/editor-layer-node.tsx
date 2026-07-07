"use client";

import { useEffect, useMemo, useState } from "react";
import Konva from "konva";
import { Arrow, Circle, Group, Image as KonvaImage, Line, Rect, RegularPolygon, Star, Text } from "react-konva";
import type KonvaType from "konva";
import type { EditorLayer, EditorProject, GuideLine } from "@/lib/media-editor/types";
import { snapPosition } from "@/lib/media-editor/alignment";
import { loadHtmlImage } from "@/lib/media-editor/load-image";

type TransformAttrs = { x: number; y: number; scaleX: number; scaleY: number; rotation: number };

type Props = {
  layer: EditorLayer;
  project: EditorProject;
  onSelect: () => void;
  onEditText?: (layerId: string) => void;
  onTransformEnd: (attrs: TransformAttrs) => void;
  onGuidesChange?: (guides: GuideLine[]) => void;
};

function useHtmlImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setImage(null);
    setFailed(false);
    void loadHtmlImage(src)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return { image, failed };
}

function finishTransform(layer: EditorLayer, node: KonvaType.Node, onTransformEnd: (a: TransformAttrs) => void) {
  onTransformEnd({
    x: node.x(),
    y: node.y(),
    scaleX: layer.transform.scaleX * Math.abs(node.scaleX()),
    scaleY: layer.transform.scaleY * Math.abs(node.scaleY()),
    rotation: node.rotation(),
  });
  if (layer.type === "background" || layer.type === "image") {
    node.scaleX(layer.data.flipX ? -1 : 1);
    node.scaleY(layer.data.flipY ? -1 : 1);
  } else {
    node.scaleX(1);
    node.scaleY(1);
  }
}

function dragHandlers(layer: EditorLayer, project: EditorProject, onGuidesChange?: (g: GuideLine[]) => void) {
  return {
    onDragMove: (e: KonvaType.KonvaEventObject<DragEvent>) => {
      const snapped = snapPosition(layer, project, e.target.x(), e.target.y());
      e.target.x(snapped.x);
      e.target.y(snapped.y);
      onGuidesChange?.(snapped.guides);
    },
    onDragEnd: (e: KonvaType.KonvaEventObject<DragEvent>) => {
      onGuidesChange?.([]);
    },
  };
}

function ImageNode({
  layer,
  project,
  src,
  width,
  height,
  flipX,
  flipY,
  effects,
  centered,
  onSelect,
  onTransformEnd,
  onGuidesChange,
}: Props & { src: string; width: number; height: number; flipX?: boolean; flipY?: boolean; centered?: boolean; effects?: import("@/lib/media-editor/types").ImageEffects }) {
  const { image, failed } = useHtmlImage(src);
  if (!layer.visible) return null;
  if (!image) {
    if (failed) {
      return (
        <Rect
          x={layer.transform.x}
          y={layer.transform.y}
          width={width * layer.transform.scaleX}
          height={height * layer.transform.scaleY}
          fill="#333"
          listening={false}
        />
      );
    }
    return null;
  }
  const drag = dragHandlers(layer, project, onGuidesChange);
  const offset = centered ? { offsetX: width / 2, offsetY: height / 2 } : {};
  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={layer.transform.x}
      y={layer.transform.y}
      width={width}
      height={height}
      {...offset}
      scaleX={layer.transform.scaleX * (flipX ? -1 : 1)}
      scaleY={layer.transform.scaleY * (flipY ? -1 : 1)}
      rotation={layer.transform.rotation}
      opacity={layer.opacity}
      globalCompositeOperation={layer.blendMode}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      {...drag}
      onDragEnd={(e) => {
        drag.onDragEnd(e);
        onTransformEnd({ x: e.target.x(), y: e.target.y(), scaleX: layer.transform.scaleX, scaleY: layer.transform.scaleY, rotation: e.target.rotation() });
      }}
      onTransformEnd={(e) => finishTransform(layer, e.target, onTransformEnd)}
      ref={(node) => {
        if (!node || !effects) return;
        const filters: (typeof Konva.Filters.Brightness)[] = [];
        if (effects.brightness) filters.push(Konva.Filters.Brightness);
        if (effects.contrast) filters.push(Konva.Filters.Contrast);
        if (effects.saturation || effects.hue) filters.push(Konva.Filters.HSL);
        if (effects.blur) filters.push(Konva.Filters.Blur);
        if (!filters.length) return;
        node.cache();
        node.filters(filters);
        if (effects.brightness) node.brightness(effects.brightness);
        if (effects.contrast) node.contrast(effects.contrast);
        if (effects.saturation) node.saturation(effects.saturation);
        if (effects.hue) node.hue(effects.hue);
        if (effects.blur) node.blurRadius(effects.blur);
      }}
    />
  );
}

export function EditorLayerNode(props: Props) {
  const { layer, onSelect, onEditText, onTransformEnd, project, onGuidesChange } = props;
  const { transform } = layer;

  if (layer.type === "background" || layer.type === "image") {
    return (
      <ImageNode
        {...props}
        src={layer.data.src}
        width={layer.data.naturalWidth}
        height={layer.data.naturalHeight}
        flipX={layer.data.flipX}
        flipY={layer.data.flipY}
        centered={layer.type === "background"}
        effects={layer.data.effects}
      />
    );
  }
  if (layer.type === "sticker") {
    return <ImageNode {...props} src={layer.data.src} width={layer.data.naturalWidth} height={layer.data.naturalHeight} />;
  }
  if (layer.type === "text") {
    const { data } = layer;
    if (!layer.visible) return null;
    const drag = dragHandlers(layer, project, onGuidesChange);
    return (
      <Text
        id={layer.id}
        x={transform.x}
        y={transform.y}
        rotation={transform.rotation}
        scaleX={transform.scaleX}
        scaleY={transform.scaleY}
        opacity={layer.opacity}
        text={data.text}
        width={data.width}
        fontFamily={data.fontFamily}
        fontSize={data.fontSize}
        fontStyle={data.fontStyle}
        textDecoration={data.textDecoration}
        fill={data.fill}
        align={data.align}
        lineHeight={data.lineHeight}
        letterSpacing={data.letterSpacing}
        stroke={data.strokeWidth > 0 ? data.stroke : undefined}
        strokeWidth={data.strokeWidth}
        shadowColor={data.shadowBlur > 0 ? data.shadowColor : undefined}
        shadowBlur={data.shadowBlur}
        shadowOffsetX={data.shadowOffsetX}
        shadowOffsetY={data.shadowOffsetY}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={() => onEditText?.(layer.id)}
        onDblTap={() => onEditText?.(layer.id)}
        {...drag}
        onDragEnd={(e) => {
          drag.onDragEnd(e);
          onTransformEnd({ x: e.target.x(), y: e.target.y(), scaleX: transform.scaleX, scaleY: transform.scaleY, rotation: e.target.rotation() });
        }}
        onTransformEnd={(e) => finishTransform(layer, e.target, onTransformEnd)}
      />
    );
  }
  if (layer.type === "emoji") {
    const { data } = layer;
    if (!layer.visible) return null;
    const drag = dragHandlers(layer, project, onGuidesChange);
    return (
      <Text
        id={layer.id}
        x={transform.x}
        y={transform.y}
        rotation={transform.rotation}
        scaleX={transform.scaleX}
        scaleY={transform.scaleY}
        opacity={layer.opacity}
        text={data.emoji}
        fontSize={data.fontSize}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        {...drag}
        onDragEnd={(e) => {
          drag.onDragEnd(e);
          onTransformEnd({ x: e.target.x(), y: e.target.y(), scaleX: transform.scaleX, scaleY: transform.scaleY, rotation: e.target.rotation() });
        }}
        onTransformEnd={(e) => finishTransform(layer, e.target, onTransformEnd)}
      />
    );
  }
  if (layer.type === "shape") {
    const { data } = layer;
    if (!layer.visible) return null;
    const common = {
      id: layer.id,
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      opacity: layer.opacity,
      draggable: !layer.locked,
      onClick: onSelect,
      onTap: onSelect,
      ...dragHandlers(layer, project, onGuidesChange),
      onTransformEnd: (e: KonvaType.KonvaEventObject<Event>) => finishTransform(layer, e.target, onTransformEnd),
    };
    if (data.kind === "circle") return <Circle {...common} radius={data.width / 2} fill={data.fill} stroke={data.stroke} strokeWidth={data.strokeWidth} />;
    if (data.kind === "triangle") return <RegularPolygon {...common} sides={3} radius={data.width / 2} fill={data.fill} stroke={data.stroke} strokeWidth={data.strokeWidth} />;
    if (data.kind === "star") return <Star {...common} numPoints={5} innerRadius={data.width * 0.22} outerRadius={data.width * 0.5} fill={data.fill} stroke={data.stroke} strokeWidth={data.strokeWidth} />;
    if (data.kind === "heart") return <Text {...common} text="❤" fontSize={data.width * 0.9} />;
    if (data.kind === "line") return <Line {...common} points={[0, 0, data.width, 0]} stroke={data.stroke} strokeWidth={data.strokeWidth} lineCap="round" />;
    if (data.kind === "arrow") return <Arrow {...common} points={[0, 0, data.width, 0]} stroke={data.stroke} fill={data.stroke} strokeWidth={data.strokeWidth} pointerLength={14} pointerWidth={14} />;
    if (data.kind === "speech") return <Group {...common}><Rect width={data.width} height={data.height * 0.75} cornerRadius={data.cornerRadius} fill={data.fill} stroke={data.stroke} strokeWidth={data.strokeWidth} /></Group>;
    return <Rect {...common} width={data.width} height={data.height} fill={data.fill} stroke={data.stroke} strokeWidth={data.strokeWidth} cornerRadius={data.cornerRadius} />;
  }
  if (layer.type === "brush") {
    if (!layer.visible) return null;
    return (
      <Group id={layer.id} x={transform.x} y={transform.y} opacity={layer.opacity}>
        {layer.data.strokes.map((stroke, i) => (
          <Line
            key={i}
            points={stroke.points}
            stroke={stroke.tool === "eraser" ? "#ffffff" : stroke.color}
            strokeWidth={stroke.size}
            opacity={stroke.tool === "highlighter" ? 0.35 : stroke.opacity}
            lineCap="round"
            lineJoin="round"
            tension={stroke.tool === "pen" ? 0 : 0.3}
            globalCompositeOperation={stroke.tool === "eraser" ? "destination-out" : "source-over"}
            shadowColor={stroke.tool === "neon" ? stroke.color : undefined}
            shadowBlur={stroke.tool === "neon" ? 12 : 0}
            listening={false}
          />
        ))}
      </Group>
    );
  }
  if (layer.type === "blur") {
    if (!layer.visible) return null;
    return (
      <Rect
        id={layer.id}
        x={transform.x}
        y={transform.y}
        width={layer.data.width}
        height={layer.data.height}
        fill="rgba(255,255,255,0.01)"
        opacity={layer.opacity}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        ref={(node) => {
          if (!node) return;
          node.cache();
          node.filters([Konva.Filters.Blur]);
          node.blurRadius(layer.data.blurRadius);
        }}
      />
    );
  }
  if (layer.type === "overlay") {
    if (!layer.visible) return null;
    return (
      <Rect
        id={layer.id}
        x={transform.x}
        y={transform.y}
        width={layer.data.width}
        height={layer.data.height}
        fill={layer.data.color}
        opacity={layer.opacity}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }
  return null;
}
