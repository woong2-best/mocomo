"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { createPhysicalOrderDraft } from "@/actions/goods-shop";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/money";

export function PhysicalPurchaseForm({
  productId,
  productTitle,
  unitPrice,
  shippingFee,
  paymentsEnabled,
}: {
  productId: string;
  productTitle: string;
  unitPrice: number;
  shippingFee: number;
  paymentsEnabled: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [detail, setDetail] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const previewTotal = unitPrice * qty + shippingFee;

  async function prepareOrder(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createPhysicalOrderDraft({
      productId,
      quantity: qty,
      recipientName: name,
      phone,
      zipCode: zip,
      address,
      detailAddress: detail,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      return;
    }
    if ("orderId" in res && res.orderId) {
      setOrderId(res.orderId);
      setAmount(res.amount ?? previewTotal);
    }
  }

  if (orderId) {
    return (
      <div className="space-y-3 rounded-2xl border border-border/60 p-4 bg-muted/20">
        <p className="font-semibold">{t("market.s16chxyc")}</p>
        <p className="text-sm">
          {t("market.s1e2rhal")} <strong className="text-neon-cyan">{formatUsd(amount)}</strong>
        </p>
        {paymentsEnabled ? (
          <PayButton
            type="PHYSICAL_GOODS"
            amount={amount}
            orderName={productTitle}
            metadata={{ orderId }}
            className="w-full rounded-2xl h-11"
          >
            {t("market.smmgb44")}
          </PayButton>
        ) : (
          <p className="text-sm text-destructive">{t("market.s13ujlm2")}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={prepareOrder} className="space-y-3 rounded-2xl border border-border/60 p-4">
      <h3 className="font-semibold text-sm">{t("market.s1dy6h72")}</h3>
      <Input placeholder={t("market.s1fvnx5f")} value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl" />
      <Input placeholder={t("market.stw1wr")} value={phone} onChange={(e) => setPhone(e.target.value)} required className="rounded-xl" />
      <Input placeholder={t("market.postal")} value={zip} onChange={(e) => setZip(e.target.value)} required className="rounded-xl" />
      <Input placeholder={t("market.address")} value={address} onChange={(e) => setAddress(e.target.value)} required className="rounded-xl" />
      <Input placeholder={t("market.s1vr33nd")} value={detail} onChange={(e) => setDetail(e.target.value)} className="rounded-xl" />
      <div className="flex items-center gap-2">
        <label className="text-sm">{t("market.sy0tt")}</label>
        <Input
          type="number"
          min={1}
          max={10}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-20 rounded-xl"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {t("market.physicalOrderTotal", {
          unit: formatUsd(unitPrice),
          qty: String(qty),
          shipping: formatUsd(shippingFee),
        })}{" "}
        <strong>{formatUsd(previewTotal)}</strong>
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
        {loading ? t("market.ssl94sx") : t("market.s1d0ge5c")}
      </Button>
    </form>
  );
}
