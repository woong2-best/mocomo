"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { isGalleryImageFile } from "@/lib/gallery-image-upload";
import {
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_USD_CENTS,
  saleCentsFromMoco,
} from "@/lib/money";
import { parseSpendableMoco, sanitizeMocoDecimalInput } from "@/lib/moco/decimal-amount";
import { cn } from "@/lib/utils";
import { FileDropZone } from "@/components/media/file-drop-zone";

const MEDIA_ACCEPT =
  "image/*,.heic,.heif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

function isAttachFile(file: File): boolean {
  if (isGalleryImageFile(file, true)) return true;
  const type = file.type?.trim().toLowerCase() ?? "";
  return type.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
}

function isVideoFile(file: File): boolean {
  const type = file.type?.trim().toLowerCase() ?? "";
  return type.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
}

type PreviewItem = {
  url: string;
  kind: "image" | "video";
};

export function PaidAttachDialog({
  open,
  onOpenChange,
  disabled,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  onConfirm: (files: File[], priceKrw: number) => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [moco, setMoco] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const next = files.map((file) => ({
      url: URL.createObjectURL(file),
      kind: isVideoFile(file) ? ("video" as const) : ("image" as const),
    }));
    setPreviews(next);
    setPage(0);
    return () => {
      next.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  function reset() {
    setMoco("");
    setFiles([]);
    setError("");
    setPage(0);
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  function ingestFiles(list: File[]) {
    const picked = list.filter(isAttachFile);
    if (picked.length === 0) {
      setError(t("compose.attach.needFile"));
      return;
    }
    setFiles(picked);
    setError("");
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    ingestFiles(list);
  }

  function confirm() {
    const amount = parseSpendableMoco(moco);
    if (amount == null) {
      setError(t("compose.attach.needMoco"));
      return;
    }
    const cents = saleCentsFromMoco(amount);
    if (cents < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
      setError(t("compose.attach.needMoco"));
      return;
    }
    if (cents > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      setError(t("compose.attach.tooHigh"));
      return;
    }
    if (files.length === 0) {
      setError(t("compose.attach.needFile"));
      return;
    }
    onConfirm(files, cents);
    close();
  }

  function onPreviewScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.clientWidth <= 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setPage(Math.max(0, Math.min(previews.length - 1, next)));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent layer="stack" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("compose.attach.title")}</DialogTitle>
          <DialogDescription>{t("compose.attach.hint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("compose.attach.moco")}
            </span>
            <Input
              inputMode="decimal"
              placeholder={t("compose.attach.mocoPh")}
              value={moco}
              disabled={disabled}
              onChange={(e) => setMoco(sanitizeMocoDecimalInput(e.target.value))}
              className="rounded-xl"
            />
          </label>
          <FileDropZone
            className="rounded-xl"
            disabled={disabled}
            hint={t("media.dropHint")}
            onFiles={ingestFiles}
          >
          <div className="file-drop-zone__pad min-h-0 gap-2 py-3">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-1.5"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {files.length > 0
              ? t("compose.attach.picked", { count: files.length })
              : t("compose.attach.upload")}
          </Button>
          {previews.length > 0 ? (
            <div className="space-y-2">
              <div
                className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-muted/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={onPreviewScroll}
              >
                {previews.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    className="relative h-32 w-full shrink-0 snap-center sm:h-36"
                  >
                    {item.kind === "video" ? (
                      <video
                        src={item.url}
                        className="h-full w-full object-contain"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    )}
                    {item.kind === "video" ? (
                      <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white">
                        <Play className="h-3 w-3" fill="currentColor" />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              {previews.length > 1 ? (
                <div className="flex items-center justify-center gap-1.5">
                  {previews.map((item, index) => (
                    <span
                      key={`${item.url}-dot-${index}`}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        index === page ? "bg-primary" : "bg-muted-foreground/35"
                      )}
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                    {page + 1}/{previews.length}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          </div>
          </FileDropZone>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={close}>
              {t("calendar.cancel")}
            </Button>
            <Button type="button" className="rounded-xl" disabled={disabled} onClick={confirm}>
              {t("compose.attach.confirm")}
            </Button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="sr-only"
          onChange={onPick}
        />
      </DialogContent>
    </Dialog>
  );
}
