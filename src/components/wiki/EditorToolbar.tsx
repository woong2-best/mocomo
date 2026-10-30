"use client";

import { Bold, Heading2, ImagePlus, Link2, MoreHorizontal, Video } from "lucide-react";
import { createTranslator } from "@/lib/i18n/messages";
import { WIKI_BODY_MACROS, WIKI_FORMAT_MACROS, type WikiMacro } from "@/lib/wiki/macros";
import { cn } from "@/lib/utils";

const t = createTranslator("en");

export type WikiEditorToolbarVariant = "document" | "body";

type EditorToolbarProps = {
  variant?: WikiEditorToolbarVariant;
  onMacro: (macro: WikiMacro) => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onMore: () => void;
  imageBusy?: boolean;
  videoBusy?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary disabled:opacity-50 md:h-9 md:w-9"
    >
      {children}
    </button>
  );
}

function formatById(id: string) {
  return WIKI_FORMAT_MACROS.find((macro) => macro.id === id);
}

function bodyMacro(id: string) {
  return WIKI_BODY_MACROS.find((macro) => macro.id === id);
}

export function EditorToolbar({
  onMacro,
  onPickImage,
  onPickVideo,
  onMore,
  imageBusy,
  videoBusy,
  className,
  style,
}: EditorToolbarProps) {
  return (
    <div
      className={cn("border-border/80 bg-card/95 backdrop-blur-md", className)}
      style={style}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto overscroll-x-contain px-1.5 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <IconButton label={t("wiki.editor.image")} onClick={onPickImage} disabled={imageBusy}>
          <ImagePlus className="h-5 w-5" />
        </IconButton>
        <IconButton label={t("wiki.editor.video")} onClick={onPickVideo} disabled={videoBusy}>
          <Video className="h-5 w-5" />
        </IconButton>
        <IconButton
          label={t("wiki.editor.wikilink")}
          onClick={() => {
            const macro = bodyMacro("wikilink");
            if (macro) onMacro(macro);
          }}
        >
          <Link2 className="h-5 w-5" />
        </IconButton>
        <IconButton
          label={t("wiki.editor.bold")}
          onClick={() => {
            const macro = formatById("bold");
            if (macro) onMacro(macro);
          }}
        >
          <Bold className="h-5 w-5" />
        </IconButton>
        <IconButton
          label={t("wiki.editor.heading")}
          onClick={() => {
            const macro = bodyMacro("heading");
            if (macro) onMacro(macro);
          }}
        >
          <Heading2 className="h-5 w-5" />
        </IconButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <IconButton label={t("wiki.editor.more")} onClick={onMore}>
          <MoreHorizontal className="h-5 w-5" />
        </IconButton>
      </div>
    </div>
  );
}
