"use client";

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
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { DONATION_SFX_CATALOG } from "@/lib/moco-donation/sfx-catalog";

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
  const [open, setOpen] = useState(false);
  const [mocoAmount, setMocoAmount] = useState(String(MOCO_DONATION_MIN_AMOUNT.SFX));
  const [sfxKey, setSfxKey] = useState(DONATION_SFX_CATALOG[0]?.id ?? "default");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!termsAccepted) {
      setError("후원 전 약관에 동의해 주세요.");
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError("방송 화면에 표시할 메시지를 입력해 주세요.");
      return;
    }
    const moco = Math.floor(Number(mocoAmount) || 0);
    const min = MOCO_DONATION_MIN_AMOUNT.SFX;
    if (moco < min) {
      setError(`최소 ${min} MOCO부터 후원할 수 있습니다.`);
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
        setError(typeof body.error === "string" ? body.error : "후원에 실패했습니다.");
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
    <Button size="sm" type="button" className="h-8 text-xs bg-[#E85D04] text-white hover:bg-[#cf5203]">
      효과음 후원
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>MOCO 효과음 후원</DialogTitle>
        </DialogHeader>
        <MocoEarthTransferHero userImageUrl={userImageUrl} transferActive={pending} className="mx-4 rounded-lg">
          {typeof mocoBalance === "number" ? (
            <p className="text-xs text-muted-foreground">보유 MOCO: {formatMocoDisplay(mocoBalance)}</p>
          ) : null}
        </MocoEarthTransferHero>
        <div className="space-y-3 px-4 pb-4 pt-3">
          <div className="space-y-1">
            <Label>효과음</Label>
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
              type="number"
              min={MOCO_DONATION_MIN_AMOUNT.SFX}
              value={mocoAmount}
              onChange={(e) => setMocoAmount(e.target.value)}
              className="border-0 text-lg font-bold shadow-none focus-visible:ring-0"
            />
            <span className="text-sm font-black text-[#E85D04]">MOCO</span>
          </div>

          <div className="space-y-1">
            <Label>방송 화면 메시지</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="후원과 함께 표시할 문구"
              maxLength={500}
              rows={3}
              className="border-2 border-[#1B3A6B]"
            />
            <p className="text-[10px] text-muted-foreground">OBS 알림창에 닉네임·MOCO·이 메시지가 함께 노출됩니다.</p>
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

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button className="w-full bg-[#E85D04] hover:bg-[#cf5203]" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "후원하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
