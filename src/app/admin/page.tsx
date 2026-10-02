import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const res = await adminLoadDashboard();
  if (!res.ok) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {errorText(res.error)}
      </div>
    );
  }

  const { stats, recentUsers, recentPayments, recentReports, recentPayouts, recentAudit, recentLogins, signupSeries, revenueSeries } =
    res.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.admin.s143xy01")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("app.admin.slkate9")} value={stats.totalUsers.toLocaleString()} icon={Users} />
        <StatCard label={t("app.admin.s1vsui67")} value={stats.todaySignups.toLocaleString()} icon={UserPlus} />
        <StatCard label={t("app.admin.s1tf2jcg")} value={stats.premiumUsers.toLocaleString()} icon={Crown} />
        <StatCard label={t("app.admin.sxgl4jo")} value={stats.creators.toLocaleString()} icon={Drama} />
        <StatCard
          label={t("app.admin.sfxq6zo")}
          value={formatUsd(stats.todayRevenue)}
          hint={`${stats.todayPaymentCount}건`}
          icon={TrendingUp}
        />
        <StatCard
          label={t("app.admin.s3gxv28")}
          value={formatUsd(stats.monthRevenue)}
          hint={`${stats.monthPaymentCount}건`}
          icon={TrendingUp}
        />
        <StatCard label={t("app.admin.spaye5x")} value={`${stats.pendingPayouts}건`} icon={CreditCard} />
        <StatCard label={t("app.admin.s2g21qo")} value={`${stats.pendingReports}건`} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPlaceholder
          title={t("app.admin.sy3are8")}
          bars={signupSeries.map((s) => s.count)}
        />
        <ChartPlaceholder
          title={t("app.admin.s1qytgr7")}
          bars={revenueSeries.map((s) => Math.max(1, Math.round(s.amount / 1000)))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title={t("app.admin.socboe7")}>
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

        <DashboardCard title={t("admin.s17ku92k")}>
          <ul className="space-y-2 text-sm">
            {recentPayments.length === 0 ? (
              <li className="text-muted-foreground">결제 없음</li>
            ) : (
              recentPayments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                  <span>
                    @{p.user.username} · {p.type}
                  </span>
                  <span className="tabular-nums">{formatUsd(p.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>

        <DashboardCard title={t("app.admin.s17kxvk0")}>
          <ul className="space-y-2 text-sm">
            {recentReports.length === 0 ? (
              <li className="text-muted-foreground">{t("app.admin.s706zxy")}</li>
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

        <DashboardCard title={t("app.admin.s17kyvcr")}>
          <ul className="space-y-2 text-sm">
            {recentPayouts.length === 0 ? (
              <li className="text-muted-foreground">{t("app.admin.s1yacyyw")}</li>
            ) : (
              recentPayouts.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                  <span>
                    @{p.user.username} · {p.status}
                  </span>
                  <span className="tabular-nums">{formatUsd(p.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>

        <DashboardCard title={t("app.admin.s1smfhvd")}>
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

        <DashboardCard title={t("admin.s1eiyn0")}>
          <ul className="space-y-2 text-sm">
            {recentLogins.length === 0 ? (
              <li className="text-muted-foreground">No records (aggregated after sign-in)</li>
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
