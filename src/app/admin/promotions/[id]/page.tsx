import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetPromotionAction } from "@/actions/admin-promotions";
import { getAdminActor } from "@/lib/admin/access";
import { PromotionDetailActions } from "@/components/admin/cms/promotion-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [actor, res] = await Promise.all([getAdminActor(), adminGetPromotionAction(id)]);
  if (!res.ok || !res.data) notFound();
  const p = res.data;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link href="/admin/promotions" className="text-sm text-muted-foreground hover:underline">
          ← 프로모션 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{p.name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{p.slug}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">혜택 · 우선순위</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{p.benefitLabel}</p>
            <p>Priority: {p.priority}</p>
            <p>Trigger: {p.trigger}</p>
            <p>상태: {p.active ? "활성" : "비활성"}</p>
            <p>
              기간: {p.startsAt.toISOString().slice(0, 10)} ~{" "}
              {p.endsAt ? p.endsAt.toISOString().slice(0, 10) : "무기한"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">통계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>발급: {p._count.assignments.toLocaleString()}</p>
            <p>사용: {p._count.usages.toLocaleString()}</p>
            <p>절감 합계: ₩{p.usedBenefitKrw.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">생성: {p.createdBy.username}</p>
          </CardContent>
        </Card>
      </div>

      {p.rules.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">지급 조건</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm font-mono">
              {p.rules.map((r, i) => (
                <li key={i}>{JSON.stringify(r)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <PromotionDetailActions
        promotionId={p.id}
        active={p.active}
        priority={p.priority}
        canWrite={actor.permissions.includes("coupons.write")}
        canAssign={actor.permissions.includes("coupons.assign")}
        canDelete={actor.permissions.includes("coupons.delete")}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">최근 지급</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {p.assignments.map((a) => (
              <li key={a.id}>
                @{a.user.username} · {a.status} ·{" "}
                {a.assignedAt.toISOString().slice(0, 16).replace("T", " ")}
              </li>
            ))}
            {p.assignments.length === 0 ? (
              <li className="text-muted-foreground">아직 없음</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">히스토리</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {p.history.map((h) => (
              <li key={h.id}>
                {h.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {h.action}
                {h.detail ? ` · ${h.detail}` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
