import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminCommunitiesPage() {
  return (
    <AdminPlaceholderPage
      title={t("lib.admin.s1k369no")}
      description={t("app.admin.s846n49")}
      actions={[{ label: t("app.admin.s1k3aqe8") }, { label: t("app.admin.sxq7094") }]}
    />
  );
}
