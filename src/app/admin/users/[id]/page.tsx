import Link from "next/link";
import { adminLoadUserDetail } from "@/actions/admin-cms";
import { AdminUserActions } from "@/components/admin/cms/admin-user-actions";
import { DashboardCard } from "@/components/admin/shell/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await adminLoadUserDetail(id);
  if (!res.ok) {
    return <p className="text-sm text-destructive">{res.error}</p>;
  }

  const { user, tipsSent, tipsReceived, payments, reportsAbout, postsCount, ordersBought, ordersSold } =
    res.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
          ← 회원 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">@{user.username}</h1>
        <p className="text-sm text-muted-foreground">
          {user.email ?? "이메일 없음"} · {user.role} · {user.accountStatus}
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

      <DashboardCard title="프로필">
        <p className="text-sm whitespace-pre-wrap">{user.profile?.bio || "바이오 없음"}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          가입 {user.createdAt.toISOString()} · 최근 로그인{" "}
          {user.lastLoginAt?.toISOString() ?? "—"}
        </p>
        {user.wallet ? (
          <p className="mt-2 text-sm">
            지갑 잔액 ₩{user.wallet.availableBalance.toLocaleString()} · 누적 수익 ₩
            {user.wallet.totalEarned.toLocaleString()}
          </p>
        ) : null}
      </DashboardCard>

      <DashboardCard title="관리자 메모">
        <ul className="space-y-2 text-sm">
          {user.adminMemosAbout.length === 0 ? (
            <li className="text-muted-foreground">메모 없음</li>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="보낸 후원">
          <ul className="space-y-1 text-xs">
            {tipsSent.map((t) => (
              <li key={t.id}>
                → @{t.receiver.username} ₩{t.amount.toLocaleString()}
              </li>
            ))}
          </ul>
        </DashboardCard>
        <DashboardCard title="받은 후원">
          <ul className="space-y-1 text-xs">
            {tipsReceived.map((t) => (
              <li key={t.id}>
                ← @{t.sender.username} ₩{t.amount.toLocaleString()}
              </li>
            ))}
          </ul>
        </DashboardCard>
        <DashboardCard title="결제">
          <ul className="space-y-1 text-xs">
            {payments.map((p) => (
              <li key={p.id}>
                {p.type} ₩{p.amount.toLocaleString()} · {p.paidAt?.toISOString().slice(0, 10)}
              </li>
            ))}
          </ul>
        </DashboardCard>
        <DashboardCard title="신고 이력">
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
