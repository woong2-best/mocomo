"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshEconomyDailyStats } from "@/actions/admin-apt-economy";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import type { EconomyDashboardStats, HealthStatus } from "@/lib/apt/economy/admin-dashboard-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coins,
  Gem,
  ArrowLeftRight,
  Store,
  TrendingUp,
  TrendingDown,
  Package,
  UserPlus,
  Activity,
  RefreshCw,
} from "lucide-react";

const HEALTH_DOT: Record<HealthStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
};

export function AdminEconomyDashboard({ data }: { data: EconomyDashboardStats }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onRefreshStats() {
    setBusy(true);
    await refreshEconomyDailyStats(14);
    setBusy(false);
    router.refresh();
  }

  const statCards = [
    { icon: Coins, label: "Gold 총 발행량", value: data.goldSupply },
    { icon: Gem, label: "Gem 총 발행량", value: data.gemSupply },
    { icon: ArrowLeftRight, label: "오늘 거래량", value: data.walletTxToday },
    { icon: Store, label: "오늘 장터 거래", value: data.marketSalesToday },
    { icon: TrendingUp, label: "오늘 골드 생성", value: data.goldCreatedToday },
    { icon: TrendingDown, label: "오늘 골드 소멸", value: data.goldDestroyedToday },
    { icon: Package, label: "활성 Listing", value: data.activeListings },
    { icon: UserPlus, label: "오늘 신규 유저", value: data.newUsersToday },
  ];

  return (
    <div className="space-y-6">
      <AdminEconomyNav />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.marketVolumeToday > 0 && (
        <p className="text-xs text-muted-foreground">
          오늘 장터 거래액 합계: {data.marketVolumeToday.toLocaleString()}G
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Economy Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.health.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${HEALTH_DOT[item.status]}`}
                title={item.status}
              />
              <span className="font-medium min-w-[140px]">{item.label}</span>
              <span className="text-muted-foreground text-xs">{item.detail}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">일별 집계 (최근 14일)</CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void onRefreshStats()}
            className="gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
            집계 갱신
          </Button>
        </CardHeader>
        <CardContent>
          {data.dailyHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              집계 데이터가 없습니다. 「집계 갱신」을 눌러 최근 14일을 생성하세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">날짜</th>
                    <th className="py-2 pr-3">생성</th>
                    <th className="py-2 pr-3">소멸</th>
                    <th className="py-2 pr-3">장터</th>
                    <th className="py-2 pr-3">신규</th>
                    <th className="py-2">활성</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyHistory.map((row) => (
                    <tr key={row.date} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono">{row.date}</td>
                      <td className="py-2 pr-3 text-emerald-600">
                        +{row.goldCreated.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-rose-600">
                        -{row.goldDestroyed.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">
                        {row.marketSales}건 / {row.marketVolume.toLocaleString()}G
                      </td>
                      <td className="py-2 pr-3">{row.newUsers}</td>
                      <td className="py-2">{row.activeUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground rounded-lg border border-border p-3 bg-muted/30">
        모든 수치는 KST(한국시간) 기준 오늘 00:00~24:00입니다. 일별 집계는 cron으로{" "}
        <code className="text-[10px]">npm run economy:daily-stat</code> 실행을 권장합니다.
      </p>
    </div>
  );
}
