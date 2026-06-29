"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminPreviewFraudUser,
  adminPublishFraudRules,
  adminSimulateFraudRules,
  type FraudRulePublishPatch,
  type FraudRuleRowDto,
} from "@/actions/admin-fraud-rules";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FraudRuleChangeLogDto } from "@/lib/apt/economy/fraud/admin-fraud-rules-service";
import { FRAUD_STATUS_LABEL } from "@/lib/apt/economy/fraud/fraud-types";
import type { FraudStatus } from "@/lib/apt/economy/fraud/fraud-types";
import { cn } from "@/lib/utils";
import { Loader2, SlidersHorizontal } from "lucide-react";

type DraftEdits = Record<
  string,
  { weight?: number; enabled?: boolean; threshold?: Record<string, number> }
>;

type Props = {
  rules: FraudRuleRowDto[];
  meta: { version: number; publishedAt: string | null; publishedByName: string | null };
  changeLogs: FraudRuleChangeLogDto[];
};

const STATUS_STYLE: Record<FraudStatus, string> = {
  NORMAL: "text-emerald-700",
  WATCH: "text-amber-700",
  SUSPICIOUS: "text-orange-700",
  HIGH_RISK: "text-rose-700",
};

function mergeDraft(rules: FraudRuleRowDto[], edits: DraftEdits): FraudRuleRowDto[] {
  return rules.map((r) => {
    const e = edits[r.id];
    if (!e) return r;
    return {
      ...r,
      weight: e.weight ?? r.weight,
      enabled: e.enabled ?? r.enabled,
      threshold: e.threshold ? { ...r.threshold, ...e.threshold } : r.threshold,
    };
  });
}

function buildPatches(published: FraudRuleRowDto[], draft: FraudRuleRowDto[]): FraudRulePublishPatch[] {
  const patches: FraudRulePublishPatch[] = [];
  for (const d of draft) {
    const p = published.find((x) => x.id === d.id);
    if (!p) continue;
    const changed =
      d.weight !== p.weight ||
      d.enabled !== p.enabled ||
      JSON.stringify(d.threshold) !== JSON.stringify(p.threshold);
    if (!changed) continue;
    patches.push({
      id: d.id,
      weight: d.weight,
      enabled: d.enabled,
      threshold: d.threshold,
    });
  }
  return patches;
}

