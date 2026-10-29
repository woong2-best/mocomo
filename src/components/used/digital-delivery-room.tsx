"use client";

import { useEffect, useState } from "react";
import { getDigitalDelivery, updateDigitalDelivery } from "@/actions/digital-delivery";
import { validateCloudShareUrl } from "@/lib/digital-cloud/cloud-share-url";
import { useLocale } from "@/components/providers/locale-provider";

type Delivery = {
  status: string;
  fileUrl?: string;
  fileName?: string;
  cloudShareUrl?: string;
  sharePassword?: string;
  autoApproveAt?: string;
};

const STEPS = [
  ["held", "market.track.paymentHeld"],
  ["progress", "market.track.inProgress"],
  ["uploaded", "market.track.fileUploaded"],
  ["completed", "market.track.completed"],
] as const;

function stepIndex(status: string) {
  if (status === "progress") return 1;
  if (status === "uploaded") return 2;
  if (status === "completed") return 3;
  return 0;
}

export function DigitalDeliveryRoom({ listingId }: { listingId: string }) {
  const { t } = useLocale();
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [digital, setDigital] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [cloudUrl, setCloudUrl] = useState("");
  const [password, setPassword] = useState("");

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

  const index = stepIndex(delivery.status);
  const shareUrl = delivery.cloudShareUrl || delivery.fileUrl;
  const canDownload = role === "buyer" && !!shareUrl && (delivery.status === "uploaded" || delivery.status === "completed");

  async function run(
    action: "start" | "upload" | "approve" | "dispute",
    file?: { cloudShareUrl?: string; sharePassword?: string; fileName?: string; disputeReason?: string }
  ) {
    setBusy(true);
    setNote("");
    const res = await updateDigitalDelivery({ listingId, action, ...file });
    setBusy(false);
    if ("error" in res && res.error) {
      setNote(res.error);
      return;
    }
    if ("delivery" in res && res.delivery) setDelivery(res.delivery);
    else await reload();
  }

  function submitLink() {
    const checked = validateCloudShareUrl(cloudUrl);
    if (!checked.ok) {
      setNote(t("market.track.cloudInvalid"));
      return;
    }
    void run("upload", {
      cloudShareUrl: checked.href,
      sharePassword: password,
      fileName: checked.provider === "google" ? "Google Drive" : "Dropbox",
    });
  }

  return (
    <section className="mx-4 mb-4 space-y-4 rounded-2xl border border-white/10 bg-[#0b1f3a] p-4 text-[#f7fafc]">
      <div>
        <p className="text-base font-extrabold text-white">{t("market.track.deliverWork")}</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-[#ffe08a]">{t("market.commission.autoNote")}</p>
      </div>

      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map(([id, key], step) => {
          const current = step === index;
          const done = step < index;
          return (
            <li key={id} className="min-w-0">
              <div
                className="h-1.5 rounded-full"
                style={{ background: current || done ? "#7ef0d2" : "rgba(255,255,255,0.2)" }}
              />
              <p
                className="mt-2 text-[11px] font-bold leading-tight break-words"
                style={{ color: current ? "#7ef0d2" : done ? "#f7fafc" : "#c5d0e0" }}
              >
                {t(key)}
              </p>
            </li>
          );
        })}
      </ol>

      {role === "seller" && (delivery.status === "held" || delivery.status === "progress") ? (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-white" htmlFor={`cloud-url-${listingId}`}>
            {t("market.track.cloudUrl")}
          </label>
          <input
            id={`cloud-url-${listingId}`}
            value={cloudUrl}
            onChange={(event) => setCloudUrl(event.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            autoComplete="off"
            className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-3 text-sm font-semibold text-white placeholder:text-[#c5d0e0]"
          />
          <label className="block text-sm font-bold text-white" htmlFor={`cloud-password-${listingId}`}>
            {t("market.track.cloudPassword")}
          </label>
          <input
            id={`cloud-password-${listingId}`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-3 text-sm font-semibold text-white placeholder:text-[#c5d0e0]"
          />
          {delivery.status === "held" ? (
            <button
              type="button"
              className="w-full rounded-xl border border-white/40 px-3 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              disabled={busy}
              onClick={() => void run("start")}
            >
              {t("market.track.startWork")}
            </button>
          ) : null}
          <button
            type="button"
            className="w-full rounded-xl bg-[#7ef0d2] px-3 py-3 text-sm font-extrabold text-[#0b1f3a] disabled:opacity-50"
            disabled={busy}
            onClick={submitLink}
          >
            {t("market.track.deliverWork")}
          </button>
        </div>
      ) : null}

      {canDownload ? (
        <a
          className="block w-full rounded-xl bg-white px-3 py-3 text-center text-sm font-extrabold text-[#0b1f3a]"
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("market.track.downloadFile")}
        </a>
      ) : null}
      {canDownload && delivery.sharePassword ? (
        <p className="text-sm font-semibold text-[#f7fafc]">
          {t("market.track.cloudPassword")}: <span className="font-mono text-[#7ef0d2]">{delivery.sharePassword}</span>
        </p>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <button
          type="button"
          className="w-full rounded-xl bg-[#7ef0d2] px-3 py-3 text-sm font-extrabold text-[#0b1f3a] disabled:opacity-50"
          disabled={busy}
          onClick={() => void run("approve")}
        >
          {t("market.track.approvePurchase")}
        </button>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <button
          type="button"
          className="w-full rounded-xl border border-white/40 px-3 py-3 text-sm font-extrabold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => void run("dispute", { disputeReason: "Requirements do not match" })}
        >
          {t("market.commission.dispute")}
        </button>
      ) : null}
      {note ? <p className="text-sm font-bold text-[#ffb4b4]">{note}</p> : null}
    </section>
  );
}
