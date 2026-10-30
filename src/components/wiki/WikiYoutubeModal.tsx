"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

type WikiYoutubeModalProps = {
  open: boolean;
  url: string;
  error?: string;
  onUrlChange: (value: string) => void;
  onClose: () => void;
  onInsert: () => void;
};

const sheetClass =
  "max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-t-2xl max-md:rounded-b-none";

export function WikiYoutubeModal({
  open,
  url,
  error,
  onUrlChange,
  onClose,
  onInsert,
}: WikiYoutubeModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>{t("wiki.editor.youtubeTitle")}</DialogTitle>
          <DialogDescription>{t("wiki.editor.youtubeHint")}</DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onInsert();
            }
          }}
          placeholder={t("anime.sr7fl2u")}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onInsert}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          {t("wiki.editor.insert")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
