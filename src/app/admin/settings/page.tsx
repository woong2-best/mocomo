import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
  if (!res.ok) return <p className="text-sm text-destructive">{errorText(res.error)}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("lib.admin.s16n1kal")}</h1>
        <p className="text-sm text-muted-foreground">{t("app.admin.snkixc0")}</p>
      </div>
      <AdminSettingsForm initial={res.data} />
      {flags.ok ? <FeatureFlagsPanel flags={flags.data} /> : null}
    </div>
  );
}
