"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminMarketCancelListing,
  adminMarketEmergency,
  adminMarketExtendExpiry,
  adminMarketFlagSuspicious,
  adminMarketFreezeSeller,
  adminMarketHideListing,
  adminMarketIgnoreSeller,
  adminMarketNpcBuy,
  adminMarketRefund,
  adminMarketUnfreezeSeller,
  adminMarketUpdatePrice,
  adminMarketUpsertNpc,
  getMarketListingDetailAction,
} from "@/actions/admin-market";
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
import type {
  HotListingRow,
  ListingRiskBand,
  MarketAdminLogDto,
  MarketAnalytics,
  MarketDashboardKpi,
  MarketListingDetail,
  MarketListingRow,
} from "@/lib/apt/economy/admin-market-service";
import type { MarketAdminFlags } from "@/lib/apt/economy/market-admin-guards";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Play,
  Store,
} from "lucide-react";

const RISK_STYLE: Record<ListingRiskBand, string> = {
  normal: "bg-emerald-50 border-emerald-200",
  warn: "bg-amber-50 border-amber-200",
  danger: "bg-rose-50 border-rose-200",
  fraud: "bg-violet-50 border-violet-300",
};

type Tab = "dashboard" | "listings" | "analytics" | "price" | "hot" | "emergency" | "npc" | "logs";

type Props = {
  kpi: MarketDashboardKpi;
  listings: MarketListingRow[];
  flags: MarketAdminFlags;
  logs: MarketAdminLogDto[];
  analytics: MarketAnalytics;
  hot: {
    topViews: HotListingRow[];
    fastSales: HotListingRow[];
    slowListings: HotListingRow[];
    priceSpikes: HotListingRow[];
  };
  priceGuide: { stickerTypeId: string; label: string; stats: import("@/lib/apt/economy/market-price-service").PriceGuideStats | null }[];
  npcRules: {
    id: string;
    stickerTypeId: string;
    mode: string;
    targetPrice: number | null;
    maxQuantity: number;
    enabled: boolean;
  }[];
};

