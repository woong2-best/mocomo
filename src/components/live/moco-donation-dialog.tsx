"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MocoEarthTransferHero } from "@/components/moco/moco-earth-transfer-hero";
import { formatMocoDisplay } from "@/lib/gems/display";
import { MOCO_DONATION_MIN_AMOUNT } from "@/lib/moco-donation/constants";
import { parseSpendableMoco, sanitizeMocoDecimalInput } from "@/lib/moco/decimal-amount";
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { DONATION_SFX_CATALOG } from "@/lib/moco-donation/sfx-catalog";
import { toastIfStripeAccountNotReady, useCreatorPayoutReady } from "@/components/support/use-creator-payout-ready";
import { useLocale } from "@/components/providers/locale-provider";

export function MocoDonationDialog({
  streamerId,
  mocoBalance,
  userImageUrl,
  onSuccess,
  trigger,
}: {
  streamerId: string;
  mocoBalance?: number;
  userImageUrl?: string | null;
  onSuccess?: (remaining: number) => void;
  trigger?: ReactNode;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [mocoAmount, setMocoAmount] = useState(String(MOCO_DONATION_MIN_AMOUNT.SFX));
  const [sfxKey, setSfxKey] = useState(DONATION_SFX_CATALOG[0]?.id ?? "default");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const payoutsEnabled = useCreatorPayoutReady(streamerId);
  const payoutBlocked = payoutsEnabled === false;
  const payoutBlockedMsg = t("support.creatorPayoutBlocked");

  async function submit() {
    if (!termsAccepted) {
      setError(t("live.donation.acceptTerms"));
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError(t("live.donation.messageRequired"));
      return;
    }
    const moco = parseSpendableMoco(mocoAmount);
    const min = MOCO_DONATION_MIN_AMOUNT.SFX;
    if (moco == null || moco < min) {
      setError(t("live.donation.minAmount", { min: String(min) }));
      return;
    }

    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/v1/donate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamer_id: streamerId,
          type: "SFX",
          moco_amount: moco,
          sfx_key: sfxKey,
          message: trimmed,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        if (toastIfStripeAccountNotReady(body)) {
          setError(payoutBlockedMsg);
          return;
        }
        setError(typeof body.error === "string" ? body.error : t("live.donation.failed"));
        return;
      }
      onSuccess?.(body.remaining_moco ?? 0);
      setOpen(false);
      setMessage("");
    } finally {
      setPending(false);
    }
  }

  const defaultTrigger = (
    <Button
      size="sm"
      type="button"
      disabled={payoutBlocked}
      title={payoutBlocked ? payoutBlockedMsg : undefined}
      className="h-8 text-xs bg-[#E85D04] text-white hover:bg-[#cf5203]"
    >
      {t("live.donation.sfx.trigger")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t("live.donation.sfx.title")}</DialogTitle>
        </DialogHeader>
        <MocoEarthTransferHero userImageUrl={userImageUrl} transferActive={pending} className="mx-4 rounded-lg">
          {typeof mocoBalance === "number" ? (
            <p className="text-xs text-muted-foreground">
              {t("live.donation.balance", { balance: formatMocoDisplay(mocoBalance) })}
            </p>
          ) : null}
        </MocoEarthTransferHero>
        <div className="space-y-3 px-4 pb-4 pt-3">
          <div className="space-y-1">
            <Label>{t("live.donation.sfx.label")}</Label>
            <select
              className="flex h-10 w-full rounded-lg border-2 border-[#1B3A6B] bg-white px-3 text-sm font-semibold"
              value={sfxKey}
              onChange={(e) => setSfxKey(e.target.value)}
            >
              {DONATION_SFX_CATALOG.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-[#1B3A6B] bg-white px-3 shadow-sm">
            <Input
              type="text"
              inputMode="decimal"
              value={mocoAmount}
              onChange={(e) => setMocoAmount(sanitizeMocoDecimalInput(e.target.value))}
              className="border-0 text-lg font-bold shadow-none focus-visible:ring-0"
            />
            <span className="text-sm font-black text-[#E85D04]">MOCO</span>
          </div>

          <div className="space-y-1">
            <Label>{t("live.donation.message.label")}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("live.donation.message.placeholder")}
              maxLength={500}
              rows={3}
              className="border-2 border-[#1B3A6B]"
            />
            <p className="text-[10px] text-muted-foreground">{t("live.donation.message.hint")}</p>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[11px] leading-relaxed text-muted-foreground">{MOCO_PURCHASE_TERMS_COPY}</span>
          </label>

          {payoutBlocked ? <p className="text-xs text-amber-700">{payoutBlockedMsg}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button
            className="w-full bg-[#E85D04] hover:bg-[#cf5203]"
            disabled={pending || payoutBlocked}
            title={payoutBlocked ? payoutBlockedMsg : undefined}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("live.donation.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
