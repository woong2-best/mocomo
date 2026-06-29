"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminPublishEconomyConfig,
  adminSetEmergencyMode,
} from "@/actions/admin-economy-config";
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
import type { ConfigChangeLogDto } from "@/lib/apt/economy/admin-economy-config-service";
import {
  CONFIG_FIELD_LABELS,
  calcPreviewGoldFromGems,
  validateEconomyConfig,
  type EconomyConfigFull,
  type EconomyConfigValues,
} from "@/lib/apt/economy/economy-config-types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";

type Section = {
  title: string;
  fields: (keyof EconomyConfigValues)[];
};

const SECTIONS: Section[] = [
  {
    title: "Gold",
    fields: [
      "goldPerGem",
      "dailyGemExchangeLimit",
      "dailyGoldLimit",
      "marketFee",
      "npcBuyRate",
      "npcSellRate",
      "starterGold",
      "bonusRate",
    ],
  },
  {
    title: "Live",
    fields: [
      "liveGoldPerCheer",
      "dailyLiveGoldLimit",
      "liveWatchGoldPerMin",
      "dailyWatchGoldLimit",
    ],
  },
  {
    title: "Mission",
    fields: ["dailyMissionReward", "weeklyMissionReward"],
  },
  {
    title: "Shop",
    fields: ["featuredRefreshHour", "newItemDays", "discountDefaultRate"],
  },
  {
    title: "Market",
    fields: ["recommendPriceWindow", "maxListingDays", "priceHistoryDays"],
  },
  {
    title: "Flea",
    fields: ["defaultFleaFee", "defaultFleaDiscount", "fleaEventCooldownHrs"],
  },
  {
    title: "Offline",
    fields: ["pendingExpireDays", "maxOfflineOps"],
  },
  {
    title: "Fraud Auto-Block",
    fields: ["fraudRestrictScore", "fraudMarketBlockScore", "fraudLiveBlockScore"],
  },
];

const PERCENT_FIELDS = new Set<keyof EconomyConfigValues>([
  "marketFee",
  "npcBuyRate",
  "npcSellRate",
  "bonusRate",
  "discountDefaultRate",
  "defaultFleaFee",
  "defaultFleaDiscount",
]);

function toInputValue(key: keyof EconomyConfigValues, v: unknown): string {
  if (PERCENT_FIELDS.has(key)) return String(Math.round(Number(v) * 1000) / 10);
  return String(v);
}

function fromInputValue(key: keyof EconomyConfigValues, raw: string): number {
  const n = Number(raw);
  if (PERCENT_FIELDS.has(key)) return n / 100;
  return n;
}

type Props = {
  config: EconomyConfigFull;
  changeLogs: ConfigChangeLogDto[];
};

