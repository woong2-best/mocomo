"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronsDownUp,
  EyeOff,
  Highlighter,
  ImagePlus,
  Images,
  Italic,
  Palette,
  PanelsTopLeft,
  Quote,
  Strikethrough,
  Superscript,
  Table2,
  Type,
  Video,
} from "lucide-react";
import { createTranslator } from "@/lib/i18n/messages";
import {
  WIKI_BODY_MACROS,
  WIKI_FORMAT_MACROS,
  WIKI_MACROS,
  colorMacro,
  highlightMacro,
  sizeMacro,
  type WikiMacro,
} from "@/lib/wiki/macros";
import { WIKI_COLOR_SWATCHES, WIKI_SIZE_STEPS } from "@/lib/wiki/markup";

const t = createTranslator("en");
import { cn } from "@/lib/utils";

export type WikiEditorToolbarVariant = "document" | "body";

type EditorToolbarProps = {
  variant?: WikiEditorToolbarVariant;
  onMacro: (macro: WikiMacro) => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickCover: () => void;
  onPickBanner: () => void;
  onInfobox?: () => void;
  imageBusy?: boolean;
  videoBusy?: boolean;
};

type Picker = "color" | "highlight" | "size" | null;

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

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-secondary/80 text-secondary-foreground hover:bg-secondary"
    >
      {children}
    </button>
  );
}

export function EditorToolbar({
  variant = "document",
  onMacro,
  onPickImage,
  onPickVideo,
  onPickCover,
  onPickBanner,
  onInfobox,
  imageBusy,
  videoBusy,
}: EditorToolbarProps) {
  const imageLabel = t("wiki.editor.image");
  const videoLabel = t("wiki.editor.video");
  const bodyOnly = variant === "body";
  const [picker, setPicker] = useState<Picker>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picker) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setPicker(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [picker]);

  const formatById = (id: string) => WIKI_FORMAT_MACROS.find((macro) => macro.id === id);

  return (
    <div ref={wrapRef} className="relative border-b border-border/80 bg-muted/40">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-2 py-2 [scrollbar-width:thin]">
        <div className="flex items-center gap-1.5">
          <PillButton label={imageLabel} title={imageLabel} onClick={onPickImage} disabled={imageBusy}>
            <ImagePlus className="h-3.5 w-3.5" />
          </PillButton>
          <PillButton label={videoLabel} title={videoLabel} onClick={onPickVideo} disabled={videoBusy}>
            <Video className="h-3.5 w-3.5" />
          </PillButton>
          {bodyOnly ? null : (
            <>
              <PillButton label="Cover image" title="Cover image" onClick={onPickCover}>
                <Images className="h-3.5 w-3.5" />
              </PillButton>
              <PillButton label="Banner image" title="Banner image" onClick={onPickBanner}>
                <PanelsTopLeft className="h-3.5 w-3.5" />
              </PillButton>
            </>
          )}
        </div>
        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <div className="flex items-center gap-1">
          <IconButton label="Bold" onClick={() => formatById("bold") && onMacro(formatById("bold")!)}>
            <Bold className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Italic" onClick={() => formatById("italic") && onMacro(formatById("italic")!)}>
            <Italic className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Strikethrough" onClick={() => formatById("strike") && onMacro(formatById("strike")!)}>
            <Strikethrough className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Text color" onClick={() => setPicker((value) => (value === "color" ? null : "color"))}>
            <Palette className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Text size" onClick={() => setPicker((value) => (value === "size" ? null : "size"))}>
            <Type className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Highlight"
            onClick={() => setPicker((value) => (value === "highlight" ? null : "highlight"))}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </IconButton>
        </div>
        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <div className="flex items-center gap-1.5">
          <PillButton
            label="Spoiler"
            title="Spoiler"
            onClick={() => formatById("spoiler") && onMacro(formatById("spoiler")!)}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </PillButton>
          <PillButton
            label="Folding"
            title="Folding"
            onClick={() => formatById("fold") && onMacro(formatById("fold")!)}
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </PillButton>
          <PillButton label="Quote" title="Quote" onClick={() => formatById("quote") && onMacro(formatById("quote")!)}>
            <Quote className="h-3.5 w-3.5" />
          </PillButton>
          <PillButton
            label="Footnote"
            title="Footnote"
            onClick={() => formatById("footnote") && onMacro(formatById("footnote")!)}
          >
            <Superscript className="h-3.5 w-3.5" />
          </PillButton>
          <PillButton label="Table" title="Table" onClick={() => formatById("table") && onMacro(formatById("table")!)}>
            <Table2 className="h-3.5 w-3.5" />
          </PillButton>
        </div>
        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <div className="flex items-center gap-1.5">
          {(bodyOnly ? WIKI_BODY_MACROS : [...WIKI_BODY_MACROS, ...WIKI_MACROS])
            .filter((macro) => !(macro.id === "infobox" && onInfobox))
            .map((macro) => (
              <PillButton
                key={macro.id}
                label={macro.label}
                title={macro.label}
                onClick={() => onMacro(macro)}
              />
            ))}
          {onInfobox ? (
            <PillButton label={t("wiki.editor.infobox")} title={t("wiki.editor.infobox")} onClick={onInfobox} />
          ) : null}
        </div>
      </div>

      {picker === "color" || picker === "highlight" ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2">
          <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {picker === "color" ? "Text color" : "Highlight"}
          </span>
          {WIKI_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              title={swatch.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onMacro(picker === "color" ? colorMacro(swatch.id) : highlightMacro(swatch.id));
                setPicker(null);
              }}
              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: swatch.value }}
            />
          ))}
        </div>
      ) : null}

      {picker === "size" ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2">
          <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">Size</span>
          {WIKI_SIZE_STEPS.map((size) => (
            <button
              key={size.step}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onMacro(sizeMacro(size.step));
                setPicker(null);
              }}
              className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium"
            >
              {size.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
