"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  applyModerationSanction,
  getModerationReviewQueue,
  getModerationUserDetail,
} from "@/actions/moderation-admin";
import { accountStatusLabel } from "@/lib/account-status";
import {
  MODERATION_SANCTION_LABELS,
  type ModerationSanctionType,
} from "@/lib/moderation-sanctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountStatus } from "@prisma/client";
import type { RiskTier } from "@/lib/risk-score-rules";
import { AlertTriangle, ChevronDown, ChevronUp, Shield } from "lucide-react";

type QueueItem = Awaited<ReturnType<typeof getModerationReviewQueue>>[number];
type UserDetail = NonNullable<Awaited<ReturnType<typeof getModerationUserDetail>>>;

const SANCTION_OPTIONS: ModerationSanctionType[] = [
  "warning",
  "limited",
  "read_only",
  "temp_7",
  "temp_30",
  "permanent",
  "restore",
];

function tierBadgeClass(tier: RiskTier) {
  switch (tier) {
    case "urgent":
      return "bg-red-600/15 text-red-600";
    case "pending_sanction":
    case "review":
      return "bg-orange-500/15 text-orange-600";
    case "limited":
      return "bg-amber-500/15 text-amber-700";
    case "caution":
      return "bg-yellow-500/15 text-yellow-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function AdminModerationPanel({ initialQueue }: { initialQueue: QueueItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [reason, setReason] = useState(t("admin.swbk926"));
  const [sanction, setSanction] = useState<ModerationSanctionType>("warning");
  const [pending, startTransition] = useTransition();

  function refreshQueue() {
    startTransition(async () => {
      const rows = await getModerationReviewQueue();
      setQueue(rows);
    });
  }

  function loadDetail(userId: string) {
    if (expandedId === userId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(userId);
    startTransition(async () => {
      const row = await getModerationUserDetail(userId);
      setDetail(row);
    });
  }

  function applySanction(userId: string) {
    const label = MODERATION_SANCTION_LABELS[sanction];
    const ok = window.confirm(
      `다음 제재를 적용하시겠습니까?\n\n제재: ${label}\n사유: ${reason.trim()}`
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await applyModerationSanction(userId, sanction, reason.trim());
      if (result.error) {
        window.alert(result.error);
        return;
      }
      refreshQueue();
      if (expandedId === userId) {
        const row = await getModerationUserDetail(userId);
        setDetail(row);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          검토 대기열 ({queue.length})
        </h2>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={refreshQueue}>
          새로고침
        </Button>
      </div>

      {queue.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          현재 검토 대기 중인 계정이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/30"
                  onClick={() => loadDetail(item.id)}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">@{item.username}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadgeClass(item.riskTier)}`}
                      >
                        {item.riskTier}
                      </span>
                      {item.moderationUrgentReview && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          긴급
                        </span>
                      )}
                      {item.sanctionPendingApproval && (
                        <span className="text-xs text-orange-600">{t("admin.s5hq58h")}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      위험도 {item.riskScore} · 최근 신고 {item.recentReportCount}건 · 누적 신고{" "}
                      {item._count.reportsAgainst}건 · {accountStatusLabel(item.accountStatus)}
                    </p>
                    {item.aiRecommendation && (
                      <p className="text-xs text-muted-foreground">
                        AI 추천: {item.aiRecommendation}
                        {item.aiConfidence != null && ` (신뢰도 ${Math.round(item.aiConfidence * 100)}%)`}
                        {item.aiReason && ` — ${item.aiReason}`}
                      </p>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isOpen && detail?.id === item.id && (
                  <div className="border-t border-border/60 p-4 space-y-4 text-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                      <section className="space-y-2">
                        <h3 className="font-medium">{t("admin.s1cw5t8")}</h3>
                        {detail.recentPosts.length === 0 ? (
                          <p className="text-muted-foreground text-xs">{t("lib.creator.subscription.sd58fa73adc")}</p>
                        ) : (
                          detail.recentPosts.map((p) => (
                            <div key={p.id} className="rounded-lg border border-border/50 p-2 text-xs">
                              <p className="line-clamp-2">{p.title || p.content}</p>
                              <p className="text-muted-foreground mt-1">
                                {format(new Date(p.createdAt), "PPp", { locale: ko })}
                              </p>
                            </div>
                          ))
                        )}
                      </section>
                      <section className="space-y-2">
                        <h3 className="font-medium">{t("admin.s17kv70t")}</h3>
                        {detail.recentComments.length === 0 ? (
                          <p className="text-muted-foreground text-xs">{t("lib.creator.subscription.sd58fa73adc")}</p>
                        ) : (
                          detail.recentComments.map((c) => (
                            <div key={c.id} className="rounded-lg border border-border/50 p-2 text-xs">
                              <p className="line-clamp-2">{c.content}</p>
                              <p className="text-muted-foreground mt-1">
                                {format(new Date(c.createdAt), "PPp", { locale: ko })}
                              </p>
                            </div>
                          ))
                        )}
                      </section>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>최근 7일 DM {detail.dmCountWeek}건</span>
                      <span>최근 7일 라이브 채팅 {detail.liveChatCountWeek}건</span>
                      <span>이전 제재 {detail.priorSanctionCount}회</span>
                    </div>

                    {detail.suspensionLogs.length > 0 && (
                      <section className="space-y-1">
                        <h3 className="font-medium">{t("admin.sqam62p")}</h3>
                        {detail.suspensionLogs.map((log) => (
                          <p key={log.id} className="text-xs text-muted-foreground">
                            {accountStatusLabel(log.previousStatus as AccountStatus)} →{" "}
                            {accountStatusLabel(log.newStatus as AccountStatus)} ·{" "}
                            {format(new Date(log.createdAt), "PPp", { locale: ko })}
                            {log.reason && ` · ${log.reason}`}
                          </p>
                        ))}
                      </section>
                    )}

                    {detail.riskEvents.length > 0 && (
                      <section className="space-y-1">
                        <h3 className="font-medium">{t("admin.s17i13vc")}</h3>
                        {detail.riskEvents.map((ev) => (
                          <p key={ev.id} className="text-xs text-muted-foreground">
                            {ev.delta > 0 ? "+" : ""}
                            {ev.delta} {ev.reason} → {ev.scoreAfter}점 ·{" "}
                            {format(new Date(ev.createdAt), "PPp", { locale: ko })}
                          </p>
                        ))}
                      </section>
                    )}

                    <section className="space-y-2 rounded-xl border border-border/60 p-3">
                      <h3 className="font-medium">{t("admin.sqamcbc")}</h3>
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={sanction}
                          onChange={(e) => setSanction(e.target.value as ModerationSanctionType)}
                        >
                          {SANCTION_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {MODERATION_SANCTION_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder={t("admin.s1tharpl")}
                          className="min-w-[200px] flex-1"
                        />
                        <Button
                          type="button"
                          disabled={pending || !reason.trim()}
                          onClick={() => applySanction(item.id)}
                        >
                          적용
                        </Button>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
