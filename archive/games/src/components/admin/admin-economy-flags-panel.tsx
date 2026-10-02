"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminKillAllEconomyFeatures,
  adminRestoreAllEconomyFeatures,
  adminToggleEconomyFeature,
} from "@/actions/admin-economy-flags";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeatureFlagLogDto } from "@/lib/apt/economy/admin-feature-flag-service";
import {
  FEATURE_FLAG_LABELS,
  type EconomyFeatureFlags,
  type EconomyFeatureKey,
  flagKeyToField,
} from "@/lib/apt/economy/feature-flag-types";
import { cn } from "@/lib/utils";
import { Loader2, Power, PowerOff, ShieldAlert } from "lucide-react";

const FEATURE_ORDER: EconomyFeatureKey[] = [
  "shop",
  "market",
  "live",
  "mission",
  "notification",
  "flea",
  "iap",
];

type Props = {
  flags: EconomyFeatureFlags;
  changeLogs: FeatureFlagLogDto[];
};

export function AdminEconomyFlagsPanel({ flags: initial, changeLogs }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [flags, setFlags] = useState(initial);

  const anyOff = FEATURE_ORDER.some((k) => !flags[flagKeyToField(k)]);

  async function toggle(key: EconomyFeatureKey, next: boolean) {
    setBusy(key);
    const updated = await adminToggleEconomyFeature(key, next);
    setFlags(updated);
    setBusy(null);
    router.refresh();
  }

  async function killAll() {
    setBusy("kill");
    const updated = await adminKillAllEconomyFeatures("운영자 긴급 전체 차단");
    setFlags(updated);
    setBusy(null);
    router.refresh();
  }

  async function restoreAll() {
    setBusy("restore");
    const updated = await adminRestoreAllEconomyFeatures("운영자 전체 복구");
    setFlags(updated);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <Card
        className={cn(
          "border-2",
          anyOff ? "border-amber-500 bg-amber-50/40" : "border-emerald-500/40"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Kill Switch — Feature Flag
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            클릭 한 번으로 기능 차단 · Emergency Mode보다 세분화 · 변경 즉시 반영 (캐시 2초)
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <InlineConfirm
              message="모든 경제 기능을 즉시 OFF 합니다. 계속할까요?"
              confirmLabel="전체 OFF"
              pending={busy === "kill"}
              onConfirm={killAll}
              renderTrigger={(open) => (
                <Button size="sm" variant="destructive" disabled={busy !== null} onClick={open}>
                  {busy === "kill" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4 mr-1" />}
                  전체 OFF
                </Button>
              )}
            />
            <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void restoreAll()}>
              {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4 mr-1" />}
              전체 ON
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            마지막 변경: {new Date(flags.updatedAt).toLocaleString("ko-KR")}
            {flags.updatedByName ? ` · ${flags.updatedByName}` : ""}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURE_ORDER.map((key) => {
          const field = flagKeyToField(key);
          const on = flags[field];
          const isIap = key === "iap";
          return (
            <Card
              key={key}
              className={cn(
                "transition-colors",
                !on && "border-rose-400 bg-rose-50/30",
                on && "border-border"
              )}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-sm">{FEATURE_FLAG_LABELS[key]}</p>
                  <p
                    className={cn(
                      "text-xs font-semibold mt-0.5",
                      on ? "text-emerald-600" : "text-rose-600"
                    )}
                  >
                    {on ? "ON" : "OFF"}
                  </p>
                  {isIap && (
                    <p className="text-[10px] text-muted-foreground mt-1">Phase 10 연동 예정</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={on ? "outline" : "default"}
                  className={cn(!on && "bg-rose-600 hover:bg-rose-700 text-white")}
                  disabled={busy !== null}
                  onClick={() => void toggle(key, !on)}
                >
                  {busy === key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : on ? (
                    "OFF"
                  ) : (
                    "ON"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">변경 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-72 overflow-y-auto text-xs">
          {changeLogs.length === 0 ? (
            <p className="text-muted-foreground">아직 변경 없음</p>
          ) : (
            changeLogs.map((log) => (
              <div key={log.id} className="border-b border-border/60 pb-2 last:border-0">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{log.feature}</span>
                  <span className="text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p>
                  {log.before} → <span className="font-semibold">{log.after}</span>
                  <span className="text-muted-foreground"> · {log.adminName}</span>
                </p>
                {log.reason && <p className="text-muted-foreground">{log.reason}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
