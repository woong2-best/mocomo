import { Suspense } from "react";
import { adminListCouponsAction } from "@/actions/admin-coupons";
import { getAdminActor } from "@/lib/admin/access";
import { AdminCouponsTable } from "@/components/admin/cms/admin-coupons-table";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = {
    q: sp.q,
    status: (sp.status as "all" | "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXHAUSTED") || "all",
    sort: (sp.sort as "newest" | "oldest" | "expires" | "usage") || "newest",
    page: Number(sp.page) || 1,
  };

  const [actor, res] = await Promise.all([getAdminActor(), adminListCouponsAction(query)]);
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">쿠폰</h1>
        <p className="text-sm text-muted-foreground">
          코드 입력형 혜택 ·{" "}
          <a href="/admin/promotions" className="underline">
            프로모션(자동 적용)
          </a>{" "}
          과 병행 · 실DB CRUD
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">로딩…</p>}>
        <AdminCouponsTable
          items={res.data.items}
          total={res.data.total}
          page={res.data.page}
          totalPages={res.data.totalPages}
          query={query}
          canWrite={actor.permissions.includes("coupons.write")}
        />
      </Suspense>
    </div>
  );
}
