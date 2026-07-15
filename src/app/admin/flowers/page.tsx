import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminFlowerRedeemActions } from "@/components/flower/admin-flower-actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminFlowerDashboard } from "@/actions/flower-admin";

export const dynamic = "force-dynamic";

export default async function AdminFlowersPage() {
  try {
    await requireAdmin({ action: "ECONOMY_MUTATION", targetType: "flower" });
  } catch {
    return <AdminAccessDenied />;
  }

  const data = await getAdminFlowerDashboard();

  return (
    <AdminPageChrome maxWidth="4xl" title="Flower Gift 관리">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        <div className="rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground">유통 중 액면가 (HELD)</p>
          <p className="text-xl font-bold">
            {(data.heldSum._sum.faceValueKrw ?? 0).toLocaleString()}원
          </p>
          <p className="text-xs text-muted-foreground">
            {typeof data.heldSum._count === "number"
              ? data.heldSum._count
              : (data.heldSum._count as { _all?: number })._all ?? 0}{" "}
            자산
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground">대기 환전</p>
          <p className="text-xl font-bold">{data.redeems.length}건</p>
        </div>
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-semibold">환전 요청</h2>
        {data.redeems.length === 0 ? (
          <p className="text-sm text-muted-foreground">대기 중인 환전이 없습니다.</p>
        ) : (
          data.redeems.map((r) => (
            <div key={r.id} className="rounded-xl border p-3 text-sm space-y-1">
              <p className="font-medium">
                @{r.user.username} · {r.asset.flowerType.emoji} {r.asset.flowerType.nameKo}
              </p>
              <p className="text-xs text-muted-foreground">
                액면 {r.faceValueKrw.toLocaleString()} → 수수료 {r.feeAmountKrw.toLocaleString()} →
                지급 {r.netAmountKrw.toLocaleString()} · risk {r.riskScore} [
                {r.riskFlags.join(", ")}]
              </p>
              <AdminFlowerRedeemActions redeem={r} />
            </div>
          ))
        )}
      </section>

      <section className="mb-8 space-y-2">
        <h2 className="font-semibold">원장 (최근)</h2>
        <ul className="text-xs space-y-1 max-h-64 overflow-auto rounded-xl border p-3 font-mono">
          {data.recentLedger.map((e) => (
            <li key={e.id}>
              @{e.user.username} {e.action} {e.amountKrw} · {e.createdAt.toISOString().slice(0, 19)}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">감사 로그</h2>
        <ul className="text-xs space-y-1 max-h-48 overflow-auto rounded-xl border p-3">
          {data.recentAudit.map((a) => (
            <li key={a.id} className="text-muted-foreground">
              <span className="text-foreground font-medium">{a.action}</span> · {a.detail}
            </li>
          ))}
        </ul>
      </section>
    </AdminPageChrome>
  );
}
