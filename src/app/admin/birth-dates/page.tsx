import Link from "next/link";
import { adminLoadBirthDateHistory } from "@/actions/admin-cms";
import { AdminBirthDateExport } from "@/components/admin/cms/admin-birth-date-export";
import { AdminBirthDateChangeForm } from "@/components/admin/cms/admin-birth-date-change-form";
import { DashboardCard } from "@/components/admin/shell/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/i18n/error-text";
import {
  birthDateSourceLabel,
  formatDisputeTimestamp,
} from "@/lib/admin/services/birth-date-history";
import { formatBirthDateLabel } from "@/lib/birth-date";

export const dynamic = "force-dynamic";

export default async function AdminBirthDatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const userId = sp.user?.trim() ?? "";
  const res = await adminLoadBirthDateHistory({ q, userId: userId || undefined });

  if (!res.ok) {
    return <p className="text-sm text-destructive">{errorText(res.error)}</p>;
  }

  const { matches, record } = res.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">생년월일 이력</h1>
        <p className="text-sm text-muted-foreground">
          유저 검색, 현재 생년월일, 최초 입력 시각, 변경 이력. 분쟁 대응용 CSV를 한 번에 내보냅니다.
        </p>
      </div>

      <form action="/admin/birth-dates" method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="아이디, 이메일, 이름, 유저 ID"
          className="max-w-md"
        />
        <Button type="submit">유저 검색</Button>
      </form>

      {q ? (
        <DashboardCard title="검색 결과" description={matches.length ? `${matches.length}명` : "일치하는 회원이 없습니다."}>
          <ul className="divide-y divide-border/60 text-sm">
            {matches.map((user) => {
              const selected = user.id === record?.user.id;
              const href = `/admin/birth-dates?q=${encodeURIComponent(q)}&user=${encodeURIComponent(user.id)}`;
              return (
                <li key={user.id} className={selected ? "bg-muted/40" : undefined}>
                  <Link href={href} className="flex flex-wrap items-baseline justify-between gap-2 px-1 py-2 hover:underline">
                    <span className="font-medium">@{user.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email ?? user.name ?? user.id} · 현재 {formatBirthDateLabel(user.birthDate)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </DashboardCard>
      ) : null}

      {userId && !record ? <p className="text-sm text-destructive">회원을 찾을 수 없습니다.</p> : null}

      {record ? (
        <>
          <DashboardCard
            title={`@${record.user.username}`}
            description={record.user.email ?? record.user.id}
            action={<AdminBirthDateExport userId={record.user.id} username={record.user.username} />}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">현재 생년월일</dt>
                <dd className="mt-1 font-medium tabular-nums">{formatBirthDateLabel(record.user.birthDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">최초 입력 시각</dt>
                <dd className="mt-1 font-medium">
                  {record.firstCollectedAt ? formatDisputeTimestamp(record.firstCollectedAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">현재 출처</dt>
                <dd className="mt-1 font-medium">{birthDateSourceLabel(record.user.birthDateSource)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/admin/users/${record.user.id}#payments`}
                className="text-primary hover:underline"
              >
                결제 내역
              </Link>
              <Link
                href={`/admin/users/${record.user.id}#transfers`}
                className="text-primary hover:underline"
              >
                전송 내역
              </Link>
              <Link href={`/admin/users/${record.user.id}`} className="text-muted-foreground hover:underline">
                회원 상세
              </Link>
            </div>
            <AdminBirthDateChangeForm userId={record.user.id} />
          </DashboardCard>

          <DashboardCard title="변경 이력" description="이전 값, 새 값, 시각, 처리자, 사유, IP. 이전 값이 비어 있으면 최초 입력입니다.">
            {record.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">기록된 변경이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">시각</th>
                      <th className="px-2 py-2 font-medium">이전 값</th>
                      <th className="px-2 py-2 font-medium">새 값</th>
                      <th className="px-2 py-2 font-medium">처리자</th>
                      <th className="px-2 py-2 font-medium">사유</th>
                      <th className="px-2 py-2 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...record.history].reverse().map((row) => (
                      <tr key={String(row.id)} className="border-t border-border/50">
                        <td className="px-2 py-2 whitespace-nowrap">{formatDisputeTimestamp(row.changedAt)}</td>
                        <td className="px-2 py-2 tabular-nums">{formatBirthDateLabel(row.oldValue)}</td>
                        <td className="px-2 py-2 tabular-nums">{formatBirthDateLabel(row.newValue)}</td>
                        <td className="px-2 py-2 text-muted-foreground">{row.changedBy}</td>
                        <td className="px-2 py-2">{row.reason ?? "—"}</td>
                        <td className="px-2 py-2 font-mono text-xs">{row.ipAddress ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardCard>
        </>
      ) : null}
    </div>
  );
}
