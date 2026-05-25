"use client";

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
          준비 중
        </Button>
      )}
      {(status === "PAID" || status === "PREPARING") && (
        <>
          <Input
            placeholder="운송장 번호"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="rounded-xl h-9 text-sm max-w-[180px]"
          />
          <Button size="sm" className="rounded-xl" disabled={loading} onClick={() => setStatus("SHIPPED")}>
            발송 완료
          </Button>
        </>
      )}
      {status === "SHIPPED" && (
        <Button size="sm" className="rounded-xl" disabled={loading} onClick={() => setStatus("DELIVERED")}>
          배송 완료 처리
        </Button>
      )}
    </div>
  );
}
