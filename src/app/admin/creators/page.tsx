import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminCreatorsPage() {
  return (
    <AdminPlaceholderPage
      title={t("lib.admin.s16ujksg")}
      description={t("app.admin.crud_cms_creators")}
      actions={[{ label: t("app.admin.s16uncj7") }, { label: t("app.admin.sj579ph") }]}
    />
  );
}
