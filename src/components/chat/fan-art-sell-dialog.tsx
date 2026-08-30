"use client";

import { useId, useRef, useState } from "react";
import { Banknote, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toAbsoluteUploadUrl, uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import type { ChatAttachmentInput } from "@/lib/chat-attachments";
import {
  formatUsd,
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_KRW,
} from "@/lib/money";

const PRESETS = [500, 1_000, 3_000, 5_000, 10_000];
const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,.heic,.heif";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (attachments: ChatAttachmentInput[]) => Promise<void>;
};

export function FanArtSellDialog({ open, onOpenChange, onSend }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [price, setPrice] = useState(1_000);
  const [customPrice, setCustomPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectivePrice = customPrice
    ? parseInt(customPrice.replace(/\D/g, ""), 10) || 0
    : price;

  async function handleFile(file: File) {
    if (effectivePrice < SALE_MEDIA_MIN_PRICE_KRW) {
      setError(`최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_KRW)}부터 설정할 수 있습니다.`);
      return;
    }
    if (effectivePrice > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      setError(`가격은 ${formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)} 이하로 설정해 주세요.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const isVideo = file.type.startsWith("video/");
      let url: string;
      if (isVideo) {
        const res = await fetch("/api/upload/direct", {
          method: "POST",
          headers: { "Content-Type": file.type || "video/mp4" },
          body: file,
        });
        if (!res.ok) throw new Error("업로드에 실패했습니다.");
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("업로드 URL을 받지 못했습니다.");
        url = toAbsoluteUploadUrl(data.url);
      } else {
        const uploadable = isGalleryImageFile(file, true)
          ? file
          : await fileToUploadableJpeg(file);
        url = toAbsoluteUploadUrl(await uploadImageBlob(uploadable, uploadable.name));
      }

      await onSend([
        {
          url,
          type: isVideo ? "VIDEO" : "IMAGE",
          name: file.name,
          priceKrw: effectivePrice,
        },
      ]);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-folk-terracotta" />
            당신의 팬 아트를 팔아보세요!
          </DialogTitle>
          <DialogDescription>
            사진이나 영상을 보내면 상대방은 결제 후에만 볼 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">판매 가격</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={!customPrice && price === p ? "default" : "outline"}
                className="rounded-full h-8"
                onClick={() => {
                  setPrice(p);
                  setCustomPrice("");
                }}
              >
                {formatUsd(p)}
              </Button>
            ))}
          </div>
          <Input
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="직접 입력"
            inputMode="numeric"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={MEDIA_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            className="w-full rounded-full gap-2"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Images className="h-4 w-4" />
            {busy ? "업로드 중…" : "갤러리에서 선택 · 전송"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
