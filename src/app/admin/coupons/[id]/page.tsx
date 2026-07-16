import Link from "next/link";
import { adminGetCouponAction } from "@/actions/admin-coupons";
import { getAdminActor } from "@/lib/admin/access";
import { CouponDetailActions } from "@/components/admin/cms/coupon-detail-actions";
import { DashboardCard } from "@/components/admin/shell/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminCouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [actor, res] = await Promise.all([getAdminActor(), adminGetCouponAction(id)]);
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;
  const c = res.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/admin/coupons" className="text-sm text-muted-foreground hover:underline">
          ← 쿠폰 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{c.name}</h1>
        <p className="font-mono text-sm text-muted-foreground">{c.code}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <div className="rounded-xl border p-3">상태 {c.listStatus}</div>
        <div className="rounded-xl border p-3">발급 {c._count.assignments}</div>
        <div className="rounded-xl border p-3">사용 {c._count.usages}</div>
        <div className="rounded-xl border p-3">
          혜택 사용 ₩{c.usedBenefitKrw.toLocaleString()}
        </div>
      </div>

      <DashboardCard title="혜택 · 조건">
        <ul className="space-y-1 text-sm">
          <li>{c.benefitLabel}</li>
          <li>적용 대상: {c.audience}{c.targetTier ? ` (${c.targetTier})` : ""}</li>
          <li>
            사용 횟수:{" "}
            {c.maxUsesPerUser == null ? "무제한" : `유저당 ${c.maxUsesPerUser}회`}
            {c.maxTotalUses != null ? ` · 전체 ${c.maxTotalUses}회` : ""}
          </li>
          <li>
            기간: {c.startsAt.toISOString().slice(0, 16)} ~{" "}
            {c.endsAt ? c.endsAt.toISOString().slice(0, 16) : "무기한"}
          </li>
          <li>
            생성: @{c.createdBy.username} · {c.createdAt.toISOString()}
          </li>
          <li>수정: {c.updatedAt.toISOString()}</li>
          {c.adminMemo ? <li className="text-muted-foreground">메모: {c.adminMemo}</li> : null}
        </ul>
      </DashboardCard>

      <CouponDetailActions
        couponId={c.id}
        active={c.active}
        canWrite={actor.permissions.includes("coupons.write")}
        canAssign={actor.permissions.includes("coupons.assign")}
        canDelete={actor.permissions.includes("coupons.delete")}
      />

      <DashboardCard title="지급된 유저">
        <ul className="space-y-1 text-sm">
          {c.assignments.length === 0 ? (
            <li className="text-muted-foreground">아직 지급 없음</li>
          ) : (
            c.assignments.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span>@{a.user.username}</span>
                <span className="text-xs text-muted-foreground">
                  {a.status}
                  {a.remainingBenefitKrw != null
                    ? ` · 남은 ₩${a.remainingBenefitKrw.toLocaleString()}`
                    : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      </DashboardCard>

      <DashboardCard title="사용 내역">
        <ul className="space-y-2 text-sm">
          {c.usages.length === 0 ? (
            <li className="text-muted-foreground">사용 기록 없음</li>
          ) : (
            c.usages.map((u) => (
              <li key={u.id} className="border-b border-border/40 pb-2">
                <p>
                  @{u.user.username} · {u.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.referenceType} · 정산 ₩{u.grossAmountKrw.toLocaleString()} · 혜택 ₩
                  {u.benefitAppliedKrw.toLocaleString()} · 수수료{" "}
                  {u.feeBeforeKrw.toLocaleString()}→{u.feeAfterKrw.toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
      </DashboardCard>
    </div>
  );
}
