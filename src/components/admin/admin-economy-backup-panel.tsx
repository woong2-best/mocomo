"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateEconomySnapshot,
  adminDryRunRestore,
  adminGetSnapshotDiff,
  adminPartialRestore,
} from "@/actions/admin-economy-backup";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ALL_RESTORE_SCOPES,
  RESTORE_SCOPE_LABELS,
  type RestoreLogDto,
  type RestorePlan,
  type RestoreScope,
  type SnapshotDiff,
  type SnapshotListItem,
  type SnapshotType,
} from "@/lib/apt/economy/backup/backup-types";
import { cn } from "@/lib/utils";
import { Archive, Loader2, Play, Search, ShieldCheck } from "lucide-react";

const TYPE_FILTERS: { value: SnapshotType | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "scheduled", label: "Daily" },
  { value: "manual", label: "Manual" },
  { value: "before_publish", label: "Publish" },
  { value: "before_restore", label: "Restore" },
];

type WizardStep = "select" | "preview" | "confirm" | "done";

type Props = {
  snapshots: SnapshotListItem[];
  restoreLogs: RestoreLogDto[];
};

function formatNum(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function AdminEconomyBackupPanel({ snapshots: initial, restoreLogs }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<SnapshotType | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [manualLabel, setManualLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scopes, setScopes] = useState<RestoreScope[]>(["wallet", "inventory"]);
  const [reason, setReason] = useState("");
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [plan, setPlan] = useState<RestorePlan | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>("select");
  const [error, setError] = useState<string | null>(null);

  const snapshots = useMemo(() => {
    if (filter === "all") return initial;
    return initial.filter((s) => s.type === filter);
  }, [initial, filter]);

  const selected = snapshots.find((s) => s.id === selectedId) ?? null;

  function toggleScope(scope: RestoreScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function createSnapshot() {
    setBusy("create");
    setError(null);
    await adminCreateEconomySnapshot(manualLabel || undefined);
    setManualLabel("");
    setBusy(null);
    router.refresh();
  }

  async function loadDiff(id: string) {
    setBusy(`diff-${id}`);
    setError(null);
    const result = await adminGetSnapshotDiff(id);
    if ("error" in result) {
      setError(result.error);
    } else {
      setDiff(result.diff);
      setSelectedId(id);
    }
    setBusy(null);
  }

  async function runDryRun() {
    if (!selectedId) return;
    setBusy("dry");
    setError(null);
    const result = await adminDryRunRestore(selectedId, scopes, reason);
    if ("error" in result) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setPlan(result.plan);
    setCorrelationId(result.correlationId);
    setStep("preview");
    setBusy(null);
  }

  async function executeRestore() {
    if (!selectedId || !reason.trim()) {
      setError("복구 사유를 입력하세요.");
      return;
    }
    if (!confirm("선택한 범위로 실제 복구를 실행합니다. 계속할까요?")) return;
    setBusy("restore");
    setError(null);
    const result = await adminPartialRestore(selectedId, scopes, reason);
    if ("error" in result) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setPlan(result.plan);
    setCorrelationId(result.correlationId);
    setStep("done");
    setBusy(null);
    router.refresh();
  }

  function resetWizard() {
    setStep("select");
    setPlan(null);
    setDiff(null);
    setCorrelationId(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Economy Backup & Restore
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            스냅샷 · Diff Preview · Dry Run · 부분 복구 · Restore Audit
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs block mb-1">수동 스냅샷 라벨 (선택)</label>
              <Input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="SNAP_manual_..."
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" disabled={busy !== null} onClick={() => void createSnapshot()}>
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : "스냅샷 생성"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Snapshots</h2>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">스냅샷이 없습니다.</p>
          ) : (
            snapshots.map((s) => (
              <Card
                key={s.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedId === s.id && "ring-2 ring-primary"
                )}
                onClick={() => {
                  setSelectedId(s.id);
                  resetWizard();
                }}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-medium">{s.label}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{s.type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4">
                    <span>Gold {formatNum(s.stats.goldSupply)}</span>
                    <span>Users {formatNum(s.stats.userCount)}</span>
                    <span>Inventory {formatNum(s.stats.inventoryCount)}</span>
                    <span>Listings {formatNum(s.stats.listingCount)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={busy !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        void loadDiff(s.id);
                      }}
                    >
                      {busy === `diff-${s.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3 mr-1" />
                      )}
                      Diff
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString("ko-KR")}
                    {s.createdByName ? ` · ${s.createdByName}` : ""}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Restore Wizard</h2>

          {!selected ? (
            <p className="text-sm text-muted-foreground">스냅샷을 선택하세요.</p>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">① Select · {selected.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_RESTORE_SCOPES.map((scope) => (
                      <label
                        key={scope}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={scopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                        />
                        {RESTORE_SCOPE_LABELS[scope]}
                      </label>
                    ))}
                  </div>
                </div>

                {diff && (
                  <div>
                    <p className="text-xs font-medium mb-2">② Preview (Diff)</p>
                    {diff.corrupted && (
                      <p className="text-xs text-destructive font-medium mb-2">
                        Snapshot corrupted — checksum 불일치
                      </p>
                    )}
                    <div className="rounded border overflow-hidden text-xs">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Metric</th>
                            <th className="text-right p-2">Snapshot</th>
                            <th className="text-right p-2">Current</th>
                            <th className="text-right p-2">Diff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diff.metrics.map((m) => (
                            <tr key={m.key} className="border-t">
                              <td className="p-2">{m.label}</td>
                              <td className="p-2 text-right font-mono">{formatNum(m.snapshot)}</td>
                              <td className="p-2 text-right font-mono">{formatNum(m.current)}</td>
                              <td
                                className={cn(
                                  "p-2 text-right font-mono",
                                  m.difference > 0 && "text-emerald-600",
                                  m.difference < 0 && "text-amber-600"
                                )}
                              >
                                {m.difference > 0 ? "+" : ""}
                                {formatNum(m.difference)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(step === "preview" || step === "confirm") && plan && (
                  <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
                    <p className="font-medium">Dry Run 결과</p>
                    {plan.walletUsers > 0 && <p>Wallet {formatNum(plan.walletUsers)}명</p>}
                    {plan.inventoryRows > 0 && (
                      <p>Inventory {formatNum(plan.inventoryRows)}개</p>
                    )}
                    {plan.listingRows > 0 && <p>Listing {formatNum(plan.listingRows)}개</p>}
                    {plan.goldDelta !== 0 && (
                      <p>Gold {plan.goldDelta > 0 ? "+" : ""}{formatNum(plan.goldDelta)}</p>
                    )}
                    {plan.warnings.map((w) => (
                      <p key={w} className="text-amber-700">
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">③ Confirm Reason</p>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="rollback after shop bug"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy !== null || scopes.length === 0 || diff?.corrupted}
                    onClick={() => void runDryRun()}
                  >
                    {busy === "dry" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Dry Run
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={
                      busy !== null ||
                      scopes.length === 0 ||
                      !reason.trim() ||
                      diff?.corrupted === true
                    }
                    onClick={() => void executeRestore()}
                  >
                    {busy === "restore" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-1" />
                    )}
                    Restore
                  </Button>
                  {!diff && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void loadDiff(selected.id)}
                    >
                      Diff 로드
                    </Button>
                  )}
                </div>

                {step === "done" && correlationId && (
                  <div className="rounded border border-emerald-500/40 bg-emerald-50/50 p-3 text-xs space-y-1">
                    <p className="font-medium text-emerald-800">⑤ Audit Complete</p>
                    <p>correlationId: {correlationId}</p>
                    <Button size="sm" variant="outline" onClick={resetWizard}>
                      완료
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Restore Audit</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {restoreLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">복구 이력 없음</p>
              ) : (
                restoreLogs.map((log) => (
                  <div key={log.id} className="text-xs border-b pb-2 last:border-0">
                    <p className="font-medium">
                      {new Date(log.createdAt).toLocaleString("ko-KR")} · {log.adminName}
                      {log.dryRun ? " (dry run)" : ""}
                    </p>
                    <p className="text-muted-foreground">{log.snapshotLabel}</p>
                    <p className="font-mono text-[10px]">{log.correlationId}</p>
                    <p>{log.scopes.map((s) => RESTORE_SCOPE_LABELS[s]).join(", ")}</p>
                    <p className="text-muted-foreground">{log.reason}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