export function AdminMarketPanel({
  kpi,
  listings: initialListings,
  flags: initialFlags,
  logs,
  analytics,
  hot,
  priceGuide,
  npcRules,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [flags, setFlags] = useState(initialFlags);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MarketListingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!replayPlaying || !detail?.marketReplay.length) return;
    const t = setInterval(() => {
      setReplayIdx((i) => {
        if (!detail || i >= detail.marketReplay.length - 1) {
          setReplayPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(t);
  }, [replayPlaying, detail?.marketReplay.length, detail]);

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    setReplayIdx(0);
    setReplayPlaying(false);
    const d = await getMarketListingDetailAction(id);
    setDetail(d);
    setDetailLoading(false);
  }, []);

  async function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["listings", "Listings"],
            ["analytics", "Analytics"],
            ["price", "Price Guide"],
            ["hot", "Hot"],
            ["emergency", "Emergency"],
            ["npc", "NPC"],
            ["logs", "Logs"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? <KpiGrid kpi={kpi} /> : null}

      {tab === "listings" ? (
        <ListingsTable listings={initialListings} onOpen={openDetail} />
      ) : null}

      {tab === "analytics" ? <AnalyticsPanel analytics={analytics} /> : null}

      {tab === "price" ? <PriceGuidePanel items={priceGuide} /> : null}

      {tab === "hot" ? <HotPanel hot={hot} onOpen={openDetail} /> : null}

      {tab === "emergency" ? (
        <EmergencyPanel
          flags={flags}
          busy={busy}
          onSave={async (patch, reason) => {
            setBusy(true);
            const next = await adminMarketEmergency(patch, reason);
            setFlags(next);
            setBusy(false);
            void refresh();
          }}
        />
      ) : null}

      {tab === "npc" ? (
        <NpcPanel
          rules={npcRules}
          onRefresh={() => void refresh()}
        />
      ) : null}

      {tab === "logs" ? <LogsPanel logs={logs} /> : null}

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Listing Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : detail ? (
            <ListingDetailView
              detail={detail}
              replayIdx={replayIdx}
              replayPlaying={replayPlaying}
              onReplayToggle={() => {
                setReplayPlaying((p) => !p);
                if (!replayPlaying) setReplayIdx(0);
              }}
              onAction={async (fn) => {
                await fn();
                void openDetail(detail.listing.id);
                void refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiGrid({ kpi }: { kpi: MarketDashboardKpi }) {
  const items = [
    { label: "Active Listings", value: kpi.activeListings },
    { label: "Today's Sales", value: kpi.todaySales },
    { label: "Today's Volume", value: `${kpi.todayVolume.toLocaleString()}G` },
    { label: "Avg Price", value: `${kpi.avgPrice.toLocaleString()}G` },
    { label: "Median Price", value: `${kpi.medianPrice.toLocaleString()}G` },
    { label: "Items Sold", value: kpi.itemsSold },
    { label: "Suspicious", value: kpi.suspiciousListings, warn: true },
    { label: "Cancelled Today", value: kpi.cancelledListings },
    { label: "Market Health", value: `${kpi.marketHealth}%`, health: true },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                "text-lg font-bold",
                item.warn && "text-rose-600",
                item.health && kpi.marketHealth >= 70 && "text-emerald-600"
              )}
            >
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListingsTable({
  listings,
  onOpen,
}: {
  listings: MarketListingRow[];
  onOpen: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Store className="h-4 w-4" />
          Listings
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2">Seller</th>
              <th className="py-2 pr-2">Price</th>
              <th className="py-2 pr-2">Rec.</th>
              <th className="py-2 pr-2">Dev%</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Views</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((r) => (
              <tr
                key={r.id}
                className={cn("border-b cursor-pointer hover:bg-muted/50", RISK_STYLE[r.riskBand])}
                onClick={() => onOpen(r.id)}
              >
                <td className="py-2 pr-2">{r.itemLabel}</td>
                <td className="py-2 pr-2">{r.sellerName}</td>
                <td className="py-2 pr-2 font-mono">{r.priceGold}G</td>
                <td className="py-2 pr-2 font-mono">{r.recommendedPrice ?? "—"}</td>
                <td className="py-2 pr-2">{r.deviationPercent != null ? `${r.deviationPercent}%` : "—"}</td>
                <td className="py-2 pr-2">
                  {r.status}
                  {r.hiddenByAdmin ? " · hidden" : ""}
                </td>
                <td className="py-2">{r.viewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ListingDetailView({
  detail,
  replayIdx,
  replayPlaying,
  onReplayToggle,
  onAction,
}: {
  detail: MarketListingDetail;
  replayIdx: number;
  replayPlaying: boolean;
  onReplayToggle: () => void;
  onAction: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const l = detail.listing;
  const reason = () => prompt("사유") ?? "";

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2 items-start justify-between">
        <div>
          <p className="font-bold text-lg">{l.itemLabel}</p>
          <p className="text-muted-foreground font-mono text-xs">{l.id}</p>
          <p>
            {l.priceGold}G · {l.status}
            {l.deviationPercent != null ? ` · ${l.deviationPercent}% vs rec.` : ""}
          </p>
        </div>
        <Link
          href={`/admin/economy/logs?q=${detail.seller.username}`}
          className="text-xs text-primary underline"
        >
          CS Logs
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-md border p-2">
          <p className="font-medium">판매자 @{detail.seller.username}</p>
          <p className="text-xs text-muted-foreground">
            {detail.seller.gold}G · Fraud {detail.seller.fraudScore} ({detail.seller.fraudStatus})
          </p>
          <p className="text-xs">동일 IP 계정: {detail.seller.linkedIpAccounts}</p>
        </div>
        {detail.buyer ? (
          <div className="rounded-md border p-2">
            <p className="font-medium">구매자 @{detail.buyer.username}</p>
          </div>
        ) : null}
      </div>

      {detail.priceGuide ? (
        <div className="rounded-md border p-2 text-xs grid grid-cols-3 gap-2">
          <span>추천 {detail.priceGuide.recommended}G</span>
          <span>평균 {detail.priceGuide.avg}G</span>
          <span>중앙값 {detail.priceGuide.median}G</span>
          <span>최저 {detail.priceGuide.min}G</span>
          <span>최고 {detail.priceGuide.max}G</span>
          <span>σ {detail.priceGuide.stdDev}</span>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-xs">Market Replay</p>
          <Button size="sm" variant="outline" onClick={onReplayToggle}>
            <Play className="h-3 w-3 mr-1" />
            {replayPlaying ? "Pause" : "Replay"}
          </Button>
        </div>
        <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
          {detail.marketReplay.map((e, i) => (
            <li
              key={e.at + e.title}
              className={cn(replayPlaying && i <= replayIdx && "bg-primary/10 rounded px-1")}
            >
              {new Date(e.at).toLocaleTimeString("ko-KR")} · {e.title} — {e.summary}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {l.status === "SELLING" ? (
          <>
            <ActionBtn
              label="숨김"
              onClick={() => onAction(() => adminMarketHideListing(l.id, true, reason()))}
            />
            <ActionBtn
              label="취소"
              onClick={() => onAction(() => adminMarketCancelListing(l.id, reason()))}
            />
            <ActionBtn
              label="가격 수정"
              onClick={() => {
                const p = Number(prompt("새 가격 (Gold)", String(l.priceGold)));
                if (p > 0) void onAction(() => adminMarketUpdatePrice(l.id, p, reason()));
              }}
            />
            <ActionBtn
              label="+7일 연장"
              onClick={() => onAction(() => adminMarketExtendExpiry(l.id, 7, reason()))}
            />
            <ActionBtn
              label="NPC 매입"
              onClick={() => onAction(() => adminMarketNpcBuy(l.id, reason()))}
            />
          </>
        ) : null}
        {l.status === "SOLD" ? (
          <ActionBtn
            label="환불"
            onClick={() => onAction(() => adminMarketRefund(l.id, reason()))}
          />
        ) : null}
        <ActionBtn
          label={l.suspiciousFlag ? "의심 해제" : "의심 표시"}
          onClick={() =>
            onAction(() => adminMarketFlagSuspicious(l.id, !l.suspiciousFlag, reason()))
          }
        />
        <ActionBtn
          label="Freeze"
          onClick={() => onAction(() => adminMarketFreezeSeller(l.sellerId, reason()))}
        />
        <ActionBtn
          label="Unfreeze"
          onClick={() => onAction(() => adminMarketUnfreezeSeller(l.sellerId, reason()))}
        />
        <ActionBtn
          label="Ignore 7d"
          onClick={() => onAction(() => adminMarketIgnoreSeller(l.sellerId, 7, reason()))}
        />
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClick}>
      {label}
    </Button>
  );
}

function AnalyticsPanel({ analytics }: { analytics: MarketAnalytics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">30일 거래량</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 max-h-64 overflow-y-auto">
          {analytics.dailyVolume.map((d) => (
            <div key={d.date} className="flex justify-between">
              <span>{d.date}</span>
              <span>
                {d.sales}건 · {d.volume.toLocaleString()}G
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">요약</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>거래 성공률: {analytics.successRate}%</p>
          <p>평균 판매 시간: {analytics.avgTimeToSellHours}h</p>
          <p className="font-medium text-xs mt-3">카테고리별</p>
          {analytics.categoryVolume.map((c) => (
            <p key={c.category} className="text-xs">
              {c.category}: {c.count}건 · {c.volume.toLocaleString()}G
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PriceGuidePanel({
  items,
}: {
  items: Props["priceGuide"];
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-2 text-left">Item</th>
              <th className="p-2">추천</th>
              <th className="p-2">24h</th>
              <th className="p-2">7d</th>
              <th className="p-2">30d</th>
              <th className="p-2">σ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.stickerTypeId} className="border-b">
                <td className="p-2">{item.label}</td>
                <td className="p-2 text-center font-mono">{item.stats?.recommended ?? "—"}</td>
                <td className="p-2 text-center font-mono">{item.stats?.last24h.avg ?? "—"}</td>
                <td className="p-2 text-center font-mono">{item.stats?.last7d.avg ?? "—"}</td>
                <td className="p-2 text-center font-mono">{item.stats?.last30d.avg ?? "—"}</td>
                <td className="p-2 text-center font-mono">{item.stats?.stdDev ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function HotPanel({
  hot,
  onOpen,
}: {
  hot: Props["hot"];
  onOpen: (id: string) => void;
}) {
  const sections = [
    ["조회 TOP", hot.topViews],
    ["빠른 판매", hot.fastSales],
    ["안 팔림", hot.slowListings],
    ["급등/급락", hot.priceSpikes],
  ] as const;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {sections.map(([title, rows]) => (
        <Card key={title}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className="w-full text-left hover:bg-muted rounded px-1 py-0.5"
                onClick={() => onOpen(r.id)}
              >
                {r.itemLabel} · {r.value} · {r.priceGold}G
              </button>
            ))}
            {rows.length === 0 ? <p className="text-muted-foreground">—</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmergencyPanel({
  flags,
  busy,
  onSave,
}: {
  flags: MarketAdminFlags;
  busy: boolean;
  onSave: (patch: Partial<MarketAdminFlags>, reason: string) => Promise<void>;
}) {
  const [local, setLocal] = useState(flags);
  const toggles: { key: keyof MarketAdminFlags; label: string }[] = [
    { key: "readOnly", label: "읽기 전용" },
    { key: "blockNewListing", label: "신규 Listing 금지" },
    { key: "blockCreateListing", label: "등록 금지" },
    { key: "blockPurchase", label: "구매 금지" },
  ];
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Market Emergency (Economy Emergency와 별도)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {toggles.map((t) => (
          <label key={t.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={local[t.key]}
              onChange={(e) => setLocal((prev) => ({ ...prev, [t.key]: e.target.checked }))}
            />
            {t.label}
          </label>
        ))}
        <Button
          disabled={busy}
          onClick={() => {
            const reason = prompt("변경 사유") ?? "";
            if (reason) void onSave(local, reason);
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "적용"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NpcPanel({
  rules,
  onRefresh,
}: {
  rules: Props["npcRules"];
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">NPC Intervention Rules</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const stickerTypeId = prompt("stickerTypeId");
            const mode = prompt("mode: AUTO_BUY | AUTO_SELL | STABILIZE", "STABILIZE");
            const targetPrice = Number(prompt("targetPrice", "500"));
            if (stickerTypeId && mode) {
              void adminMarketUpsertNpc({
                stickerTypeId,
                mode,
                targetPrice: Number.isFinite(targetPrice) ? targetPrice : null,
              }).then(onRefresh);
            }
          }}
        >
          + Rule
        </Button>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="flex justify-between border-b pb-1">
            <span>
              {r.stickerTypeId} · {r.mode} · {r.targetPrice ?? "—"}G · {r.enabled ? "ON" : "OFF"}
            </span>
          </div>
        ))}
        {rules.length === 0 ? <p className="text-muted-foreground">규칙 없음 — Listing Detail에서 NPC 매입 가능</p> : null}
      </CardContent>
    </Card>
  );
}

function LogsPanel({ logs }: { logs: MarketAdminLogDto[] }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-2 text-left">시간</th>
              <th className="p-2 text-left">관리자</th>
              <th className="p-2 text-left">Action</th>
              <th className="p-2">Before</th>
              <th className="p-2">After</th>
              <th className="p-2">사유</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b">
                <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString("ko-KR")}</td>
                <td className="p-2">{log.adminName}</td>
                <td className="p-2 font-mono">{log.action}</td>
                <td className="p-2">{log.before ?? "—"}</td>
                <td className="p-2">{log.after ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{log.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
