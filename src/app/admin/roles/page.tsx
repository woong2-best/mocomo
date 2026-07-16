import { adminLoadStaff } from "@/actions/admin-cms";
import { AdminRolesPanel } from "@/components/admin/cms/admin-roles-panel";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const res = await adminLoadStaff();
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관리자 계정</h1>
        <p className="text-sm text-muted-foreground">
          생성 · 권한 변경 · 활성화/비활성화 · 비밀번호 초기화 · 삭제
        </p>
      </div>
      <AdminRolesPanel staff={res.data} />
    </div>
  );
}
