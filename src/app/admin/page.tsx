import Link from "next/link";
import {
  AlertTriangle,
  CreditCard,
  Drama,
  TrendingUp,
  UserPlus,
  Users,
  Crown,
} from "lucide-react";
import { adminLoadDashboard } from "@/actions/admin-cms";
import { ChartPlaceholder } from "@/components/admin/shell/chart-placeholder";
import { DashboardCard, StatCard } from "@/components/admin/shell/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const res = await adminLoadDashboard();
  if (!res.ok) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {res.error}
      </div>
    );
  }

  const { stats, recentUsers, recentPayments, recentReports, recentPayouts, recentAudit, recentLogins, signupSeries, revenueSeries } =
    res.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">실시간 DB 집계</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="총 회원수" value={stats.totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="오늘 가입자" value={stats.todaySignups.toLocaleString()} icon={UserPlus} />
        <StatCard label="프리미엄 회원" value={stats.premiumUsers.toLocaleString()} icon={Crown} />
        <StatCard label="크리에이터 수" value={stats.creators.toLocaleString()} icon={Drama} />
        <StatCard
          label="오늘 매출"
          value={`₩${stats.todayRevenue.toLocaleString()}`}
          hint={`${stats.todayPaymentCount}건`}
          icon={TrendingUp}
        />
        <StatCard
          label="이번달 매출"
          value={`₩${stats.monthRevenue.toLocaleString()}`}
          hint={`${stats.monthPaymentCount}건`}
          icon={TrendingUp}
        />
        <StatCard label="정산 대기" value={`${stats.pendingPayouts}건`} icon={CreditCard} />
        <StatCard label="신고 대기" value={`${stats.pendingReports}건`} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPlaceholder
          title="최근 7일 가입자"
          bars={signupSeries.map((s) => s.count)}
        />
        <ChartPlaceholder
          title="최근 7일 매출"
          bars={revenueSeries.map((s) => Math.max(1, Math.round(s.amount / 1000)))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="최근 가입 회원">
          <ul className="space-y-2 text-sm">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                <Link href={`/admin/users/${u.id}`} className="font-medium text-primary hover:underline">
                  @{u.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {u.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard title="최근 결제">
          <ul className="space-y-2 text-sm">
            {recentPayments.length === 0 ? (
              <li className="text-muted-foreground">결제 없음</li>
            ) : (
              recentPayments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                  <span>
                    @{p.user.username} · {p.type}
                  </span>
                  <span className="tabular-nums">₩{p.amount.toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>

        <DashboardCard title="최근 신고">
          <ul className="space-y-2 text-sm">
            {recentReports.length === 0 ? (
              <li className="text-muted-foreground">대기 신고 없음</li>
            ) : (
              recentReports.map((r) => (
                <li key={r.id} className="border-b border-border/40 pb-2">
                  <p className="font-medium">
                    {r.targetType} · {r.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">@{r.reporter.username}</p>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>

        <DashboardCard title="최근 정산">
          <ul className="space-y-2 text-sm">
            {recentPayouts.length === 0 ? (
              <li className="text-muted-foreground">정산 요청 없음</li>
            ) : (
              recentPayouts.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                  <span>
                    @{p.user.username} · {p.status}
                  </span>
                  <span className="tabular-nums">₩{p.amount.toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>

        <DashboardCard title="최근 관리자 활동">
          <ul className="space-y-2 text-sm">
            {recentAudit.map((a) => (
              <li key={a.id} className="border-b border-border/40 pb-2 text-xs">
                <span className="font-medium">@{a.actor.username}</span> {a.action}
                <span className="text-muted-foreground">
                  {" "}
                  · {a.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        </DashboardCard>

        <DashboardCard title="최근 로그인">
          <ul className="space-y-2 text-sm">
            {recentLogins.length === 0 ? (
              <li className="text-muted-foreground">기록 없음 (로그인 후 집계)</li>
            ) : (
              recentLogins.map((u) => (
                <li key={u.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-primary hover:underline">
                    @{u.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {u.lastLoginAt?.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
