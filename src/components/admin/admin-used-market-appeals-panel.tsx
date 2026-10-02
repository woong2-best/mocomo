"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  getAdminUsedMarketAppeals,
  getUsedMarketAppealDetail,
  updateUsedMarketAppealStatus,
  type UsedMarketAppealStatusFilter,
} from "@/actions/admin-used-market-appeal";
import { appealStatusLabel } from "@/lib/account-status";
import { formatUsedPrice } from "@/lib/used-market";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AppealStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type AppealRow = Awaited<ReturnType<typeof getAdminUsedMarketAppeals>>[number];
type AppealDetailResult = Awaited<ReturnType<typeof getUsedMarketAppealDetail>>;
type AppealDetailSuccess = Exclude<AppealDetailResult, { error: string }>;

function isAppealDetailSuccess(
  detail: AppealDetailResult | null
): detail is AppealDetailSuccess {
  return !!detail && !("error" in detail);
}

const FILTER_OPTIONS: { value: UsedMarketAppealStatusFilter; label: string }[] = [
  { value: "OPEN", label: t("admin.ssiz2k") },
  { value: "RECEIVED", label: t("lib.account.status.s3ed6f559cf") },
  { value: "UNDER_REVIEW", label: t("lib.direct-trade.smlzpqp") },
  { value: "INFO_REQUESTED", label: t("admin.sma3fnh") },
  { value: "APPROVED", label: t("lib.account.status.s0d1cd67197") },
  { value: "REJECTED", label: t("lib.account.status.s804c263a67") },
  { value: "ALL", label: t("lib.live.categories.s934dd25ec5") },
];

const DECISION_ACTIONS: AppealStatus[] = [
  "UNDER_REVIEW",
  "INFO_REQUESTED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
];

function fmt(dt: Date | string | null | undefined) {
  if (!dt) return "—";
  return format(new Date(dt), "yyyy-MM-dd HH:mm", { locale: ko });
}