export function AdminEconomyConfigPanel({ config: initial, changeLogs }: Props) {
  const router = useRouter();
  const [current] = useState(initial);
  const [draft, setDraft] = useState<EconomyConfigValues>(() => {
    const { version: _v, publishedAt: _p, publishedByName: _n, ...v } = initial;
    return v;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const validation = useMemo(() => validateEconomyConfig(draft), [draft]);

  const changedFields = useMemo(() => {
    const { version: _v, publishedAt: _p, publishedByName: _n, ...cur } = current;
    const keys = Object.keys(draft) as (keyof EconomyConfigValues)[];
    return keys.filter((k) => String(cur[k]) !== String(draft[k]));
  }, [current, draft]);

  const previewGems = 100;
  const currentGold = calcPreviewGoldFromGems(previewGems, {
    goldPerGem: current.goldPerGem,
    bonusRate: current.bonusRate,
  });
  const previewGold = calcPreviewGoldFromGems(previewGems, {
    goldPerGem: draft.goldPerGem,
    bonusRate: draft.bonusRate,
  });

  function setField(key: keyof EconomyConfigValues, raw: string) {
    setDraft((d) => ({ ...d, [key]: fromInputValue(key, raw) }));
  }

  async function onPublish() {
    setBusy("publish");
    setErrors([]);
    const res = await adminPublishEconomyConfig(draft, reason);
    setBusy(null);
    if ("error" in res) {
      setErrors(res.fieldErrors?.map((e) => e.message) ?? [res.error]);
      return;
    }
    setPublishOpen(false);
    setReason("");
    router.refresh();
  }

  async function onEmergency(on: boolean) {
    const r = prompt(on ? "긴급 모드 사유" : "해제 사유", on ? "긴급 점검" : "점검 완료");
    if (r === null) return;
    setBusy("emergency");
    await adminSetEmergencyMode(on, r);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <Card
        className={cn(
          "border-2",
          current.emergencyMode ? "border-rose-500 bg-rose-50/50" : "border-border"
        )}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn("h-5 w-5", current.emergencyMode ? "text-rose-600" : "text-muted-foreground")}
            />
            <div>
              <p className="font-semibold text-sm">Emergency Mode</p>
              <p className="text-xs text-muted-foreground">
                ON 시 Market · Live · Shop · Flea 즉시 차단
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {current.emergencyMode ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy === "emergency"}
                onClick={() => void onEmergency(false)}
              >
                해제
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                disabled={busy === "emergency"}
                onClick={() => void onEmergency(true)}
              >
                Emergency ON
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        v{current.version}
        {current.publishedAt && (
          <>
            {" "}
            · 게시 {new Date(current.publishedAt).toLocaleString("ko-KR")}
            {current.publishedByName && ` · ${current.publishedByName}`}
          </>
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {SECTIONS.map((sec) => (
            <Card key={sec.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{sec.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {sec.fields.map((key) => (
                  <label key={key} className="block space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {CONFIG_FIELD_LABELS[key]}
                      {PERCENT_FIELDS.has(key) ? " (%)" : ""}
                    </span>
                    <Input
                      type="number"
                      step={PERCENT_FIELDS.has(key) ? "0.1" : "1"}
                      value={toInputValue(key, draft[key])}
                      onChange={(e) => setField(key, e.target.value)}
                      className={cn(
                        changedFields.includes(key) && "border-amber-500"
                      )}
                    />
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}

          {validation.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {validation.map((e) => (
                <p key={e.field}>{e.message}</p>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={validation.length > 0 || changedFields.length === 0 || busy === "publish"}
            onClick={() => setPublishOpen(true)}
          >
            변경사항 게시 (v{current.version + 1})
          </Button>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">100 Gems → Gold</p>
                <p className="font-mono">
                  <span className="text-muted-foreground">{currentGold.toLocaleString()}G</span>
                  {previewGold !== currentGold && (
                    <>
                      {" → "}
                      <span className="font-bold text-amber-700">
                        {previewGold.toLocaleString()}G
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">시청 10분 골드</p>
                <p className="font-mono">
                  {(current.liveWatchGoldPerMin * 10).toLocaleString()}G
                  {draft.liveWatchGoldPerMin !== current.liveWatchGoldPerMin && (
                    <>
                      {" → "}
                      <span className="font-bold text-amber-700">
                        {(draft.liveWatchGoldPerMin * 10).toLocaleString()}G
                      </span>
                    </>
                  )}
                </p>
              </div>
              {changedFields.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium mb-1">변경 예정 ({changedFields.length})</p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                    {changedFields.map((key) => {
                      const { version: _v, publishedAt: _p, publishedByName: _n, ...cur } =
                        current;
                      return (
                        <li key={key}>
                          {CONFIG_FIELD_LABELS[key]}:{" "}
                          {toInputValue(key, cur[key])} → {toInputValue(key, draft[key])}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Audit Log</CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto space-y-2">
              {changeLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">이력 없음</p>
              ) : (
                changeLogs.map((log) => (
                  <div key={log.id} className="border-b border-border/50 pb-2 text-[11px]">
                    <p className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("ko-KR")} · {log.adminName}
                      {log.version != null && ` · v${log.version}`}
                    </p>
                    <p>
                      <span className="font-medium">{log.field}</span> {log.before} → {log.after}
                    </p>
                    {log.reason && (
                      <p className="text-muted-foreground italic">reason: {log.reason}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>설정 게시 v{current.version + 1}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">변경 사유 (필수)</span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: Weekend Event / Inflation 조정"
              />
            </label>
            {errors.length > 0 && (
              <div className="text-xs text-rose-600">{errors.join(" ")}</div>
            )}
            <Button
              className="w-full"
              disabled={!reason.trim() || busy === "publish"}
              onClick={() => void onPublish()}
            >
              {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : "게시"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
