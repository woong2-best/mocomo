"use client";

import { EFFECT_SLIDERS } from "@/lib/media-editor/effects";
import { EDITOR_FONTS, EMOJI_QUICK_PICK, SHAPE_KINDS, BRUSH_TOOLS } from "@/lib/media-editor/constants";
import { STICKER_CATEGORIES } from "@/lib/media-editor/constants";
import type { EditorLayer, EditorProject, EditorToolId } from "@/lib/media-editor/types";
import type { StickerItem } from "@/lib/media-editor/stickers";
import type { AlignMode } from "@/lib/media-editor/alignment";
import type { BrushToolId, ShapeKind } from "@/lib/media-editor/types";
import { cn } from "@/lib/utils";

export function EditorPropertiesPanel({
  project,
  activeLayer,
  activeTool,
  brushSettings,
  onPatchText,
  onAddEmoji,
  onAddSticker,
  onAddShape,
  onSetBrush,
  onSetEffects,
  onAlign,
  onRename,
}: {
  project: EditorProject;
  activeLayer: EditorLayer | null;
  activeTool: EditorToolId;
  brushSettings: { color: string; size: number; opacity: number; tool: BrushToolId };
  onPatchText: (patch: Record<string, unknown>) => void;
  onAddEmoji: (emoji: string) => void;
  onAddSticker: (item: StickerItem) => void;
  onAddShape: (kind: ShapeKind) => void;
  onSetBrush: (patch: Partial<typeof brushSettings>) => void;
  onSetEffects: (patch: Record<string, number>) => void;
  onAlign: (mode: AlignMode) => void;
  onRename: (name: string) => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 text-xs">
      <div className="px-3 py-2 border-b font-semibold text-muted-foreground uppercase tracking-wide">속성</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTool === "emoji" && (
          <section>
            <p className="mb-2 font-medium">이모지</p>
            <div className="flex flex-wrap gap-1">
              {EMOJI_QUICK_PICK.map((e) => (
                <button key={e} type="button" className="text-xl p-1 rounded hover:bg-muted" onClick={() => onAddEmoji(e)}>
                  {e}
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTool === "sticker" && (
          <section className="space-y-3">
            {STICKER_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <p className="mb-1 font-medium">{cat.label}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="h-9 min-w-9 px-1 rounded border hover:bg-muted text-lg"
                      onClick={() => onAddSticker(item)}
                      title={item.label}
                    >
                      {item.kind === "emoji" ? item.src : "📎"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTool === "shape" && (
          <section>
            <p className="mb-2 font-medium">도형</p>
            <div className="grid grid-cols-2 gap-1">
              {SHAPE_KINDS.map((s) => (
                <button key={s.id} type="button" className="rounded border px-2 py-1.5 hover:bg-muted" onClick={() => onAddShape(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTool === "brush" && (
          <section className="space-y-2">
            <p className="font-medium">브러시</p>
            <div className="flex flex-wrap gap-1">
              {BRUSH_TOOLS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={cn("rounded border px-2 py-1", brushSettings.tool === b.id && "border-primary bg-primary/10")}
                  onClick={() => onSetBrush({ tool: b.id })}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              색상
              <input type="color" value={brushSettings.color} onChange={(e) => onSetBrush({ color: e.target.value })} />
            </label>
            <label className="block">
              굵기 {brushSettings.size}
              <input type="range" min={1} max={48} value={brushSettings.size} onChange={(e) => onSetBrush({ size: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="block">
              투명도
              <input type="range" min={0.1} max={1} step={0.05} value={brushSettings.opacity} onChange={(e) => onSetBrush({ opacity: Number(e.target.value) })} className="w-full" />
            </label>
          </section>
        )}

        {activeLayer && (
          <section className="space-y-2 border-t pt-3">
            <label className="block">
              레이어 이름
              <input
                className="mt-1 w-full rounded border px-2 py-1 bg-background"
                value={activeLayer.name}
                onChange={(e) => onRename(e.target.value)}
              />
            </label>
            <p className="font-medium">정렬</p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ["left", "←"],
                  ["center-h", "↔"],
                  ["right", "→"],
                  ["top", "↑"],
                  ["center-v", "↕"],
                  ["bottom", "↓"],
                ] as const
              ).map(([mode, label]) => (
                <button key={mode} type="button" className="rounded border py-1 hover:bg-muted" onClick={() => onAlign(mode)}>
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {activeLayer?.type === "text" && (
          <section className="space-y-2 border-t pt-3">
            <textarea
              className="w-full rounded border p-2 bg-background min-h-[60px]"
              value={activeLayer.data.text}
              onChange={(e) => onPatchText({ text: e.target.value })}
            />
            <select className="w-full rounded border p-1 bg-background" value={activeLayer.data.fontFamily} onChange={(e) => onPatchText({ fontFamily: e.target.value })}>
              {EDITOR_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f.split(",")[0]}
                </option>
              ))}
            </select>
            <input type="range" min={12} max={120} value={activeLayer.data.fontSize} onChange={(e) => onPatchText({ fontSize: Number(e.target.value) })} className="w-full" />
            <input type="color" value={activeLayer.data.fill} onChange={(e) => onPatchText({ fill: e.target.value })} />
          </section>
        )}

        {activeLayer && (activeLayer.type === "background" || activeLayer.type === "image") && (
          <section className="space-y-2 border-t pt-3">
            <p className="font-medium">이미지 효과</p>
            {EFFECT_SLIDERS.map((s) => (
              <label key={s.key} className="block">
                {s.label}
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={activeLayer.data.effects?.[s.key] ?? s.default}
                  onChange={(e) => onSetEffects({ [s.key]: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            ))}
          </section>
        )}

        {!activeLayer && activeTool === "select" && (
          <p className="text-muted-foreground">레이어를 선택하거나 도구를 고르세요.</p>
        )}
      </div>
    </div>
  );
}
