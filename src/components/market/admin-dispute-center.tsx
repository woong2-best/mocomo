"use client";

import { useState, useTransition } from "react";
import {
  adminClearMarketplaceReview,
  adminHoldMarketplaceSettlement,
  adminReleaseMarketplaceSettlement,
  adminSanctionMarketplaceSeller,
  resolveMarketplaceDispute,
} from "@/actions/marketplace-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplaceSanctionLevel } from "@prisma/client";

type DisputeRow = Awaited<
  ReturnType<typeof import("@/actions/marketplace-admin").getAdminMarketplaceDisputeCenter>
>["disputes"][number];

type ReviewOrder = Awaited<
  ReturnType<typeof import("@/actions/marketplace-admin").getAdminMarketplaceDisputeCenter>
>["reviewOrders"][number];

export function AdminDisputeCard({ dispute }: { dispute: DisputeRow }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [partial, setPartial] = useState("");
  const [msg, setMsg] = useState("");
  const o = dispute.order;

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setMsg("");
    start(async () => {
      const res = await fn();
      setMsg(res.error ?? "처리됨");
      window.location.reload();
    });
  }

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-semibold">
            {o.items[0]?.titleSnapshot ?? o.id} · {dispute.reasonCode}
          </p>
          <p className="text-xs text-muted-foreground">
            @{dispute.opener.username} 제기 · 구매 @{o.buyer.username} → 판매 @{o.seller.username}
          </p>
        </div>
        <p className="text-xs shrink-0">{o.status} / {o.settlementStatus}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2 space-y-1">
          <p className="font-medium">결제·에스크로</p>
          <p>
            {(o.subtotalAmount + o.shippingAmount).toLocaleString()}원 (수수료{" "}
            {o.platformFeeAmount.toLocaleString()})
          </p>
          <p>판매자 수령 예정 {o.sellerEarnAmount.toLocaleString()}원</p>
          <p>PI: {o.stripePaymentIntentId ?? "-"}</p>
          <p className="text-amber-700">{o.settlementHeldReason ?? "정산 보류 중"}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2 space-y-1">
          <p className="font-medium">배송</p>
          <p>
            {o.shipment?.carrier ?? "-"} · {o.shipment?.trackingNumber ?? "-"}
          </p>
          <p>상태 {o.shipment?.status ?? "-"}</p>
          {(o.shipment?.proofUrls?.length ?? 0) > 0 && (
            <p>증빙 사진 {o.shipment!.proofUrls.length}장</p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div>
          <p className="font-medium mb-1">구매자 증빙</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-2 max-h-28 overflow-auto">
            {JSON.stringify(dispute.buyerEvidence ?? dispute.evidence ?? {}, null, 2)}
          </pre>
        </div>
        <div>
          <p className="font-medium mb-1">판매자 증빙</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-2 max-h-28 overflow-auto">
            {JSON.stringify(dispute.sellerEvidence ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      {o.sellerProfile && (
        <p className="text-xs text-muted-foreground">
          판매자 신뢰도 {o.sellerProfile.trustScore} ({o.sellerProfile.trustTier}) · 제재{" "}
          {o.sellerProfile.sanctionLevel} · 신고 {o.sellerProfile.reportCount}
        </p>
      )}

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="처리 메모"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => resolveMarketplaceDispute(dispute.id, "buyer", note))
          }
        >
          환불 승인 (구매자 승)
        </Button>
        <Input
          className="w-28"
          type="number"
          value={partial}
          onChange={(e) => setPartial(e.target.value)}
          placeholder="부분금액"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() =>
              resolveMarketplaceDispute(dispute.id, "partial", note, Number(partial) || 0)
            )
          }
        >
          부분 환불
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() => resolveMarketplaceDispute(dispute.id, "seller", note))
          }
        >
          환불 거절 · 정산
        </Button>
        {o.sellerProfile && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              run(() =>
                adminSanctionMarketplaceSeller({
                  sellerProfileId: o.sellerProfile!.id,
                  escalate: true,
                  reason: note || `분쟁 ${dispute.id} 관련 제재`,
                })
              )
            }
          >
            판매자 제재 상향
          </Button>
        )}
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

export function AdminReviewOrderCard({ order }: { order: ReviewOrder }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("관리자 정산 보류");

  return (
    <div className="rounded-xl border border-border/60 p-3 text-sm space-y-2">
      <p className="font-medium">{order.items[0]?.titleSnapshot ?? order.id}</p>
      <p className="text-xs text-muted-foreground">
        @{order.buyer.username} → @{order.seller.username} · {order.status} · 위험{" "}
        {order.riskScore} [{order.riskFlags.join(", ")}]
      </p>
      <p className="text-xs">{order.settlementHeldReason}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminClearMarketplaceReview(order.id);
              window.location.reload();
            })
          }
        >
          검토 해제 · 진행
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminReleaseMarketplaceSettlement(order.id);
              window.location.reload();
            })
          }
        >
          정산 강제 진행
        </Button>
        <Input
          className="w-40"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminHoldMarketplaceSettlement(order.id, reason);
              window.location.reload();
            })
          }
        >
          정산 보류
        </Button>
      </div>
    </div>
  );
}

export function AdminSanctionQuick({
  sellerProfileId,
}: {
  sellerProfileId: string;
}) {
  const [pending, start] = useTransition();
  const levels: MarketplaceSanctionLevel[] = [
    "WARNING",
    "LISTING_RESTRICTED",
    "SALES_SUSPENDED",
    "SETTLEMENT_HELD",
    "PERMANENT_BAN",
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {levels.map((level) => (
        <Button
          key={level}
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminSanctionMarketplaceSeller({
                sellerProfileId,
                level,
                reason: `관리자 지정: ${level}`,
              });
              window.location.reload();
            })
          }
        >
          {level}
        </Button>
      ))}
    </div>
  );
}
