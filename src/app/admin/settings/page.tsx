import { adminLoadSettings } from "@/actions/admin-cms";
import { AdminSettingsForm } from "@/components/admin/cms/admin-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const res = await adminLoadSettings();
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">시스템 설정</h1>
        <p className="text-sm text-muted-foreground">DB에 저장되며 새로고침 후에도 유지됩니다.</p>
      </div>
      <AdminSettingsForm initial={res.data} />
    </div>
  );
}
