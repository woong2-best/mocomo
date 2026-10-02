"use client";

import type { LiveOverlayTextProps } from "@/lib/live-overlays/types";

export function TextOverlayWidget({ props }: { props: LiveOverlayTextProps }) {
  return (
    <div
      className="flex h-full w-full items-center px-3 py-2"
      style={{
        background: props.background,
        justifyContent:
          props.align === "left" ? "flex-start" : props.align === "right" ? "flex-end" : "center",
      }}
    >
      <p
        className="leading-tight break-words w-full"
        style={{
          color: props.color,
          fontSize: props.fontSize,
          fontWeight: props.bold ? 700 : 500,
          textAlign: props.align,
        }}
      >
        {props.content}
      </p>
    </div>
  );
}
