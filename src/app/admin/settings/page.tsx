import { adminLoadSettings } from "@/actions/admin-cms";
import { adminListFeatureFlagsAction } from "@/actions/admin-feature-flags";
import { AdminSettingsForm } from "@/components/admin/cms/admin-settings-form";
import { FeatureFlagsPanel } from "@/components/admin/cms/feature-flags-panel";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [res, flags] = await Promise.all([
    adminLoadSettings(),
    adminListFeatureFlagsAction(),
  ]);
  if (!res.ok) return <p className="text-sm text-destructive">{res.error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">시스템 설정</h1>
        <p className="text-sm text-muted-foreground">DB에 저장되며 새로고침 후에도 유지됩니다.</p>
      </div>
      <AdminSettingsForm initial={res.data} />
      {flags.ok ? <FeatureFlagsPanel flags={flags.data} /> : null}
    </div>
  );
}
