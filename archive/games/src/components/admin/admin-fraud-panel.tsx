"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminFreezeFraudUser,
  adminIgnoreFraudUser,
  adminRecalculateFraudUser,
  adminScanFraudActiveUsers,
  adminUnfreezeFraudUser,
  getFraudUserDetailAction,
} from "@/actions/admin-fraud";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  FraudDashboardStats,
  FraudProfileRow,
  FraudUserDetail,
} from "@/lib/apt/economy/fraud/admin-fraud-service";
import { FRAUD_STATUS_LABEL } from "@/lib/apt/economy/fraud/fraud-types";
import type { FraudStatus } from "@/lib/apt/economy/fraud/fraud-types";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Settings2, ShieldAlert } from "lucide-react";

const STATUS_STYLE: Record<FraudStatus, string> = {
  NORMAL: "bg-emerald-100 text-emerald-800",
  WATCH: "bg-amber-100 text-amber-800",
  SUSPICIOUS: "bg-orange-100 text-orange-800",
  HIGH_RISK: "bg-rose-100 text-rose-800",
};

function riskDot(score: number) {
  if (score >= 80) return "bg-rose-500";
  if (score >= 60) return "bg-orange-400";
  if (score >= 30) return "bg-amber-400";
  return "bg-emerald-500";
}

type Props = {
  stats: FraudDashboardStats;
  profiles: FraudProfileRow[];
};

export function AdminFraudPanel({ stats, profiles: initial }: Props) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FraudUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (userId: string) => {
    setDetailUserId(userId);
    setDetailLoading(true);
    const d = await getFraudUserDetailAction(userId);
    setDetail(d);
    setDetailLoading(false);
  }, []);

  async function onScan() {
    setBusy("scan");
    await adminScanFraudActiveUsers();
    setBusy(null);
    router.refresh();
  }

  async function onRecalc(userId: string) {
    setBusy(`recalc:${userId}`);
    await adminRecalculateFraudUser(userId);
    setBusy(null);
    if (detailUserId === userId) void openDetail(userId);
    router.refresh();
  }

  async function onFreeze(userId: string) {
    const reason = prompt("동결 사유");
    if (!reason) return;
    await adminFreezeFraudUser(userId, reason);
    router.refresh();
    void openDetail(userId);
  }

  async function onUnfreeze(userId: string) {
    const reason = prompt("해제 사유", "검토 완료");
    if (!reason) return;
    await adminUnfreezeFraudUser(userId, reason);
    router.refresh();
    void openDetail(userId);
  }

  async function onIgnore(userId: string) {
    const reason = prompt("Whitelist 사유", "False positive");
    if (!reason) return;
    await adminIgnoreFraudUser(userId, 7, reason);
    router.refresh();
    void openDetail(userId);
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <div className="flex flex-wrap justify-between gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">High Risk</p>
              <p className="text-xl font-bold text-rose-600">{stats.highRisk}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Watch</p>
              <p className="text-xl font-bold text-amber-600">{stats.watch}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Suspicious</p>
              <p className="text-xl font-bold text-orange-600">{stats.suspicious}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Today Alerts</p>
              <p className="text-xl font-bold">{stats.todayAlerts}</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2 self-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/economy/fraud/rules" className="gap-1">
              <Settings2 className="h-3 w-3" />
              Rule Engine
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy === "scan"}
            onClick={() => void onScan()}
            className="gap-1"
          >
            <RefreshCw className={cn("h-3 w-3", busy === "scan" && "animate-spin")} />
            활성 유저 스캔
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Risk Profiles
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">User</th>
                <th className="py-2 pr-2">Risk</th>
                <th className="py-2 pr-2">Rules</th>
                <th className="py-2 pr-2">Activity</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    프로필 없음 — 활성 유저 스캔을 실행하세요.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr
                    key={p.userId}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                    onClick={() => void openDetail(p.userId)}
                  >
                    <td className="py-2 pr-2">
                      <p className="font-medium">@{p.username}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.userId.slice(0, 8)}</p>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", riskDot(p.riskScore))} />
                        <span className="font-bold">{p.riskScore}</span>
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 text-[9px]",
                            STATUS_STYLE[p.status]
                          )}
                        >
                          {FRAUD_STATUS_LABEL[p.status]}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground max-w-[120px] truncate">
                      {p.reasonSummary ?? "—"}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {p.lastCalculatedAt
                        ? new Date(p.lastCalculatedAt).toLocaleDateString("ko-KR")
                        : "—"}
                    </td>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {p.frozenAt ? (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => void onUnfreeze(p.userId)}>
                            해제
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => void onFreeze(p.userId)}>
                            Freeze
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!detailUserId} onOpenChange={(o) => !o && setDetailUserId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.profile.username ? `@${detail.profile.username}` : "User"} — Risk Analysis
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{detail.profile.riskScore}</p>
                  <p className="text-xs text-muted-foreground">
                    {FRAUD_STATUS_LABEL[detail.profile.status]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => void onRecalc(detail.profile.userId)}>
                    재계산
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void onIgnore(detail.profile.userId)}>
                    Ignore 7일
                  </Button>
                </div>
              </div>

              {detail.ruleBreakdown.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">왜 {detail.profile.riskScore}점인가</p>
                  <div className="space-y-1">
                    {detail.ruleBreakdown.map((r) => (
                      <div key={r.rule} className="flex justify-between text-xs border rounded px-2 py-1">
                        <span>{r.rule}</span>
                        <span className="font-mono">+{r.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.scoreHistory.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Risk Timeline</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {detail.scoreHistory.map((h) => (
                      <p key={h.at} className="text-[10px] text-muted-foreground">
                        {new Date(h.at).toLocaleDateString("ko-KR")} — {h.score} ({h.status})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium mb-1">Economy Replay (30일)</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-muted/20">
                  {detail.replay.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">활동 없음</p>
                  ) : (
                    detail.replay.map((e, i) => (
                      <p key={`${e.at}-${i}`} className="text-[10px] font-mono">
                        {new Date(e.at).toLocaleString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {e.summary}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
