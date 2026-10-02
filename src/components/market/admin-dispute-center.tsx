"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
      setMsg(errorText(res.error ?? t("market.suvdzo")));
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
            {t("market.disputeParties", {
              opener: dispute.opener.username,
              buyer: o.buyer.username,
              seller: o.seller.username,
            })}
          </p>
        </div>
        <p className="text-xs shrink-0">{o.status} / {o.settlementStatus}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2 space-y-1">
          <p className="font-medium">{t("market.s1u1wzv3")}</p>
          <p>
            {t("market.disputeAmountKrw", {
              amount: (o.subtotalAmount + o.shippingAmount).toLocaleString(),
              fee: o.platformFeeAmount.toLocaleString(),
            })}
          </p>
          <p>
            {t("market.sellerEarnKrw", {
              amount: o.sellerEarnAmount.toLocaleString(),
            })}
          </p>
          <p>PI: {o.stripePaymentIntentId ?? "-"}</p>
          <p className="text-amber-700">{o.settlementHeldReason ?? t("market.sq6g97e")}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2 space-y-1">
          <p className="font-medium">{t("market.sx2lt")}</p>
          <p>
            {o.shipment?.carrier ?? "-"} · {o.shipment?.trackingNumber ?? "-"}
          </p>
          <p>
            {t("market.shipmentStatusLabel", { status: o.shipment?.status ?? "-" })}
          </p>
          {(o.shipment?.proofUrls?.length ?? 0) > 0 && (
            <p>
              {t("market.proofPhotoCount", {
                count: String(o.shipment!.proofUrls.length),
              })}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div>
          <p className="font-medium mb-1">{t("market.s10wuj8k")}</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-2 max-h-28 overflow-auto">
            {JSON.stringify(dispute.buyerEvidence ?? dispute.evidence ?? {}, null, 2)}
          </pre>
        </div>
        <div>
          <p className="font-medium mb-1">{t("market.s1hbt874")}</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-2 max-h-28 overflow-auto">
            {JSON.stringify(dispute.sellerEvidence ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      {"tradeEvidenceSnapshot" in dispute && dispute.tradeEvidenceSnapshot ? (
        <div className="text-xs">
          <p className="font-medium mb-1">{t("market.svkjmp2")}</p>
          <pre className="whitespace-pre-wrap rounded-lg border p-2 max-h-40 overflow-auto">
            {JSON.stringify(dispute.tradeEvidenceSnapshot, null, 2)}
          </pre>
        </div>
      ) : null}

      <a
        href={`/api/admin/marketplace/disputes/${dispute.id}/export`}
        className="inline-flex text-xs font-semibold text-primary hover:underline"
      >
        {t("market.txt")}
      </a>

      {o.sellerProfile && (
        <p className="text-xs text-muted-foreground">
          {t("market.sellerTrustLine", {
            score: String(o.sellerProfile.trustScore),
            tier: o.sellerProfile.trustTier,
            level: o.sellerProfile.sanctionLevel,
            count: String(o.sellerProfile.reportCount),
          })}
        </p>
      )}

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("market.s1627ae8")}
      />
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => resolveMarketplaceDispute(dispute.id, "buyer", note))
          }
        >
          {t("market.s1wcicv")}
        </Button>
        <Input
          className="w-28"
          type="number"
          value={partial}
          onChange={(e) => setPartial(e.target.value)}
          placeholder={t("market.sop23j1")}
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
          {t("market.s1ikbeto")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() => resolveMarketplaceDispute(dispute.id, "seller", note))
          }
        >
          {t("market.s1m8crmk")}
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
                  reason: note || t("market.s1f3lxid", { v0: dispute.id }),
                })
              )
            }
          >
            {t("market.sfq5gds")}
          </Button>
        )}
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

export function AdminReviewOrderCard({ order }: { order: ReviewOrder }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState(t("market.s46vrjh"));

  return (
    <div className="rounded-xl border border-border/60 p-3 text-sm space-y-2">
      <p className="font-medium">{order.items[0]?.titleSnapshot ?? order.id}</p>
      <p className="text-xs text-muted-foreground">
        {t("market.reviewOrderMeta", {
          buyer: order.buyer.username,
          seller: order.seller.username,
          status: order.status,
          score: String(order.riskScore),
          flags: order.riskFlags.join(", "),
        })}
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
          {t("market.s1evj9i")}
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
          {t("market.s1156vqx")}
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
          {t("market.spb05bd")}
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
                reason: t("market.stsrtmx", { v0: level }),
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
