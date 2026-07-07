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
  { id: "rect", label: "사각형" },
  { id: "circle", label: "원" },
  { id: "triangle", label: "삼각형" },
  { id: "line", label: "선" },
  { id: "arrow", label: "화살표" },
  { id: "star", label: "별" },
  { id: "heart", label: "하트" },
  { id: "speech", label: "말풍선" },
];

export const BRUSH_TOOLS: { id: BrushToolId; label: string }[] = [
  { id: "pen", label: "펜" },
  { id: "pencil", label: "연필" },
  { id: "highlighter", label: "형광펜" },
  { id: "brush", label: "붓" },
  { id: "neon", label: "네온" },
  { id: "eraser", label: "지우개" },
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
