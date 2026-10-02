"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CouponRedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
      <div className="flex-1 min-w-[12rem]">
        <label className="text-xs text-muted-foreground">{t("coupon.s1m7fg2g")}</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="WELCOME2026"
          className="font-mono"
        />
      </div>
      <Button
        type="button"
        disabled={pending || code.trim().length < 4}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const res = await fetch("/api/coupons/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (!res.ok) setMsg(data.error || t("coupon.skg4s7s"));
            else {
              setMsg(t("coupon.satjfw5"));
              setCode("");
              router.refresh();
            }
          })
        }
      >
        {t("events.svsek")}
      </Button>
      {msg ? <p className="w-full text-sm text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
