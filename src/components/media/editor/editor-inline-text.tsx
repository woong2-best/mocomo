"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import type { EditorLayer } from "@/lib/media-editor/types";

type EditorInlineTextProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  layer: EditorLayer & { type: "text" };
  onCommit: (text: string) => void;
  onClose: () => void;
};

export function EditorInlineText({
  containerRef,
  stageRef,
  layer,
  onCommit,
  onClose,
}: EditorInlineTextProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(layer.data.text);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
  }, []);

  useEffect(() => {
    function updatePosition() {
      const stage = stageRef.current;
      const container = containerRef.current;
      if (!stage || !container) return;
      const node = stage.findOne(`#${layer.id}`) as Konva.Text | undefined;
      if (!node) return;

      const stageRect = stage.container().getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const absPos = node.getAbsolutePosition();
      const scale = node.getAbsoluteScale();
      const { data } = layer;

      setStyle({
        position: "absolute",
        left: stageRect.left - containerRect.left + absPos.x,
        top: stageRect.top - containerRect.top + absPos.y,
        width: Math.max(node.width() * scale.x, 80),
        minHeight: data.fontSize * scale.y * data.lineHeight,
        fontSize: data.fontSize * scale.y,
        fontFamily: data.fontFamily,
        fontWeight: data.fontStyle.includes("bold") ? "bold" : "normal",
        fontStyle: data.fontStyle.includes("italic") ? "italic" : "normal",
        textDecoration: data.textDecoration,
        color: data.fill,
        textAlign: data.align,
        lineHeight: data.lineHeight,
        transform: `rotate(${node.rotation()}deg)`,
        transformOrigin: "left top",
        background: "transparent",
        border: "none",
        outline: "2px solid #3b82f6",
        resize: "none",
        overflow: "hidden",
        zIndex: 30,
        visibility: "visible",
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [containerRef, layer, stageRef]);

  function finish() {
    onCommit(value.trim() || "텍스트");
    onClose();
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      onChange={(e) => setValue(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finish();
        }
      }}
      style={style}
      className="p-0 m-0 touch-manipulation"
    />
  );
}
