"use client";

import { useEffect, useState } from "react";
import { getDigitalDelivery, updateDigitalDelivery } from "@/actions/digital-delivery";
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

  async function run(action: "start" | "upload" | "approve", file?: { fileUrl?: string; fileName?: string; previewUrl?: string }) {
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
    try {
      let original: string;
      let previewUrl: string | undefined;
      if (file.type.startsWith("image/")) {
        original = await uploadImageBlob(file, file.name);
        const marked = await applyImageWatermarkBlob(file, "PREVIEW", { diagonal: true, corner: false });
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
      {delivery.previewUrl && delivery.status !== "completed" ? (
        <img src={delivery.previewUrl} alt="" className="max-h-48 rounded-lg object-contain" />
      ) : delivery.status !== "completed" ? (
        <p className="text-xs text-muted-foreground">{delivery.fileName ?? t("market.track.fileUploaded")}</p>
      ) : null}
      {role === "seller" && delivery.status === "held" ? (
        <button type="button" className="rounded-xl bg-folk-cobalt px-3 py-2 text-sm font-bold text-white" disabled={busy} onClick={() => void run("start")}>
          {t("market.track.startWork")}
        </button>
      ) : null}
      {role === "seller" && delivery.status !== "completed" ? (
        <label className="inline-flex cursor-pointer rounded-xl bg-folk-terracotta px-3 py-2 text-sm font-bold text-white">
          {t("market.track.deliverWork")}
          <input
            type="file"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
          />
        </label>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <button type="button" className="rounded-xl bg-folk-cobalt px-3 py-2 text-sm font-bold text-white" disabled={busy} onClick={() => void run("approve")}>
          {t("market.track.approveDownload")}
        </button>
      ) : null}
      {role === "buyer" && delivery.status === "completed" && delivery.fileUrl ? (
        <a className="text-sm font-bold text-folk-cobalt underline" href={delivery.fileUrl}>
          {delivery.fileName || t("market.track.approveDownload")}
        </a>
      ) : null}
      {note ? <p className="text-xs text-destructive">{note}</p> : null}
    </section>
  );
}
