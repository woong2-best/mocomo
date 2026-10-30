"use client";

import { useState } from "react";
import {
  ChevronsDownUp,
  EyeOff,
  Highlighter,
  Images,
  Italic,
  Palette,
  PanelsTopLeft,
  Quote,
  Strikethrough,
  Superscript,
  Table2,
  Type,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTranslator } from "@/lib/i18n/messages";
import {
  WIKI_FORMAT_MACROS,
  colorMacro,
  highlightMacro,
  sizeMacro,
  type WikiMacro,
} from "@/lib/wiki/macros";
import { WIKI_COLOR_SWATCHES, WIKI_SIZE_STEPS } from "@/lib/wiki/markup";
import { cn } from "@/lib/utils";

const t = createTranslator("en");

type Picker = "color" | "highlight" | "size" | null;

type WikiEditorMoreSheetProps = {
  open: boolean;
  variant?: "document" | "body";
  onClose: () => void;
  onMacro: (macro: WikiMacro) => void;
  onPickCover?: () => void;
  onPickBanner?: () => void;
  onInfobox?: () => void;
};

const sheetClass =
  "max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-2xl max-md:rounded-b-none";

function formatById(id: string) {
  return WIKI_FORMAT_MACROS.find((macro) => macro.id === id);
}

function SheetButton({
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
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/50 px-2 py-3 text-center text-[11px] font-medium text-foreground hover:bg-secondary"
    >
      <span className="flex h-8 w-8 items-center justify-center text-folk-cobalt">{children}</span>
      {label}
    </button>
  );
}

export function WikiEditorMoreSheet({
  open,
  variant = "document",
  onClose,
  onMacro,
  onPickCover,
  onPickBanner,
  onInfobox,
}: WikiEditorMoreSheetProps) {
  const [picker, setPicker] = useState<Picker>(null);
  const bodyOnly = variant === "body";

  function pickMacro(id: string) {
    const macro = formatById(id);
    if (!macro) return;
    onMacro(macro);
    onClose();
    setPicker(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPicker(null);
          onClose();
        }
      }}
    >
      <DialogContent className={cn(sheetClass, "gap-3")}>
        <DialogHeader>
          <DialogTitle>{t("wiki.editor.moreTitle")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          <SheetButton label={t("wiki.editor.italic")} onClick={() => pickMacro("italic")}>
            <Italic className="h-4 w-4" />
          </SheetButton>
          <SheetButton label={t("wiki.editor.strike")} onClick={() => pickMacro("strike")}>
            <Strikethrough className="h-4 w-4" />
          </SheetButton>
          <SheetButton
            label={t("wiki.editor.color")}
            onClick={() => setPicker((value) => (value === "color" ? null : "color"))}
          >
            <Palette className="h-4 w-4" />
          </SheetButton>
          <SheetButton
            label={t("wiki.editor.size")}
            onClick={() => setPicker((value) => (value === "size" ? null : "size"))}
          >
            <Type className="h-4 w-4" />
          </SheetButton>
          <SheetButton
            label={t("wiki.editor.highlight")}
            onClick={() => setPicker((value) => (value === "highlight" ? null : "highlight"))}
          >
            <Highlighter className="h-4 w-4" />
          </SheetButton>
          <SheetButton label={t("wiki.editor.spoiler")} onClick={() => pickMacro("spoiler")}>
            <EyeOff className="h-4 w-4" />
          </SheetButton>
          <SheetButton label={t("wiki.editor.fold")} onClick={() => pickMacro("fold")}>
            <ChevronsDownUp className="h-4 w-4" />
          </SheetButton>
          <SheetButton label={t("wiki.editor.quote")} onClick={() => pickMacro("quote")}>
            <Quote className="h-4 w-4" />
          </SheetButton>
          <SheetButton label={t("wiki.editor.footnote")} onClick={() => pickMacro("footnote")}>
            <Superscript className="h-4 w-4" />
          </SheetButton>
          <SheetButton label={t("wiki.editor.table")} onClick={() => pickMacro("table")}>
            <Table2 className="h-4 w-4" />
          </SheetButton>
          {onInfobox ? (
            <SheetButton
              label={t("wiki.editor.infobox")}
              onClick={() => {
                onInfobox();
                onClose();
              }}
            >
              <PanelsTopLeft className="h-4 w-4" />
            </SheetButton>
          ) : null}
          {bodyOnly ? null : (
            <>
              {onPickCover ? (
                <SheetButton
                  label={t("wiki.editor.cover")}
                  onClick={() => {
                    onPickCover();
                    onClose();
                  }}
                >
                  <Images className="h-4 w-4" />
                </SheetButton>
              ) : null}
              {onPickBanner ? (
                <SheetButton
                  label={t("wiki.editor.banner")}
                  onClick={() => {
                    onPickBanner();
                    onClose();
                  }}
                >
                  <PanelsTopLeft className="h-4 w-4" />
                </SheetButton>
              ) : null}
            </>
          )}
        </div>

        {picker === "color" || picker === "highlight" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
            <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">
              {picker === "color" ? t("wiki.editor.color") : t("wiki.editor.highlight")}
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
                  onClose();
                }}
                className="h-7 w-7 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: swatch.value }}
              />
            ))}
          </div>
        ) : null}

        {picker === "size" ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
            <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">
              {t("wiki.editor.size")}
            </span>
            {WIKI_SIZE_STEPS.map((size) => (
              <button
                key={size.step}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onMacro(sizeMacro(size.step));
                  setPicker(null);
                  onClose();
                }}
                className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium"
              >
                {size.label}
              </button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
