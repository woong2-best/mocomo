import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
        <h1 className="text-2xl font-bold tracking-tight">{t("lib.admin.sq1mjex")}</h1>
        <p className="text-sm text-muted-foreground">
          회원 로그인·접속 IP, 지역, 기기 정보 · 총 {total}건
        </p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder={t("app.admin.s1njjge5")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="ip"
          defaultValue={sp.ip}
          placeholder={t("app.admin.s16m58l")}
          className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
        />
        <select
          name="channel"
          defaultValue={sp.channel ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("app.admin.sqkab0c")}</option>
          <option value="web">{t("app.admin.s13ax")}</option>
          <option value="mobile">{t("app.admin.s1301")}</option>
        </select>
        <select
          name="success"
          defaultValue={sp.success ?? ""}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All results</option>
          <option value="true">{t("app.admin.sxt5w")}</option>
          <option value="false">{t("reels.syb44")}</option>
        </select>
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          검색
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2">{t("reels.sy36w")}</th>
              <th className="p-2">Members</th>
              <th className="p-2">IP</th>
              <th className="p-2">{t("app.admin.spcsbw1")}</th>
              <th className="p-2">Channel</th>
              <th className="p-2">{t("app.admin.sx2ok")}</th>
              <th className="p-2">Browser</th>
              <th className="p-2">OS</th>
              <th className="p-2">{t("app.admin.sul1c")}</th>
              <th className="p-2">{t("app.admin.subm4")}</th>
              <th className="p-2">{t("app.admin.s7c587k")}</th>
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
                <td className="p-2">{row.channel === "mobile" ? t("app.admin.s1301") : t("app.admin.s13ax")}</td>
                <td className="p-2">{row.provider ?? "—"}</td>
                <td className="p-2">{row.browser ?? "—"}</td>
                <td className="p-2">{row.os ?? "—"}</td>
                <td className="p-2">{row.device ?? "—"}</td>
                <td className="p-2">
                  <span className={row.success ? "text-emerald-600" : "text-destructive"}>
                    {row.success ? t("app.admin.sxt5w") : t("reels.syb44")}
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
