import { Suspense } from "react";
import { adminLoadUsers } from "@/actions/admin-cms";
import { AdminUsersTable } from "@/components/admin/cms/admin-users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = {
    q: sp.q,
    page: Number(sp.page) || 1,
    sort: (sp.sort as "createdAt" | "lastLoginAt" | "username") || "createdAt",
    order: (sp.order as "asc" | "desc") || "desc",
    status: (sp.status as "all" | "active" | "suspended" | "deleted" | "premium") || "all",
  };

  const res = await adminLoadUsers(query);
  if (!res.ok) {
    return <p className="text-sm text-destructive">{res.error}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">회원 관리</h1>
        <p className="text-sm text-muted-foreground">검색 · 정렬 · 페이지네이션 · CSV</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">로딩…</p>}>
        <AdminUsersTable
          items={res.data.items}
          total={res.data.total}
          page={res.data.page}
          totalPages={res.data.totalPages}
          query={query}
        />
      </Suspense>
    </div>
  );
}