export function AdminUsedMarketAppealsPanel({
  initialAppeals,
}: {
  initialAppeals: AppealRow[];
}) {
  const [filter, setFilter] = useState<UsedMarketAppealStatusFilter>("OPEN");
  const [appeals, setAppeals] = useState(initialAppeals);
  const [selectedId, setSelectedId] = useState<string | null>(initialAppeals[0]?.id ?? null);
  const [detail, setDetail] = useState<AppealDetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getUsedMarketAppealDetail(selectedId).then((res) => {
      if (!cancelled) {
        setDetail(res);
        setDetailLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function loadAppeals(nextFilter: UsedMarketAppealStatusFilter) {
    startTransition(async () => {
      const rows = await getAdminUsedMarketAppeals(nextFilter);
      setAppeals(rows);
      setFilter(nextFilter);
      if (!rows.some((r) => r.id === selectedId)) {
        setSelectedId(rows[0]?.id ?? null);
        setDetail(null);
      }
    });
  }

  function loadDetail(appealId: string) {
    setSelectedId(appealId);
  }

  function applyStatus(status: AppealStatus) {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await updateUsedMarketAppealStatus(
        selectedId,
        status,
        decisionNote.trim() || `관리자 처리: ${appealStatusLabel(status)}`
      );
      if ("error" in res && res.error) {
        setMsg(errorText(res.error));
        return;
      }
      setMsg(`${appealStatusLabel(status)} 처리되었습니다.`);
      setDecisionNote("");
      const rows = await getAdminUsedMarketAppeals(filter);
      setAppeals(rows);
      const refreshed = await getUsedMarketAppealDetail(selectedId);
      setDetail(refreshed);
    });
  }

  const appealDetail = isAppealDetailSuccess(detail) ? detail : null;
  const selectedAppeal = appealDetail?.appeal ?? null;
  const sanctionLogs = appealDetail?.sanctionLogs ?? [];
  const bids = appealDetail?.bids ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("admin.shck7cw")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={filter === opt.value ? "default" : "outline"}
              disabled={pending}
              onClick={() => loadAppeals(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[320px]">
          <div className="rounded-xl border divide-y max-h-[480px] overflow-y-auto">
            {appeals.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                해당 상태의 이의 신청이 없습니다.
              </p>
            ) : (
              appeals.map((appeal) => (
                <button
                  key={appeal.id}
                  type="button"
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/40 transition-colors",
                    selectedId === appeal.id && "bg-muted/60"
                  )}
                  onClick={() => loadDetail(appeal.id)}
                >
                  <p className="font-medium text-sm line-clamp-1">{appeal.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    @{appeal.user.username} · {appealStatusLabel(appeal.status)} · {fmt(appeal.createdAt)}
                  </p>
                  {appeal.listing && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      경매: {appeal.listing.title}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-4 max-h-[480px] overflow-y-auto">
            {!selectedId ? (
              <p className="text-sm text-muted-foreground">{t("admin.s1g6u7bd")}</p>
            ) : detailLoading ? (
              <p className="text-sm text-muted-foreground">{t("admin.stfiqrc")}</p>
            ) : detail && "error" in detail ? (
              <p className="text-sm text-destructive">{errorText(detail.error)}</p>
            ) : selectedAppeal ? (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">{selectedAppeal.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    @{selectedAppeal.user.username} · {selectedAppeal.contactEmail} ·{" "}
                    {appealStatusLabel(selectedAppeal.status)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed border rounded-lg p-3 bg-muted/20">
                    {selectedAppeal.content}
                  </p>
                  {selectedAppeal.user.usedMarketBannedAt && (
                    <p className="text-xs text-destructive">
                      현재 중고거래 제한 중 · {fmt(selectedAppeal.user.usedMarketBannedAt)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">{t("admin.sqajjn0")}</h4>
                  {sanctionLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("admin.swsf2ka")}</p>
                  ) : (
                    <ul className="text-xs space-y-2">
                      {sanctionLogs.map((log) => (
                        <li key={log.id} className="rounded-lg border p-2 space-y-1">
                          <p className="font-medium">
                            {log.reason} · {fmt(log.sanctionedAt)}
                          </p>
                          <p className="text-muted-foreground">
                            {log.listing?.title ?? log.listingId}
                          </p>
                          <p className="text-muted-foreground tabular-nums">
                            낙찰가 {log.winningBidAmount?.toLocaleString() ?? "—"}원 · 입찰 동의{" "}
                            {fmt(log.bidTermsAcceptedAt)} · 보존 ~{fmt(log.retainUntil)}
                          </p>
                          <p className="text-muted-foreground">
                            경매 마감 {fmt(log.auctionEndsAt)} · 결제 기한 {fmt(log.paymentDueAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selectedAppeal.listing && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      입찰 이력 — {selectedAppeal.listing.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      상태 {selectedAppeal.listing.auctionState ?? "—"} · 입찰{" "}
                      {selectedAppeal.listing.bidCount}건 · 마감{" "}
                      {fmt(selectedAppeal.listing.auctionEndsAt)}
                    </p>
                    {bids.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("admin.s110axhg")}</p>
                    ) : (
                      <ul className="text-xs divide-y rounded-lg border">
                        {bids.map((bid) => (
                          <li
                            key={bid.id}
                            className={cn(
                              "flex justify-between gap-2 p-2",
                              bid.bidderId === selectedAppeal.userId && "bg-orange-500/5"
                            )}
                          >
                            <span>
                              @{bid.bidder.username}
                              {bid.bidderId === selectedAppeal.userId && (
                                <span className="text-orange-600 ml-1">{t("admin.sq1roem")}</span>
                              )}
                            </span>
                            <span className="tabular-nums text-right shrink-0">
                              {formatUsedPrice(bid.amount, "krw")}
                              <br />
                              <span className="text-muted-foreground">{fmt(bid.createdAt)}</span>
                              {bid.termsAcceptedAt && (
                                <>
                                  <br />
                                  <span className="text-muted-foreground">
                                    동의 {fmt(bid.termsAcceptedAt)}
                                  </span>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="space-y-2 border-t pt-3">
                  <label className="text-sm font-medium" htmlFor="decision-note">
                    처리 사유 (알림 본문에 포함)
                  </label>
                  <Textarea
                    id="decision-note"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder={t("admin.s4bkrtd")}
                    className="min-h-[72px] rounded-lg text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {DECISION_ACTIONS.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={
                          status === "APPROVED"
                            ? "default"
                            : status === "REJECTED"
                              ? "destructive"
                              : "outline"
                        }
                        disabled={pending}
                        onClick={() => applyStatus(status)}
                      >
                        {appealStatusLabel(status)}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("admin.srcx2jz")}</p>
            )}
          </div>
        </div>

        {msg && <p className="text-sm text-primary">{msg}</p>}
      </CardContent>
    </Card>
  );
}
