"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { updatePhysicalProductPrice } from "@/actions/goods-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SetProductPriceForm({
  productId,
  currentPrice,
  currentShipping,
}: {
  productId: string;
  currentPrice: number;
  currentShipping: number;
}) {
  const [price, setPrice] = useState(String(currentPrice || ""));
  const [shipping, setShipping] = useState(String(currentShipping || 3000));
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updatePhysicalProductPrice(productId, Number(price), Number(shipping));
    setLoading(false);
    if ("error" in res && res.error) setMsg(errorText(res.error));
    else setMsg(t("market.slknfn6"));
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-medium">{t("market.saumbqe")}</p>
      <Input
        type="number"
        placeholder={t("market.usd")}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="rounded-xl"
        min={1000}
        required
      />
      <Input
        type="number"
        placeholder={t("market.ssiacz")}
        value={shipping}
        onChange={(e) => setShipping(e.target.value)}
        className="rounded-xl"
        min={0}
      />
      <Button type="submit" className="w-full rounded-xl" disabled={loading}>
        {loading ? t("calendar.saving") : t("market.s1vdrv29")}
      </Button>
      {msg && <p className="text-xs text-primary">{msg}</p>}
    </form>
  );
}
