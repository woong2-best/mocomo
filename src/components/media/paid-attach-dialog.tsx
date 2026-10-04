"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
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

const MEDIA_ACCEPT =
  "image/*,.heic,.heif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

function isAttachFile(file: File): boolean {
  if (isGalleryImageFile(file, true)) return true;
  const type = file.type?.trim().toLowerCase() ?? "";
  return type.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
}

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

  function reset() {
    setMoco("");
    setFiles([]);
    setError("");
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter(isAttachFile);
    e.target.value = "";
    if (picked.length === 0) {
      setError(t("compose.attach.needFile"));
      return;
    }
    setFiles(picked);
    setError("");
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
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-1.5"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {t("compose.attach.upload")}
          </Button>
          {files.length > 0 ? (
            <ul className="text-xs text-muted-foreground space-y-1 max-h-28 overflow-y-auto">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="truncate">
                  {file.name}
                </li>
              ))}
            </ul>
          ) : null}
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
