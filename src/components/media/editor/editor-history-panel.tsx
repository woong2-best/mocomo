"use client";

import type { EditorProject } from "@/lib/media-editor/types";

export function EditorHistoryPanel({
  items,
  activeIndex,
  onJump,
}: {
  items: EditorProject[];
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  if (items.length <= 1) return null;
  return (
    <div className="border-t bg-muted/10 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">히스토리 ({items.length})</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            className={`shrink-0 h-7 min-w-7 rounded text-[10px] border ${
              i === activeIndex ? "bg-primary text-primary-foreground border-primary" : "bg-background"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
