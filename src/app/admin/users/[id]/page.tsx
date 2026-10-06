import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import Link from "next/link";
import { adminLoadUserDetail } from "@/actions/admin-cms";
import { AdminUserActions } from "@/components/admin/cms/admin-user-actions";
import { DashboardCard } from "@/components/admin/shell/stat-card";
import { formatBirthDateLabel } from "@/lib/birth-date";
import { birthDateSourceLabel, formatDisputeTimestamp } from "@/lib/admin/services/birth-date-history";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await adminLoadUserDetail(id);
  if (!res.ok) {
    return <p className="text-sm text-destructive">{errorText(res.error)}</p>;
  }

  const { user, tipsSent, tipsReceived, payments, mocoTransfers, reportsAbout, postsCount, ordersBought, ordersSold } =
    res.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
          ← 회원 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">@{user.username}</h1>
        <p className="text-sm text-muted-foreground">
          {user.email ?? t("app.admin.s1whd4ui")} · {user.role} · {user.accountStatus}
          {user.deletedAt ? " · DELETED" : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <div className="rounded-xl border p-3">게시글 {postsCount}</div>
        <div className="rounded-xl border p-3">구매 {ordersBought}</div>
        <div className="rounded-xl border p-3">판매 {ordersSold}</div>
        <div className="rounded-xl border p-3">
          후원 ↑{user.totalSupportSent.toLocaleString()} / ↓
          {user.totalSupportReceived.toLocaleString()}
        </div>
      </div>

      <AdminUserActions userId={user.id} username={user.username} />

      <DashboardCard
        title="생년월일"
        action={
          <Link href={`/admin/birth-dates?user=${user.id}`} className="text-sm text-primary hover:underline">
            변경 이력 · CSV
          </Link>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">현재 생년월일</dt>
            <dd className="mt-1 font-medium tabular-nums">{formatBirthDateLabel(user.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">최초 입력 시각</dt>
            <dd className="mt-1 font-medium">
              {user.birthDateCollectedAt ? formatDisputeTimestamp(user.birthDateCollectedAt) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">출처</dt>
            <dd className="mt-1 font-medium">{birthDateSourceLabel(user.birthDateSource)}</dd>
          </div>
        </dl>
      </DashboardCard>

      <DashboardCard title={t("settings.profile")}>
        <p className="text-sm whitespace-pre-wrap">{user.profile?.bio || t("app.admin.sjfjqg2")}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          가입 {user.createdAt.toISOString()}Please sign in to continue.{" "}
          {user.lastLoginAt?.toISOString() ?? "—"}
        </p>
        {user.wallet ? (
          <p className="mt-2 text-sm">
            지갑 잔액 ₩{user.wallet.availableBalance.toLocaleString()} · 누적 수익 ₩
            {user.wallet.totalEarned.toLocaleString()}
          </p>
        ) : null}
      </DashboardCard>

      <DashboardCard title={t("admin.s1jy8b2o")}>
        <ul className="space-y-2 text-sm">
          {user.adminMemosAbout.length === 0 ? (
            <li className="text-muted-foreground">{t("app.admin.s15ssb2q")}</li>
          ) : (
            user.adminMemosAbout.map((m) => (
              <li key={m.id} className="border-b border-border/40 pb-2">
                <p>{m.body}</p>
                <p className="text-[11px] text-muted-foreground">
                  @{m.author.username} · {m.createdAt.toISOString().slice(0, 16)}
                </p>
              </li>
            ))
          )}
        </ul>
      </DashboardCard>

      <div id="transfers" className="scroll-mt-24 space-y-3">
        <h2 className="text-sm font-semibold">전송 내역</h2>
        <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title={t("app.admin.s1et8j54")}>
          <ul className="space-y-1 text-xs">
            {tipsSent.length === 0 ? (
              <li className="text-muted-foreground">보낸 후원이 없습니다.</li>
            ) : (
              tipsSent.map((tip) => (
                <li key={tip.id}>
                  → @{tip.receiver.username} ₩{tip.amount.toLocaleString()}
                </li>
              ))
            )}
          </ul>
        </DashboardCard>
        <DashboardCard title={t("app.admin.s1ec86pz")}>
          <ul className="space-y-1 text-xs">
            {tipsReceived.length === 0 ? (
              <li className="text-muted-foreground">받은 후원이 없습니다.</li>
            ) : (
              tipsReceived.map((tip) => (
                <li key={tip.id}>
                  ← @{tip.sender.username} ₩{tip.amount.toLocaleString()}
                </li>
              ))
            )}
          </ul>
        </DashboardCard>
          <DashboardCard title="MOCO 전송">
            <ul className="space-y-1 text-xs">
              {mocoTransfers.length === 0 ? (
                <li className="text-muted-foreground">전송 기록이 없습니다.</li>
              ) : (
                mocoTransfers.map((row) => (
                  <li key={row.id}>
                    {row.type} {row.amount}
                    {row.amountTenths ? `.${Math.abs(row.amountTenths)}` : ""} MOCO · {row.reason} ·{" "}
                    {row.createdAt.toISOString().slice(0, 16)}
                  </li>
                ))
              )}
            </ul>
          </DashboardCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div id="payments" className="scroll-mt-24">
        <DashboardCard title={t("app.admin.sugz0")}>
          <ul className="space-y-1 text-xs">
            {payments.length === 0 ? (
              <li className="text-muted-foreground">결제 기록이 없습니다.</li>
            ) : (
              payments.map((p) => (
                <li key={p.id}>
                  {p.type} ₩{p.amount.toLocaleString()} · {p.paidAt?.toISOString().slice(0, 10)}
                </li>
              ))
            )}
          </ul>
        </DashboardCard>
        </div>
        <DashboardCard title={t("app.admin.s2g5ky9")}>
          <ul className="space-y-1 text-xs">
            {reportsAbout.map((r) => (
              <li key={r.id}>
                {r.reason} · @{r.reporter.username} · {r.status}
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
