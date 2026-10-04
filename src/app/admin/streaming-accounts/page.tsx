import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
    return <p className="text-sm text-destructive">{t("avatar.sxdc06c")}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">스트리밍 연동</h1>
        <p className="text-sm text-muted-foreground">
          모코모 아이디나 유저 ID로 검색하면 그 계정의 유튜브·트위치 연동을 볼 수 있습니다.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t("app.admin.srv43d")}</p>}>
        <AdminStreamingAccountsTable
          items={res.data.items}
          total={res.data.total}
          page={res.data.page}
          totalPages={res.data.totalPages}
          query={query}
          users={res.data.users}
        />
      </Suspense>
    </div>
  );
}
