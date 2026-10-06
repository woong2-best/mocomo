"use client";

import { ImagePlus, Images, PanelsTopLeft, Video } from "lucide-react";
import { WIKI_MACROS, type WikiMacro } from "@/lib/wiki/macros";
import { cn } from "@/lib/utils";

type EditorToolbarProps = {
  onMacro: (macro: WikiMacro) => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickCover: () => void;
  onPickBanner: () => void;
  imageBusy?: boolean;
  videoBusy?: boolean;
};

function PillButton({
  label,
  title,
  onClick,
  disabled,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80",
        "bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground",
        "transition-colors hover:bg-secondary disabled:opacity-50"
      )}
    >
      {children}
      <span>{title}</span>
    </button>
  );
}

export function EditorToolbar({
  onMacro,
  onPickImage,
  onPickVideo,
  onPickCover,
  onPickBanner,
  imageBusy,
  videoBusy,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-border/80 bg-muted/40 px-2 py-2 [scrollbar-width:thin]">
      <div className="flex items-center gap-1.5">
        <PillButton label="Insert image" title="Image" onClick={onPickImage} disabled={imageBusy}>
          <ImagePlus className="h-3.5 w-3.5" />
        </PillButton>
        <PillButton label="Attach video" title="Video" onClick={onPickVideo} disabled={videoBusy}>
          <Video className="h-3.5 w-3.5" />
        </PillButton>
        <PillButton label="Cover image" title="Cover image" onClick={onPickCover}>
          <Images className="h-3.5 w-3.5" />
        </PillButton>
        <PillButton label="Banner image" title="Banner image" onClick={onPickBanner}>
          <PanelsTopLeft className="h-3.5 w-3.5" />
        </PillButton>
      </div>
      <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
      <div className="flex items-center gap-1.5">
        {WIKI_MACROS.map((macro) => (
          <PillButton
            key={macro.id}
            label={macro.label}
            title={macro.label}
            onClick={() => onMacro(macro)}
          />
        ))}
      </div>
    </div>
  );
}
