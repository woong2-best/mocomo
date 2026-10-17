"use client";

import { useState } from "react";
import { sendCommissionRequest } from "@/actions/digital-commission";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

export function CommissionRequestButton({ sellerId }: { sellerId: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [purpose, setPurpose] = useState<"personal" | "broadcast">("personal");
  const [note, setNote] = useState("");

  async function submit() {
    const res = await sendCommissionRequest({ sellerId, brief, purpose });
    if ("error" in res && res.error) {
      setNote(res.error);
      return;
    }
    setOpen(false);
    setBrief("");
    setNote("");
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("market.commission.request")}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md space-y-3 rounded-2xl bg-background p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <p className="text-lg font-extrabold">{t("market.commission.request")}</p>
            <textarea
              className="min-h-32 w-full rounded-xl border p-3"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder={t("market.commission.brief")}
            />
            <div className="flex gap-2">
              {(["personal", "broadcast"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-sm font-bold ${purpose === id ? "bg-folk-cobalt text-white" : ""}`}
                  onClick={() => setPurpose(id)}
                >
                  {t(id === "personal" ? "market.commission.personal" : "market.commission.broadcast")}
                </button>
              ))}
            </div>
            {note ? <p className="text-sm text-destructive">{note}</p> : null}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.back")}
              </Button>
              <Button type="submit" disabled={brief.trim().length < 8}>
                {t("market.commission.send")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