export function AdminFraudRulesPanel({ rules: published, meta, changeLogs }: Props) {
  const router = useRouter();
  const [edits, setEdits] = useState<DraftEdits>({});
  const [selectedId, setSelectedId] = useState(published[0]?.id ?? "");
  const [sampleUser, setSampleUser] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof adminPreviewFraudUser>> | null>(null);
  const [simulation, setSimulation] = useState<Awaited<ReturnType<typeof adminSimulateFraudRules>> | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishReason, setPublishReason] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);

  const draftRules = useMemo(() => mergeDraft(published, edits), [published, edits]);
  const patches = useMemo(() => buildPatches(published, draftRules), [published, draftRules]);
  const hasDraft = patches.length > 0;
  const selected = draftRules.find((r) => r.id === selectedId) ?? draftRules[0];

  const setWeight = useCallback((id: string, weight: number) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], weight } }));
  }, []);

  const setEnabled = useCallback((id: string, enabled: boolean) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], enabled } }));
  }, []);

  const setThreshold = useCallback((id: string, key: string, value: number) => {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        threshold: { ...(prev[id]?.threshold ?? {}), [key]: value },
      },
    }));
  }, []);

  async function onPreviewUser() {
    setBusy("preview");
    const res = await adminPreviewFraudUser(sampleUser, patches);
    setPreview(res);
    setBusy(null);
  }

  async function onSimulate() {
    setBusy("simulate");
    const res = await adminSimulateFraudRules(patches.length ? patches : buildPatches(published, draftRules));
    setSimulation(res);
    setBusy(null);
  }

  async function onPublish() {
    setBusy("publish");
    setPublishError(null);
    const res = await adminPublishFraudRules(patches, publishReason);
    setBusy(null);
    if ("error" in res) {
      setPublishError(res.error);
      return;
    }
    setPublishOpen(false);
    setPublishReason("");
    setEdits({});
    setPreview(null);
    setSimulation(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          FraudRuleVersion{" "}
          <span className="font-mono font-semibold text-foreground">v{meta.version}</span>
          {meta.publishedAt ? (
            <span className="ml-2">
              · {new Date(meta.publishedAt).toLocaleString("ko-KR")}
              {meta.publishedByName ? ` · ${meta.publishedByName}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void onSimulate()}>
            {busy === "simulate" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simulation
          </Button>
          <Button size="sm" disabled={!hasDraft || busy !== null} onClick={() => setPublishOpen(true)}>
            Publish {hasDraft ? `(${patches.length})` : ""}
          </Button>
        </div>
      </div>

      {simulation ? (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Simulation Mode · 최근 30일 샘플 {simulation.sampleSize}명</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-medium mb-1">현재 규칙</p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li>High Risk: {simulation.current.HIGH_RISK}</li>
                <li>Suspicious: {simulation.current.SUSPICIOUS}</li>
                <li>Watch: {simulation.current.WATCH}</li>
                <li>Normal: {simulation.current.NORMAL}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">변경 후 (Draft)</p>
              <ul className="space-y-0.5">
                <li className={cn(simulation.projected.HIGH_RISK < simulation.current.HIGH_RISK && "text-emerald-700")}>
                  High Risk: {simulation.current.HIGH_RISK} → {simulation.projected.HIGH_RISK}
                </li>
                <li>Suspicious: {simulation.current.SUSPICIOUS} → {simulation.projected.SUSPICIOUS}</li>
                <li>Watch: {simulation.current.WATCH} → {simulation.projected.WATCH}</li>
                <li>Normal: {simulation.current.NORMAL} → {simulation.projected.NORMAL}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {draftRules.map((rule) => {
            const orig = published.find((p) => p.id === rule.id)!;
            const dirty =
              rule.weight !== orig.weight ||
              rule.enabled !== orig.enabled ||
              JSON.stringify(rule.threshold) !== JSON.stringify(orig.threshold);
            return (
              <Card
                key={rule.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedId === rule.id && "ring-2 ring-primary",
                  dirty && "border-amber-300"
                )}
                onClick={() => setSelectedId(rule.id)}
              >
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-mono">{rule.id}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.label}</p>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        rule.enabled ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnabled(rule.id, !rule.enabled);
                      }}
                    >
                      {rule.enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 pb-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Weight</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={rule.weight}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setWeight(rule.id, Number(e.target.value))}
                      className="h-8 mt-1"
                    />
                  </div>
                  {rule.thresholdLabels.slice(0, 1).map((tl) => (
                    <div key={tl.key}>
                      <label className="text-xs text-muted-foreground">
                        Threshold · {tl.label}
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={rule.threshold[tl.key] ?? 0}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setThreshold(rule.id, tl.key, Number(e.target.value))}
                        className="h-8 mt-1"
                      />
                    </div>
                  ))}
                  {rule.thresholdLabels.length > 1 ? (
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                      +{rule.thresholdLabels.length - 1}개 threshold — 카드 선택 후 우측에서 편집
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          {selected ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  {selected.id} Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.thresholdLabels.map((tl) => (
                  <div key={tl.key}>
                    <label className="text-xs text-muted-foreground">
                      {tl.label} {tl.hint ? `(${tl.hint})` : ""}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={selected.threshold[tl.key] ?? 0}
                      onChange={(e) => setThreshold(selected.id, tl.key, Number(e.target.value))}
                      className="h-8 mt-1"
                    />
                  </div>
                ))}
                {selected.description ? (
                  <p className="text-xs text-muted-foreground pt-2">{selected.description}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rule Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Sample username"
                value={sampleUser}
                onChange={(e) => setSampleUser(e.target.value)}
                className="h-8"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!sampleUser.trim() || busy !== null}
                onClick={() => void onPreviewUser()}
              >
                {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Rule 계산
              </Button>

              {preview && !preview.ok ? (
                <p className="text-sm text-destructive">{preview.error}</p>
              ) : null}

              {preview && preview.ok ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">@{preview.user.username}</p>
                    <p className="text-2xl font-bold">{preview.published.score}</p>
                    <p className={cn("text-xs font-medium", STATUS_STYLE[preview.published.status])}>
                      {FRAUD_STATUS_LABEL[preview.published.status]} (published)
                    </p>
                  </div>
                  {preview.draft ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2">
                      <p className="text-xs text-muted-foreground mb-1">Draft Preview</p>
                      <p className="text-xl font-bold">
                        {preview.published.score} → {preview.draft.score}
                      </p>
                      <p className={cn("text-xs", STATUS_STYLE[preview.draft.status])}>
                        {FRAUD_STATUS_LABEL[preview.draft.status]}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs font-medium mb-1">왜 {preview.draft?.score ?? preview.published.score}점?</p>
                    <ul className="space-y-1">
                      {(preview.draft ?? preview.published).hits.map((h) => (
                        <li key={h.rule} className="flex justify-between text-xs font-mono">
                          <span>{h.rule}</span>
                          <span>+{h.score}</span>
                        </li>
                      ))}
                      {(preview.draft ?? preview.published).hits.length === 0 ? (
                        <li className="text-xs text-muted-foreground">발동 규칙 없음</li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Change Log</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">시간</th>
                <th className="py-2 pr-2">관리자</th>
                <th className="py-2 pr-2">필드</th>
                <th className="py-2 pr-2">이전</th>
                <th className="py-2 pr-2">변경</th>
                <th className="py-2">사유</th>
              </tr>
            </thead>
            <tbody>
              {changeLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("ko-KR")}
                    {log.version ? ` · v${log.version}` : ""}
                  </td>
                  <td className="py-2 pr-2">{log.adminName}</td>
                  <td className="py-2 pr-2 font-mono">{log.field}</td>
                  <td className="py-2 pr-2">{log.before}</td>
                  <td className="py-2 pr-2">{log.after}</td>
                  <td className="py-2 text-muted-foreground">{log.reason ?? "—"}</td>
                </tr>
              ))}
              {changeLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    변경 이력 없음
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fraud Rules Publish · v{meta.version + 1}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{patches.length}개 규칙 변경</p>
          <Input
            placeholder="변경 사유 (필수)"
            value={publishReason}
            onChange={(e) => setPublishReason(e.target.value)}
          />
          {publishError ? <p className="text-sm text-destructive">{publishError}</p> : null}
          <Button disabled={!publishReason.trim() || busy !== null} onClick={() => void onPublish()}>
            {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Publish
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
