"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelMarketplaceOrder,
  confirmMarketplaceOrder,
  openMarketplaceDispute,
  requestMarketplaceRefund,
  sellerRespondMarketplaceRefund,
  sellerUpdateShipment,
  submitMarketplaceReview,
} from "@/actions/marketplace-checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/marketplace-checkout").getMarketplaceOrderDetail>>
>;

export function MarketplaceOrderActions({ order }: { order: OrderDetail }) {
  const [pending, startTransition] = useTransition();
  const [carrier, setCarrier] = useState("EMS");
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [msg, setMsg] = useState("");

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setMsg("");
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMsg(res.error);
      else setMsg("처리되었습니다.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      {order.isSeller && ["PAID", "PREPARING", "SHIPPED"].includes(order.status) && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">배송 처리</p>
          <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="배송사" />
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="송장번호"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() =>
                  sellerUpdateShipment({
                    orderId: order.id,
                    carrier,
                    trackingNumber: tracking,
                    status: "SHIPPED",
                  })
                )
              }
            >
              발송
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(() =>
                  sellerUpdateShipment({
                    orderId: order.id,
                    carrier,
                    trackingNumber: tracking,
                    status: "DELIVERED",
                  })
                )
              }
            >
              배송완료
            </Button>
          </div>
        </section>
      )}

      {order.isSeller &&
        order.refunds.some((r) => r.status === "REQUESTED") && (
          <section className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-sm font-semibold">환불 요청 처리</p>
            {order.refunds
              .filter((r) => r.status === "REQUESTED")
              .map((r) => (
                <div key={r.id} className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="text-muted-foreground flex-1">{r.reason}</span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => sellerRespondMarketplaceRefund(r.id, true))}
                  >
                    승인
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => sellerRespondMarketplaceRefund(r.id, false))}
                  >
                    거절
                  </Button>
                </div>
              ))}
          </section>
        )}

      {order.isBuyer && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">구매자 액션</p>
          <div className="flex flex-wrap gap-2">
            {(order.status === "DELIVERED" || order.status === "SHIPPED") && (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => confirmMarketplaceOrder(order.id))}
              >
                구매 확정
              </Button>
            )}
            {["AWAITING_PAYMENT", "PAID", "PREPARING"].includes(order.status) && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => cancelMarketplaceOrder(order.id))}
              >
                취소
              </Button>
            )}
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="환불/분쟁 사유"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending || !reason.trim()}
              onClick={() => run(() => requestMarketplaceRefund(order.id, reason))}
            >
              환불 요청
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending || !reason.trim()}
              onClick={() => run(() => openMarketplaceDispute(order.id, reason))}
            >
              분쟁 신고
            </Button>
          </div>
        </section>
      )}

      {order.isBuyer &&
        (order.status === "CONFIRMED" || order.status === "DELIVERED") &&
        !order.review && (
          <section className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-sm font-semibold">리뷰</p>
            <Input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value) || 5)}
            />
            <Input
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="리뷰 내용"
            />
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() =>
                  submitMarketplaceReview({ orderId: order.id, rating, body: reviewBody })
                )
              }
            >
              리뷰 등록
            </Button>
          </section>
        )}

      {order.downloads.length > 0 && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">디지털 다운로드</p>
          {order.downloads.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {d.downloadCount}/{d.maxDownloads}회
                {d.expiresAt ? ` · ~${d.expiresAt.toISOString().slice(0, 10)}` : ""}
              </span>
              <Button type="button" size="sm" variant="secondary" asChild>
                <Link href={`/api/market/download/${d.downloadToken}`} target="_blank">
                  다운로드
                </Link>
              </Button>
            </div>
          ))}
        </section>
      )}

      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`/market/orders/${order.id}/receipt`} target="_blank">
          영수증 보기
        </Link>
      </Button>
    </div>
  );
}
