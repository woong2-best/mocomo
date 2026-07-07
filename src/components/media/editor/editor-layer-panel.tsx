"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";
import type { EditorLayer, EditorProject } from "@/lib/media-editor/types";
import { cn } from "@/lib/utils";

type EditorLayerPanelProps = {
  project: EditorProject;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
};

export function EditorLayerPanel({
  project,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onDelete,
  onDuplicate,
  onMove,
}: EditorLayerPanelProps) {
  const layers = [...project.layers].reverse();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-border/60 shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">레이어</h3>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
        {layers.map((layer, revIdx) => {
          const idx = project.layers.length - 1 - revIdx;
          const active = layer.id === project.activeLayerId;
          return (
            <LayerRow
              key={layer.id}
              layer={layer}
              active={active}
              canDelete={project.layers.length > 1}
              canMoveUp={idx < project.layers.length - 1}
              canMoveDown={idx > 0}
              onSelect={() => onSelect(layer.id)}
              onToggleVisible={() => onToggleVisible(layer.id)}
              onToggleLocked={() => onToggleLocked(layer.id)}
              onDelete={() => onDelete(layer.id)}
              onDuplicate={() => onDuplicate(layer.id)}
              onMoveUp={() => onMove(layer.id, "up")}
              onMoveDown={() => onMove(layer.id, "down")}
            />
          );
        })}
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  active,
  canDelete,
  canMoveUp,
  canMoveDown,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  layer: EditorLayer;
  active: boolean;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-1.5 flex items-center gap-1",
        active ? "border-folk-cobalt/50 bg-folk-cobalt/5" : "border-border/50 hover:bg-muted/40"
      )}
    >
      <button type="button" className="flex-1 min-w-0 text-left text-xs truncate" onClick={onSelect}>
        <span className="font-medium">{layer.name}</span>
        <span className="text-muted-foreground ml-1">({layer.type})</span>
      </button>
      <div className="flex items-center shrink-0">
        <IconBtn title={layer.visible ? "숨기기" : "보이기"} onClick={onToggleVisible}>
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </IconBtn>
        <IconBtn title={layer.locked ? "잠금 해제" : "잠금"} onClick={onToggleLocked}>
          {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </IconBtn>
        <IconBtn title="복제" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn title="위로" onClick={onMoveUp} disabled={!canMoveUp}>
          <ChevronUp className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn title="아래로" onClick={onMoveDown} disabled={!canMoveDown}>
          <ChevronDown className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn title="삭제" onClick={onDelete} disabled={!canDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30"
    >
      {children}
    </button>
  );
}
