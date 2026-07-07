"use client";

import type { EditorLayer } from "@/lib/media-editor/types";

type Props = {
  layer: EditorLayer & { type: "background" };
  fitZoom: number;
  offset: { x: number; y: number };
};

/** Konva 대신 HTML img로 배경을 그려 항상 사진이 보이게 함 */
export function EditorBackgroundView({ layer, fitZoom, offset }: Props) {
  const { transform, data } = layer;
  const flipX = data.flipX ? -1 : 1;
  const flipY = data.flipY ? -1 : 1;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.src}
      alt=""
      draggable={false}
      className="absolute pointer-events-none max-w-none select-none"
      style={{
        left: offset.x + transform.x * fitZoom,
        top: offset.y + transform.y * fitZoom,
        width: data.naturalWidth * fitZoom,
        height: data.naturalHeight * fitZoom,
        transform: `rotate(${transform.rotation}deg) scale(${transform.scaleX * flipX}, ${transform.scaleY * flipY})`,
        transformOrigin: "top left",
      }}
    />
  );
}
