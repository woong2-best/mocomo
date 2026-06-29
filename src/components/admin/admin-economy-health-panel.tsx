"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminRefreshHealthMonitor,
  adminResolveHealthAlert,
  adminUpdateHealthRule,
} from "@/actions/admin-economy-health";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthDashboard } from "@/lib/apt/economy/health/health-types";
import { cn } from "@/lib/utils";
import { Activity, Loader2, RefreshCw } from "lucide-react";

type Props = HealthDashboard;

const LEVEL_LABELS = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  emergency: "Emergency",
};

function statusDot(status: "green" | "yellow" | "red") {
  return status === "green" ? "🟢" : status === "yellow" ? "🟡" : "🔴";
}

function heatCell(level: "green" | "yellow" | "red") {
  return level === "green" ? "🟩" : level === "yellow" ? "🟨" : "🟥";
}

export function AdminEconomyHealthPanel(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [data, setData] = useState(props);

  async function refresh() {
    setBusy("refresh");
    const updated = await adminRefreshHealthMonitor();
    setData(updated);
    setBusy(null);
    router.refresh();
  }

  async function resolveAlert(id: string) {
    setBusy(`resolve-${id}`);
    await adminResolveHealthAlert(id);
    setBusy(null);
    router.refresh();
  }

  async function toggleRule(id: string, enabled: boolean) {
    setBusy(`rule-${id}`);
    await adminUpdateHealthRule(id, { enabled });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Economy Health (NOC)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              이상 감지 → 알림 → Canary 정지 → Kill Switch → Rollback
            </p>
          </div>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void refresh()}>
            {busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-3xl font-bold">{data.overallScore}</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                data.overallLevel === "healthy" && "bg-emerald-100 text-emerald-800",
                data.overallLevel === "warning" && "bg-amber-100 text-amber-800",
                data.overallLevel === "critical" && "bg-orange-100 text-orange-800",
                data.overallLevel === "emergency" && "bg-red-100 text-red-800"
              )}
            >
              {statusDot(
                data.overallLevel === "healthy"
                  ? "green"
                  : data.overallLevel === "warning"
                    ? "yellow"
                    : "red"
              )}{" "}
              {LEVEL_LABELS[data.overallLevel]}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {data.domains.map((d) => (
          <Card key={d.domain}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-2xl font-bold">{d.score}</p>
              <p className="text-lg">{statusDot(d.status)}</p>
            </CardContent>
          </Card>
        ))}
        {!data.domains.some((d) => d.domain === "iap") && (
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">IAP</p>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {data.alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">활성 알림 없음</p>
            ) : (
              data.alerts.map((a) => (
                <div key={a.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.ruleCode}</span>
                    <span
                      className={cn(
                        a.status === "OPEN" ? "text-amber-600" : "text-emerald-600"
                      )}
                    >
                      {a.status === "OPEN" ? "Running" : "Resolved"}
                    </span>
                  </div>
                  <p>{a.message}</p>
                  <p className="font-mono text-[10px]">{a.correlationId}</p>
                  {a.autoAction && <p className="text-muted-foreground">Auto: {a.autoAction}</p>}
                  {a.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={busy !== null}
                      onClick={() => void resolveAlert(a.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-72 overflow-y-auto text-xs">
            {data.timeline.map((t) => (
              <div key={t.id} className="flex gap-2 border-b pb-1">
                <span className="text-muted-foreground shrink-0">
                  {new Date(t.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{t.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Heatmap (24h)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.heatmap.map((row) => (
            <div key={row.domain} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0">{row.label}</span>
              <span className="font-mono tracking-tight">
                {row.cells.map((c, i) => (
                  <span key={i} title={`${c.hour} ${c.score}`}>
                    {heatCell(c.level)}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rules</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Rule</th>
                <th className="p-2">Threshold</th>
                <th className="p-2">Severity</th>
                <th className="p-2">Auto Action</th>
                <th className="p-2">On</th>
              </tr>
            </thead>
            <tbody>
              {data.rules.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.label}</td>
                  <td className="p-2 font-mono">
                    {r.operator} {r.threshold}
                  </td>
                  <td className="p-2">{r.severity}</td>
                  <td className="p-2">{r.autoAction}</td>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      disabled={busy !== null}
                      onChange={(e) => void toggleRule(r.id, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.restoreCandidates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Restore Candidates (Backup 연계)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            {data.restoreCandidates.map((s) => (
              <p key={s.id}>
                {s.label} <span className="text-muted-foreground">({s.type})</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
