import { adminLoginLogsAction } from "@/actions/admin-security";

export const dynamic = "force-dynamic";

export default async function AdminLoginLogsPage() {
  const { rows } = await adminLoginLogsAction({ take: 100 });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관리자 로그인 기록</h1>
        <p className="text-sm text-muted-foreground">
          Passkey / TOTP 사용 여부와 성공·실패를 포함한 감사 로그입니다.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2">시간</th>
              <th className="p-2">계정</th>
              <th className="p-2">IP</th>
              <th className="p-2">국가</th>
              <th className="p-2">브라우저</th>
              <th className="p-2">OS</th>
              <th className="p-2">기기</th>
              <th className="p-2">Passkey</th>
              <th className="p-2">TOTP</th>
              <th className="p-2">결과</th>
              <th className="p-2">실패 사유</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="p-2 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="p-2">
                  {row.user?.username ?? row.username ?? "—"}
                </td>
                <td className="p-2 font-mono text-xs">{row.ip ?? "—"}</td>
                <td className="p-2">{row.country ?? "—"}</td>
                <td className="p-2">{row.browser ?? "—"}</td>
                <td className="p-2">{row.os ?? "—"}</td>
                <td className="p-2">{row.device ?? "—"}</td>
                <td className="p-2">{row.usedPasskey ? "Y" : "—"}</td>
                <td className="p-2">{row.usedTotp ? "Y" : "—"}</td>
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
                  기록이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
