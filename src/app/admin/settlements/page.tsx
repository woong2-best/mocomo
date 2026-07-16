import { adminListSettlementsAction } from "@/actions/admin-settlements";
import { AdminSettlementsPanel } from "@/components/admin/cms/admin-settlements-panel";
import type { SettlementStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status as SettlementStatus | undefined;
  const res = await adminListSettlementsAction({
    status: status || undefined,
    page: Number(sp.page) || 1,
  });

  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산 관리</h1>
        <p className="text-sm text-muted-foreground">
          Settlement · Item · History · Promotion/Coupon 미리보기 · 실DB
        </p>
      </div>
      <AdminSettlementsPanel
        items={res.data.items}
        total={res.data.total}
        page={res.data.page}
        totalPages={res.data.totalPages}
        statusFilter={status}
      />
    </div>
  );
}
