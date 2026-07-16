import { Suspense } from "react";
import { adminListPromotionsAction } from "@/actions/admin-promotions";
import { getAdminActor } from "@/lib/admin/access";
import { AdminPromotionsTable } from "@/components/admin/cms/admin-promotions-table";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = {
    q: sp.q,
    active: sp.active,
    page: Number(sp.page) || 1,
  };

  const [actor, res] = await Promise.all([
    getAdminActor(),
    adminListPromotionsAction({
      q: query.q,
      page: query.page,
      active:
        query.active === "true" ? true : query.active === "false" ? false : undefined,
    }),
  ]);
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">프로모션</h1>
        <p className="text-sm text-muted-foreground">
          코드 없이 계정에 귀속 · 정산 시 우선순위 자동 적용 · 실DB CRUD
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">로딩…</p>}>
        <AdminPromotionsTable
          items={res.data.items}
          total={res.data.total}
          page={res.data.page}
          totalPages={res.data.totalPages}
          query={{ q: query.q, active: query.active }}
          canWrite={actor.permissions.includes("coupons.write")}
        />
      </Suspense>
    </div>
  );
}
