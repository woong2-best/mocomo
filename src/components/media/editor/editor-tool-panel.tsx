"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  Brush,
  Circle,
  Droplets,
  ImagePlus,
  Layers,
  MousePointer2,
  Shapes,
  Smile,
  Sparkles,
  Sticker,
  Type,
} from "lucide-react";
import type { EditorToolId } from "@/lib/media-editor/types";
import { cn } from "@/lib/utils";

const TOOLS: { id: EditorToolId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "select", label: t("media.sxzul"), icon: MousePointer2 },
  { id: "image", label: t("lib.media-editor.su4sho"), icon: ImagePlus },
  { id: "text", label: t("lib.webtoon-studio.svlwgx"), icon: Type },
  { id: "emoji", label: t("lib.media-editor.su4kgc"), icon: Smile },
  { id: "sticker", label: t("lib.media-editor.stjcm0"), icon: Sticker },
  { id: "shape", label: t("lib.media-editor.svr2p"), icon: Shapes },
  { id: "brush", label: t("lib.media-editor.ssqgsc"), icon: Brush },
  { id: "blur", label: t("lib.media-editor.sxc9k"), icon: Sparkles },
  { id: "overlay", label: t("lib.media-editor.sps6ybw"), icon: Droplets },
];

export function EditorToolPanel({
  active,
  onSelect,
  onImagePick,
  onAddText,
  onAddBlur,
  onAddOverlay,
  fileInputId,
}: {
  active: EditorToolId;
  onSelect: (tool: EditorToolId) => void;
  onImagePick?: () => void;
  onAddText: () => void;
  onAddBlur: () => void;
  onAddOverlay: () => void;
  fileInputId: string;
}) {
  return (
    <aside className="flex md:flex-col gap-1 p-2 border-r bg-muted/20 overflow-x-auto md:overflow-visible shrink-0">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = active === tool.id;
        if (tool.id === "image") {
          return (
            <label
              key={tool.id}
              htmlFor={fileInputId}
              title={tool.label}
              className={cn(
                "inline-flex md:flex h-10 w-10 items-center justify-center rounded-xl cursor-pointer hover:bg-muted",
                isActive && "bg-primary/10 text-primary"
              )}
              onClick={() => onSelect("image")}
            >
              <Icon className="h-5 w-5" />
            </label>
          );
        }
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
            onClick={() => {
              onSelect(tool.id);
              if (tool.id === "text") onAddText();
              if (tool.id === "blur") onAddBlur();
              if (tool.id === "overlay") onAddOverlay();
            }}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted shrink-0",
              isActive && "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
      <button type="button" className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl opacity-40" title={t("webtoon-studio.srxeiw")}>
        <Layers className="h-5 w-5" />
      </button>
      <button type="button" className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl opacity-40" title={t("lib.media-editor.svr2p")}>
        <Circle className="h-5 w-5" />
      </button>
    </aside>
  );
}
