"use client";

import { useEffect, useState } from "react";
import { Image as KonvaImage } from "react-konva";
import type { EditorLayer } from "@/lib/media-editor/types";

type EditorImageNodeProps = {
  layer: EditorLayer;
  onSelect: () => void;
  onDragEnd: (attrs: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }) => void;
  onTransformEnd: (attrs: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }) => void;
};

function useHtmlImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);
  return image;
}

export function EditorImageNode({ layer, onSelect, onDragEnd, onTransformEnd }: EditorImageNodeProps) {
  const image = useHtmlImage(layer.data.src);
  if (!layer.visible || !image) return null;

  const scaleX = layer.transform.scaleX * (layer.data.flipX ? -1 : 1);
  const scaleY = layer.transform.scaleY * (layer.data.flipY ? -1 : 1);

  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={layer.transform.x}
      y={layer.transform.y}
      width={layer.data.naturalWidth}
      height={layer.data.naturalHeight}
      scaleX={scaleX}
      scaleY={scaleY}
      rotation={layer.transform.rotation}
      opacity={layer.opacity}
      globalCompositeOperation={layer.blendMode}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd({
          x: node.x(),
          y: node.y(),
          scaleX: layer.transform.scaleX,
          scaleY: layer.transform.scaleY,
          rotation: node.rotation(),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const absScaleX = Math.abs(node.scaleX());
        const absScaleY = Math.abs(node.scaleY());
        onTransformEnd({
          x: node.x(),
          y: node.y(),
          scaleX: layer.transform.scaleX * absScaleX,
          scaleY: layer.transform.scaleY * absScaleY,
          rotation: node.rotation(),
        });
        node.scaleX(layer.data.flipX ? -1 : 1);
        node.scaleY(layer.data.flipY ? -1 : 1);
      }}
    />
  );
}
