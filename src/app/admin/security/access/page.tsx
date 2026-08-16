import Link from "next/link";
import { adminUserAccessLogsAction } from "@/actions/admin-security";

export const dynamic = "force-dynamic";

function formatLocation(row: {
  country: string | null;
  region: string | null;
  city: string | null;
}) {
  const parts = [row.city, row.region, row.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export default async function AdminUserAccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ip?: string; success?: string; channel?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const success =
    sp.success === "true" ? true : sp.success === "false" ? false : undefined;

  const { rows, total, totalPages } = await adminUserAccessLogsAction({
    q: sp.q,
    ip: sp.ip,
    success,
    channel: sp.channel,
    page,
    take: 50,
  });

  const qs = (nextPage: number) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.ip) p.set("ip", sp.ip);
    if (sp.success) p.set("success", sp.success);
    if (sp.channel) p.set("channel", sp.channel);
    p.set("page", String(nextPage));
    return `/admin/security/access?${p.toString()}`;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">접속기록</h1>
        <p className="text-sm text-muted-foreground">
          회원 로그인·접속 IP, 지역, 기기 정보 · 총 {total}건
        </p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="아이디 · 이메일 · IP · 지역"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="ip"
          defaultValue={sp.ip}
          placeholder="IP 필터"
          className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
        />
        <select
          name="channel"
          defaultValue={sp.channel ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">전체 채널</option>
          <option value="web">웹</option>
          <option value="mobile">앱</option>
        </select>
        <select
          name="success"
          defaultValue={sp.success ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">전체 결과</option>
          <option value="true">성공</option>
          <option value="false">실패</option>
        </select>
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          검색
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2">시간</th>
              <th className="p-2">회원</th>
              <th className="p-2">IP</th>
              <th className="p-2">접속 지역</th>
              <th className="p-2">채널</th>
              <th className="p-2">방식</th>
              <th className="p-2">브라우저</th>
              <th className="p-2">OS</th>
              <th className="p-2">기기</th>
              <th className="p-2">결과</th>
              <th className="p-2">실패 사유</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="p-2 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString("ko-KR")}
                </td>
                <td className="p-2">
                  {row.user?.username ? (
                    <Link href={`/admin/users/${row.user.id}`} className="text-primary hover:underline">
                      @{row.user.username}
                    </Link>
                  ) : (
                    row.username ?? "—"
                  )}
                </td>
                <td className="p-2 font-mono text-xs">{row.ip ?? "—"}</td>
                <td className="p-2">{formatLocation(row)}</td>
                <td className="p-2">{row.channel === "mobile" ? "앱" : "웹"}</td>
                <td className="p-2">{row.provider ?? "—"}</td>
                <td className="p-2">{row.browser ?? "—"}</td>
                <td className="p-2">{row.os ?? "—"}</td>
                <td className="p-2">{row.device ?? "—"}</td>
                <td className="p-2">
                  <span className={row.success ? "text-emerald-600" : "text-destructive"}>
                    {row.success ? "성공" : "실패"}
                  </span>
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {row.failureReason ?? "—"}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-muted-foreground">
                  기록이 없습니다. 로그인 시도부터 자동으로 수집됩니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 text-sm">
        {page > 1 ? (
          <Link href={qs(page - 1)} className="underline">
            이전
          </Link>
        ) : null}
        <span className="text-muted-foreground">
          {page}/{totalPages}
        </span>
        {page < totalPages ? (
          <Link href={qs(page + 1)} className="underline">
            다음
          </Link>
        ) : null}
      </div>
    </div>
  );
}
