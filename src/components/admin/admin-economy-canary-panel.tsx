"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateConfigCanary,
  adminGetPromotePreview,
  adminPreviewCanaryUser,
  adminPromoteCanary,
  adminRollbackCanary,
} from "@/actions/admin-economy-canary";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CanaryAdminCard } from "@/lib/apt/economy/canary/admin-canary-service";
import {
  CANARY_STAGE_LABELS,
  CANARY_TARGET_LABELS,
  type CanaryLogDto,
  type CanaryPreview,
} from "@/lib/apt/economy/canary/canary-types";
import { cn } from "@/lib/utils";
import { FlaskConical, Loader2, RotateCcw, TrendingUp } from "lucide-react";

type Props = {
  cards: CanaryAdminCard[];
  history: CanaryLogDto[];
  recentSnapshots: { id: string; label: string; createdAt: string }[];
};

function stageLabel(stage: string, percent: number): string {
  if (stage === "PERCENT") return `${percent}%`;
  if (stage === "FULL") return "100%";
  return CANARY_STAGE_LABELS[stage as keyof typeof CANARY_STAGE_LABELS] ?? stage;
}

export function AdminEconomyCanaryPanel({ cards, history, recentSnapshots }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [restoreSnapshot, setRestoreSnapshot] = useState(true);
  const [previewUserId, setPreviewUserId] = useState("");
  const [preview, setPreview] = useState<CanaryPreview | null>(null);

  const [draftGoldPerGem, setDraftGoldPerGem] = useState("");
  const [operatorIds, setOperatorIds] = useState("");
  const [testerIds, setTesterIds] = useState("");
  const [createReason, setCreateReason] = useState("");

  async function runPromote(canaryId: string) {
    if (!reason.trim()) {
      setError("Promote 사유를 입력하세요.");
      return;
    }
    setBusy(`promote-${canaryId}`);
    setError(null);
    const result = await adminPromoteCanary(canaryId, reason);
    if ("error" in result) setError(result.error ?? "요청 실패");
    else {
      setPromoteId(null);
      setReason("");
    }
    setBusy(null);
    router.refresh();
  }

  async function runRollback(canaryId: string) {
    if (!reason.trim()) {
      setError("Rollback 사유를 입력하세요.");
      return;
    }
    setBusy(`rollback-${canaryId}`);
    setError(null);
    const result = await adminRollbackCanary(canaryId, reason, restoreSnapshot);
    if ("error" in result) setError(result.error ?? "요청 실패");
    else {
      setRollbackId(null);
      setReason("");
    }
    setBusy(null);
    router.refresh();
  }

  async function loadPromotePreview(canaryId: string) {
    setBusy(`preview-${canaryId}`);
    await adminGetPromotePreview(canaryId);
    setPromoteId(canaryId);
    setBusy(null);
  }

  async function loadUserPreview(canaryId: string) {
    if (!previewUserId.trim()) return;
    setBusy("user-preview");
    const result = await adminPreviewCanaryUser(canaryId, previewUserId.trim());
    if ("error" in result) setError(result.error ?? "요청 실패");
    else setPreview(result);
    setBusy(null);
  }

  async function createConfigCanary() {
    const goldPerGem = Number(draftGoldPerGem);
    if (!Number.isFinite(goldPerGem) || goldPerGem < 1) {
      setError("goldPerGem 값을 입력하세요.");
      return;
    }
    setBusy("create");
    setError(null);
    await adminCreateConfigCanary(
      { goldPerGem },
      operatorIds.split(",").map((s) => s.trim()).filter(Boolean),
      testerIds.split(",").map((s) => s.trim()).filter(Boolean),
      createReason || "Config canary draft"
    );
    setDraftGoldPerGem("");
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Canary Rollout
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Operator → Tester → 1% → … → 100% → Published · Auto Rollback · Backup 연계
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">새 Config Canary (Draft)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="goldPerGem (예: 900)"
              value={draftGoldPerGem}
              onChange={(e) => setDraftGoldPerGem(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Operator userIds (쉼표 구분)"
              value={operatorIds}
              onChange={(e) => setOperatorIds(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Tester userIds (쉼표 구분)"
              value={testerIds}
              onChange={(e) => setTesterIds(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="사유"
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" disabled={busy !== null} onClick={() => void createConfigCanary()}>
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Draft 생성"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">활성 Canary가 없습니다.</p>
        ) : (
          cards.map(({ canary, health, promotePreview }) => (
            <Card key={canary.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{CANARY_TARGET_LABELS[canary.targetType]}</p>
                    <p className="text-xs text-muted-foreground font-mono">{canary.id}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      canary.stage === "ROLLBACK"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {stageLabel(canary.stage, canary.percent)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded border p-2">
                    <p className="text-muted-foreground">Operator</p>
                    <p className="font-mono font-medium">{health.operatorUsers} users</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-muted-foreground">Tester</p>
                    <p className="font-mono font-medium">{health.testerUsers} users</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-muted-foreground">%</p>
                    <p className="font-mono font-medium">{health.percentUsers} users</p>
                  </div>
                  <div className="rounded border p-2">
                    <p className="text-muted-foreground">Errors</p>
                    <p className={cn("font-mono font-medium", health.errors > 0 && "text-destructive")}>
                      {health.errors}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Auto Rollback: {health.autoRollback ? "ON" : "OFF"} · Rollback:{" "}
                  {health.rollbackActive ? "ACTIVE" : "OFF"}
                  {canary.correlationId ? ` · ${canary.correlationId}` : ""}
                </p>

                {promotePreview && (
                  <div className="rounded border bg-muted/30 p-2 text-xs">
                    <p>
                      Current: {promotePreview.current.label} → Next:{" "}
                      {"action" in promotePreview.next
                        ? promotePreview.next.label
                        : promotePreview.next.label}
                    </p>
                    <p>Expected Users: {promotePreview.expectedUsers.toLocaleString("ko-KR")}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy !== null || canary.stage === "ROLLBACK"}
                    onClick={() => {
                      setPromoteId(canary.id);
                      void loadPromotePreview(canary.id);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Promote
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy !== null}
                    onClick={() => setRollbackId(canary.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Rollback
                  </Button>
                </div>

                {promoteId === canary.id && (
                  <div className="rounded border p-3 space-y-2">
                    <p className="text-xs font-medium">Promote Wizard</p>
                    <Input
                      placeholder="Reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => void runPromote(canary.id)}
                    >
                      {busy === `promote-${canary.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm Promote"
                      )}
                    </Button>
                  </div>
                )}

                {rollbackId === canary.id && (
                  <div className="rounded border border-destructive/30 p-3 space-y-2">
                    <p className="text-xs font-medium">Rollback Wizard</p>
                    <Input
                      placeholder="Reason (e.g. gold duplication suspected)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-8 text-sm"
                    />
                    {recentSnapshots[0] && (
                      <p className="text-[10px] text-muted-foreground">
                        Snapshot: {recentSnapshots[0].label}
                      </p>
                    )}
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={restoreSnapshot}
                        onChange={(e) => setRestoreSnapshot(e.target.checked)}
                      />
                      Restore from snapshot?
                    </label>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy !== null}
                      onClick={() => void runRollback(canary.id)}
                    >
                      {busy === `rollback-${canary.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm Rollback"
                      )}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <Input
                    placeholder="User ID (Preview)"
                    value={previewUserId}
                    onChange={(e) => setPreviewUserId(e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void loadUserPreview(canary.id)}
                  >
                    Preview
                  </Button>
                </div>
                {preview && preview.targetType === canary.targetType && (
                  <div className="rounded border p-2 text-xs grid sm:grid-cols-2 gap-2">
                    <div>
                      <p className="font-medium">현재 {preview.inCanary ? "" : "(Published)"}</p>
                      <pre className="text-[10px] overflow-auto">
                        {JSON.stringify(preview.published, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="font-medium">Canary {preview.inCanary ? "✓" : "✗"}</p>
                      <pre className="text-[10px] overflow-auto">
                        {JSON.stringify(preview.canary, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">History</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">이력 없음</p>
          ) : (
            history.map((log) => (
              <div key={log.id} className="text-xs border-b pb-2">
                <p className="font-medium">
                  {new Date(log.createdAt).toLocaleString("ko-KR")} · {log.action}
                  {log.adminName ? ` · ${log.adminName}` : ""}
                </p>
                <p>
                  {log.fromStage ?? "?"} ({log.fromPercent ?? 0}%) → {log.toStage ?? "?"}{" "}
                  ({log.toPercent ?? 0}%)
                </p>
                <p className="font-mono text-[10px]">{log.correlationId}</p>
                {log.reason && <p className="text-muted-foreground">{log.reason}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
