import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminLivePage() {
  return (
    <AdminPlaceholderPage
      title={t("lib.admin.stulbco")}
      description={t("app.admin.s13l8gaz")}
      actions={[{ label: t("lib.community-server.stupzoz") }, { label: t("app.admin.s1lyfrmi") }]}
    />
  );
}
