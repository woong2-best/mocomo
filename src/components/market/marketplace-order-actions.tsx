"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelMarketplaceOrder,
  confirmMarketplaceOrder,
  openMarketplaceDispute,
  requestMarketplaceRefund,
  sellerRespondMarketplaceRefund,
  sellerSetOrderStatus,
  sellerUpdateShipment,
  submitMarketplaceDisputeEvidence,
  submitMarketplaceReview,
} from "@/actions/marketplace-checkout";
import { confirmDirectTradePayment } from "@/actions/marketplace-direct-checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCarriersForShipment } from "@/lib/marketplace/shipping-config";
import { MARKETPLACE_DISPUTE_REASONS } from "@/lib/marketplace/protection-config";
import type { MarketplaceDisputeReason } from "@prisma/client";

type OrderDetail = NonNullable<
  Awaited<ReturnType<typeof import("@/actions/marketplace-checkout").getMarketplaceOrderDetail>>
>;

export function MarketplaceOrderActions({ order }: { order: OrderDetail }) {
  const carriers = useMemo(
    () => getCarriersForShipment({ destCountry: order.shipCountry }),
    [order.shipCountry]
  );
  const [pending, startTransition] = useTransition();
  const [carrierCode, setCarrierCode] = useState(
    () => order.shipment?.carrierCode ?? carriers[0]?.id ?? "INTL_EMS"
  );
  const [tracking, setTracking] = useState(order.shipment?.trackingNumber ?? "");
  const [proofUrls, setProofUrls] = useState("");
  const [reason, setReason] = useState("");
  const [disputeCode, setDisputeCode] = useState<MarketplaceDisputeReason>("NOT_RECEIVED");
  const [evidenceUrls, setEvidenceUrls] = useState("");
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

      {order.isSeller && ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status) && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">배송 처리</p>
          <p className="text-[11px] text-muted-foreground">
            MoCoMo는 배송을 대행하지 않습니다. 배송사·송장만 기록합니다.
          </p>

          <div className="flex flex-wrap gap-2">
            {order.status === "PAID" && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => sellerSetOrderStatus(order.id, "PREPARING"))}
              >
                상품 준비 중
              </Button>
            )}
            {(order.status === "SHIPPED" || order.status === "PREPARING") && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    sellerUpdateShipment({
                      orderId: order.id,
                      carrierCode,
                      trackingNumber: tracking,
                      status: "IN_TRANSIT",
                    })
                  )
                }
              >
                배송 중
              </Button>
            )}
          </div>

          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={carrierCode}
            onChange={(e) => setCarrierCode(e.target.value)}
          >
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.country ? ` (${c.country})` : " (국제)"}
              </option>
            ))}
          </select>
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="송장번호 (필수)"
          />
          <Input
            value={proofUrls}
            onChange={(e) => setProofUrls(e.target.value)}
            placeholder="발송·운송장·포장 사진 URL (쉼표 구분, 선택)"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || !tracking.trim()}
              onClick={() =>
                run(() =>
                  sellerUpdateShipment({
                    orderId: order.id,
                    carrierCode,
                    trackingNumber: tracking,
                    status: "SHIPPED",
                    proofUrls: proofUrls.split(/[,\s]+/).map((u) => u.trim()).filter(Boolean),
                  })
                )
              }
            >
              발송 완료
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
                    carrierCode,
                    trackingNumber: tracking || order.shipment?.trackingNumber || "N/A",
                    status: "DELIVERED",
                    proofUrls: proofUrls.split(/[,\s]+/).map((u) => u.trim()).filter(Boolean),
                  })
                )
              }
            >
              배송 완료
            </Button>
          </div>
        </section>
      )}

      {order.isSeller &&
        order.disputes.some((d) => ["OPEN", "EVIDENCE"].includes(d.status)) && (
          <section className="rounded-xl border border-amber-500/40 p-3 space-y-2">
            <p className="text-sm font-semibold">분쟁 증빙 제출 (판매자 보호)</p>
            <Input
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              placeholder="운송장·발송사진·채팅 캡처 URL (쉼표)"
            />
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="설명"
            />
            {order.disputes
              .filter((d) => ["OPEN", "EVIDENCE"].includes(d.status))
              .map((d) => (
                <Button
                  key={d.id}
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      submitMarketplaceDisputeEvidence(
                        d.id,
                        evidenceUrls.split(/[,\s]+/).map((u) => u.trim()).filter(Boolean),
                        reason
                      )
                    )
                  }
                >
                  증빙 제출
                </Button>
              ))}
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
          {order.checkoutMode === "DIRECT_TRADE" ? (
            <p className="text-[11px] text-muted-foreground">
              무통장 직거래 주문입니다. 입금 후 아래 버튼으로 송금 완료를 표시해 주세요.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              결제금은 구매 확정(또는 자동 확정) 전까지 에스크로로 보호됩니다. 정산 상태:{" "}
              {order.settlementStatus}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {order.checkoutMode === "DIRECT_TRADE" && order.status === "AWAITING_PAYMENT" && (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => confirmDirectTradePayment(order.id))}
              >
                송금 완료 표시
              </Button>
            )}
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
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={disputeCode}
            onChange={(e) => setDisputeCode(e.target.value as MarketplaceDisputeReason)}
          >
            {MARKETPLACE_DISPUTE_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="환불/분쟁 상세 사유"
          />
          <Input
            value={evidenceUrls}
            onChange={(e) => setEvidenceUrls(e.target.value)}
            placeholder="증빙 사진 URL (쉼표, 선택)"
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
              onClick={() =>
                run(() =>
                  openMarketplaceDispute(
                    order.id,
                    reason,
                    disputeCode,
                    evidenceUrls.split(/[,\s]+/).map((u) => u.trim()).filter(Boolean)
                  )
                )
              }
            >
              분쟁 신고 (정산 즉시 보류)
            </Button>
          </div>
        </section>
      )}

      {order.isBuyer &&
        (order.status === "CONFIRMED" ||
          order.status === "SETTLED" ||
          order.status === "DELIVERED") &&
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
