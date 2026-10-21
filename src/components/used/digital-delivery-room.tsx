"use client";

import { useEffect, useState } from "react";
import { getDigitalDelivery, updateDigitalDelivery } from "@/actions/digital-delivery";
import { FileDropZone } from "@/components/media/file-drop-zone";
import { applyImageWatermarkBlob } from "@/lib/media-watermark-canvas";
import { uploadAudioBlob, uploadImageBlob, uploadVideoBlob } from "@/lib/client-upload";
import { useLocale } from "@/components/providers/locale-provider";

type Delivery = {
  status: string;
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
};

export function DigitalDeliveryRoom({ listingId }: { listingId: string }) {
  const { t } = useLocale();
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [digital, setDigital] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [localPreview, setLocalPreview] = useState<{ url: string; kind: "image" | "video" } | null>(
    null
  );

  async function reload() {
    const res = await getDigitalDelivery(listingId);
    setDigital(!!res.digital);
    setRole(res.role === "buyer" || res.role === "seller" ? res.role : null);
    setDelivery(res.delivery);
  }

  useEffect(() => {
    void reload();
  }, [listingId]);

  if (!digital || !delivery) return null;

  async function run(action: "start" | "upload" | "approve" | "dispute", file?: { fileUrl?: string; fileName?: string; previewUrl?: string; disputeReason?: string }) {
    setBusy(true);
    setNote("");
    const res = await updateDigitalDelivery({ listingId, action, ...file });
    setBusy(false);
    if ("error" in res && res.error) {
      setNote(res.error);
      return;
    }
    if ("delivery" in res) setDelivery(res.delivery);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setNote("");
    const localUrl = URL.createObjectURL(file);
    const kind = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
        ? "image"
        : null;
    if (kind) setLocalPreview({ url: localUrl, kind });
    else URL.revokeObjectURL(localUrl);
    try {
      let original: string;
      let previewUrl: string | undefined;
      if (file.type.startsWith("image/")) {
        original = await uploadImageBlob(file, file.name);
        const marked = await applyImageWatermarkBlob(file, "MoCoMo", { diagonal: true, corner: true });
        previewUrl = await uploadImageBlob(marked, `preview-${file.name}`);
      } else if (file.type.startsWith("video/")) {
        original = await uploadVideoBlob(file, file.name);
      } else if (file.type.startsWith("audio/")) {
        original = await uploadAudioBlob(file, file.name);
      } else {
        throw new Error("Upload an image, audio, or video file.");
      }
      await run("upload", { fileUrl: original, fileName: file.name, previewUrl });
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Upload failed.");
      setBusy(false);
    } finally {
      if (kind) URL.revokeObjectURL(localUrl);
      setLocalPreview(null);
    }
  }

  return (
    <section className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-extrabold">{t("market.track.deliverWork")}</p>
      <ol className="flex flex-wrap gap-2 text-[11px]">
        {(
          [
            ["held", t("market.track.paymentHeld")],
            ["progress", t("market.track.inProgress")],
            ["uploaded", t("market.track.fileUploaded")],
            ["completed", t("market.track.completed")],
          ] as const
        ).map(([id, label]) => (
          <li key={id} className={delivery.status === id ? "font-extrabold text-folk-cobalt" : "text-muted-foreground"}>
            {label}
          </li>
        ))}
      </ol>
      {localPreview?.kind === "video" ? (
        <video src={localPreview.url} className="max-h-48 w-full rounded-lg object-contain" muted playsInline />
      ) : localPreview?.kind === "image" || (delivery.previewUrl && delivery.status !== "completed") ? (
        <img
          src={localPreview?.url ?? delivery.previewUrl}
          alt=""
          className="max-h-48 rounded-lg object-contain"
        />
      ) : delivery.status !== "completed" ? (
        <p className="text-xs text-muted-foreground">{delivery.fileName ?? t("market.track.fileUploaded")}</p>
      ) : null}
      {role === "seller" && delivery.status === "held" ? (
        <button type="button" className="rounded-xl bg-folk-cobalt px-3 py-2 text-sm font-bold text-white" disabled={busy} onClick={() => void run("start")}>
          {t("market.track.startWork")}
        </button>
      ) : null}
      {role === "seller" && delivery.status !== "completed" ? (
        <FileDropZone
          className="rounded-xl"
          disabled={busy}
          hint={t("media.dropHint")}
          onFiles={(files) => {
            void onFile(files[0] ?? null);
          }}
        >
          <label className="file-drop-zone__pad cursor-pointer">
            <span className="rounded-xl bg-folk-terracotta px-3 py-2 text-sm font-bold text-white">
              {t("market.track.deliverWork")}
            </span>
            <span className="text-xs">{t("media.dropHint")}</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              className="sr-only"
              disabled={busy}
              onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </FileDropZone>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <button type="button" className="rounded-xl bg-folk-cobalt px-3 py-2 text-sm font-bold text-white" disabled={busy} onClick={() => void run("approve")}>
          {t("market.track.approveDownload")}
        </button>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <button type="button" className="rounded-xl border px-3 py-2 text-sm font-bold" disabled={busy} onClick={() => void run("dispute", { disputeReason: "Requirements do not match" })}>
          {t("market.commission.dispute")}
        </button>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("market.commission.autoNote")}</p>
      {role === "buyer" && delivery.status === "completed" && delivery.fileUrl ? (
        <a className="text-sm font-bold text-folk-cobalt underline" href={delivery.fileUrl}>
          {delivery.fileName || t("market.track.approveDownload")}
        </a>
      ) : null}
      {note ? <p className="text-xs text-destructive">{note}</p> : null}
    </section>
  );
}
