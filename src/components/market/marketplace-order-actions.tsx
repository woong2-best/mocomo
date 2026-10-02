"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
import { useLocale } from "@/components/providers/locale-provider";

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
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [msg, setMsg] = useState("");

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setMsg("");
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMsg(errorText(res.error));
      else setMsg(t("market.s16bo0w1"));
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      {order.isSeller && ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status) && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">{t("market.s1dy786b")}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("market.mocomo")}
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
                {t("market.s16ka6z2")}
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
                {t("market.soivoki")}
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
                {c.country ? ` (${c.country})` : t("market.s18ngs2")}
              </option>
            ))}
          </select>
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder={t("market.s154vzeh")}
          />
          <Input
            value={proofUrls}
            onChange={(e) => setProofUrls(e.target.value)}
            placeholder={t("market.url_5")}
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
              {t("market.s1dn69dv")}
            </Button>
          </div>
        </section>
      )}

      {order.isSeller &&
        order.disputes.some((d) => ["OPEN", "EVIDENCE"].includes(d.status)) && (
          <section className="rounded-xl border border-amber-500/40 p-3 space-y-2">
            <p className="text-sm font-semibold">{t("market.s9fah2w")}</p>
            <Input
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              placeholder={t("market.url_6")}
            />
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("market.sxvj5")}
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
                  {t("market.suzz138")}
                </Button>
              ))}
          </section>
        )}

      {order.isSeller &&
        order.refunds.some((r) => r.status === "REQUESTED") && (
          <section className="rounded-xl border border-border/60 p-3 space-y-2">
            <p className="text-sm font-semibold">{t("market.s11gwpvv")}</p>
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
                    {t("market.sy7rz")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => sellerRespondMarketplaceRefund(r.id, false))}
                  >
                    {t("collab.reject")}
                  </Button>
                </div>
              ))}
          </section>
        )}

      {order.isBuyer && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">{t("market.s10wttwf")}</p>
          {order.checkoutMode === "DIRECT_TRADE" ? (
            <p className="text-[11px] text-muted-foreground">
              {t("market.s1702cie")}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {t("market.escrowUntilConfirm")} {order.settlementStatus}
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
                {t("market.s1cpi727")}
              </Button>
            )}
            {order.status === "DELIVERED" &&
              order.shipment?.deliverySignalSource !== "fallback" && (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => confirmMarketplaceOrder(order.id))}
              >
                {t("market.s1q9tsp4")}
              </Button>
            )}
            {order.status === "DELIVERED" &&
              order.shipment?.deliverySignalSource === "fallback" && (
              <p className="text-[11px] text-muted-foreground w-full">
                {t("market.s1da6p5g")}
              </p>
            )}
            {["AWAITING_PAYMENT", "PAID", "PREPARING"].includes(order.status) && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => cancelMarketplaceOrder(order.id))}
              >
                {t("toast.cancel")}
              </Button>
            )}
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("market.s11gurjf")}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending || !reason.trim()}
              onClick={() => run(() => requestMarketplaceRefund(order.id, reason))}
            >
              {t("market.s9n2r2h")}
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
            <p className="text-sm font-semibold">{t("market.swmh0")}</p>
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
              placeholder={t("market.s13n7n81")}
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
              {t("market.s13n8aco")}
            </Button>
          </section>
        )}

      {order.downloads.length > 0 && (
        <section className="rounded-xl border border-border/60 p-3 space-y-2">
          <p className="text-sm font-semibold">{t("market.s8br810")}</p>
          {order.downloads.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("market.downloadCount", {
                  used: String(d.downloadCount),
                  max: String(d.maxDownloads),
                })}
                {d.expiresAt ? ` · ~${d.expiresAt.toISOString().slice(0, 10)}` : ""}
              </span>
              <Button type="button" size="sm" variant="secondary" asChild>
                <Link href={`/api/market/download/${d.downloadToken}`} target="_blank">
                  {t("market.sne9z68")}
                </Link>
              </Button>
            </div>
          ))}
        </section>
      )}

      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={`/market/orders/${order.id}/receipt`} target="_blank">
          {t("market.s1tikt06")}
        </Link>
      </Button>
    </div>
  );
}

function MarketplaceDisputeForm({
  orderId,
  disabled,
}: {
  orderId: string;
  disabled?: boolean;
}) {
  const { locale , t } = useLocale();
  const [pending, startTransition] = useTransition();
  const [disputeCode, setDisputeCode] = useState<MarketplaceDisputeReason>("NOT_RECEIVED");
  const [detail, setDetail] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [msg, setMsg] = useState("");

  function submit() {
    setMsg("");
    const text = detail.trim();
    if (!text) {
      setMsg(t("report.detailsPlaceholder"));
      return;
    }
    const urls = evidenceUrls
      .split(/[,\n\s]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 12);
    startTransition(async () => {
      const res = await openMarketplaceDispute(orderId, text, disputeCode, urls);
      if (res.error) setMsg(errorText(res.error));
      else {
        setMsg(
          t("ui.dispute_filed_trade_records_are_preserved")
        );
        window.location.reload();
      }
    });
  }

  return (
    <section className="rounded-xl border border-destructive/35 bg-destructive/5 p-3 space-y-2">
      <p className="text-sm font-semibold">
        {t("ui.dispute_fraud_report")}
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("ui.payment_chat_and_shipping_timelines_are")}
      </p>
      <select
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={disputeCode}
        disabled={disabled || pending}
        onChange={(e) => setDisputeCode(e.target.value as MarketplaceDisputeReason)}
      >
        {MARKETPLACE_DISPUTE_REASONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        className="w-full min-h-[88px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={detail}
        disabled={disabled || pending}
        onChange={(e) => setDetail(e.target.value)}
        placeholder={t("ui.detailed_description_of_the_incident")}
      />
      <Input
        value={evidenceUrls}
        disabled={disabled || pending}
        onChange={(e) => setEvidenceUrls(e.target.value)}
        placeholder={t("ui.evidence_urls_screenshots_comma_or_newline")}
      />
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={disabled || pending}
        onClick={submit}
      >
        {t("ui.submit_dispute")}
      </Button>
    </section>
  );
}
