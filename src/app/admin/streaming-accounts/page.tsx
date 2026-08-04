import { Suspense } from "react";
import { adminLoadStreamingAccounts } from "@/actions/admin-streaming-accounts";
import { AdminStreamingAccountsTable } from "@/components/admin/cms/admin-streaming-accounts-table";

export const dynamic = "force-dynamic";

export default async function AdminStreamingAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    verified?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = {
    q: sp.q,
    page: Number(sp.page) || 1,
    verified: (sp.verified as "all" | "yes" | "no" | "revoked") || "all",
  };

  const res = await adminLoadStreamingAccounts(query);
  if (!res.ok) {
    return <p className="text-sm text-destructive">로드 실패</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">스트리밍 계정 연결</h1>
        <p className="text-sm text-muted-foreground">
          OAuth·수동 검증 상태 · 사기 연결 해제 · 검증 로그
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">로딩…</p>}>
        <AdminStreamingAccountsTable
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
