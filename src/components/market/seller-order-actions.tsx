"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { updateOrderShipping } from "@/actions/goods-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SellerOrderActions({
  orderId,
  status,
  trackingNo,
}: {
  orderId: string;
  status: string;
  trackingNo: string | null;
}) {
  const [tracking, setTracking] = useState(trackingNo ?? "");
  const [loading, setLoading] = useState(false);

  async function setStatus(next: "PREPARING" | "SHIPPED" | "DELIVERED") {
    setLoading(true);
    await updateOrderShipping(orderId, next, next === "SHIPPED" ? tracking : undefined);
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {status === "PAID" && (
        <Button size="sm" variant="outline" className="rounded-xl" disabled={loading} onClick={() => setStatus("PREPARING")}>
          {t("market.sq4kb3p")}
        </Button>
      )}
      {(status === "PAID" || status === "PREPARING") && (
        <>
          <Input
            placeholder={t("market.s651uyg")}
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="rounded-xl h-9 text-sm max-w-[180px]"
          />
          <Button size="sm" className="rounded-xl" disabled={loading} onClick={() => setStatus("SHIPPED")}>
            {t("market.s1dn69dv")}
          </Button>
        </>
      )}
      {status === "SHIPPED" && (
        <Button size="sm" className="rounded-xl" disabled={loading} onClick={() => setStatus("DELIVERED")}>
          {t("market.s9sbg71")}
        </Button>
      )}
    </div>
  );
}
