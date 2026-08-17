import Link from "next/link";
import { adminPromotionStatsAction } from "@/actions/admin-promotions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminPromotionStatsPage() {
  const res = await adminPromotionStatsAction();
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  const maxSaved = Math.max(1, ...res.data.map((d) => d.usedBenefitKrw));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Link href="/admin/promotions" className="text-sm text-muted-foreground hover:underline">
          ← 프로모션
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">프로모션 통계</h1>
        <p className="text-sm text-muted-foreground">
          API: <code className="text-xs">GET /api/admin/promotions/statistics</code>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {res.data.map((d) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link href={`/admin/promotions/${d.id}`} className="hover:underline">
                  {d.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">발급</span>
                <span>{d.assignedCount.toLocaleString()}</span>
                <span className="text-muted-foreground">사용</span>
                <span>{d.usedCount.toLocaleString()}</span>
                <span className="text-muted-foreground">사용률</span>
                <span>{d.usageRate}%</span>
                <span className="text-muted-foreground">절감</span>
                <span>{formatUsd(d.usedBenefitKrw)}</span>
                <span className="text-muted-foreground">평균 절감</span>
                <span>{formatUsd(d.avgBenefitKrw)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: `${Math.round((d.usedBenefitKrw / maxSaved) * 100)}%` }}
                />
              </div>
              {d.recentUsages.length > 0 ? (
                <ul className="border-t border-border/50 pt-2 text-xs text-muted-foreground">
                  {d.recentUsages.map((u, i) => (
                    <li key={i}>
                      @{u.username} · {formatUsd(u.benefitAppliedKrw)} ·{" "}
                      {new Date(u.createdAt).toISOString().slice(0, 10)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {res.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">통계 데이터가 없습니다.</p>
        ) : null}
      </div>
    </div>
  );
}
