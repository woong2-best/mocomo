import { STICKER_MANIFEST } from "@/lib/media-editor/stickers";
import type { BrushToolId, ShapeKind, TextAlign } from "@/lib/media-editor/types";

export const EDITOR_FONTS = [
  "Pretendard, system-ui, sans-serif",
  "Georgia, serif",
  "Impact, sans-serif",
  "Courier New, monospace",
  "Comic Sans MS, cursive",
];

export const EMOJI_QUICK_PICK = [
  "😀", "😂", "❤️", "🔥", "✨", "🎉", "😭", "👍", "😍", "💯",
  "🥺", "😎", "🙏", "💀", "⭐", "🌸", "🎮", "📸", "💬", "👀",
];

export const SHAPE_KINDS: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
  { id: "speech", label: "Speech bubble" },
];

export const BRUSH_TOOLS: { id: BrushToolId; label: string }[] = [
  { id: "pen", label: "Pen" },
  { id: "pencil", label: "Pencil" },
  { id: "highlighter", label: "Highlighter" },
  { id: "brush", label: "Brush" },
  { id: "neon", label: "Neon" },
  { id: "eraser", label: "Eraser" },
];

export const STICKER_CATEGORIES = STICKER_MANIFEST.map((c) => ({
  id: c.id,
  label: c.label,
  items: c.items,
}));

export const DEFAULT_TEXT_STYLE = {
  fontFamily: EDITOR_FONTS[0]!,
  fontSize: 48,
  fontStyle: "bold" as const,
  textDecoration: "",
  fill: "#ffffff",
  align: "center" as TextAlign,
  lineHeight: 1.2,
  letterSpacing: 0,
  stroke: "#000000",
  strokeWidth: 0,
  shadowColor: "rgba(0,0,0,0.45)",
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  backgroundColor: "transparent",
  width: 320,
};

export const DEFAULT_BRUSH = {
  color: "#ff3366",
  size: 8,
  opacity: 1,
  tool: "pen" as BrushToolId,
};
