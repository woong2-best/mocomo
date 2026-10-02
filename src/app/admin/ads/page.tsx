import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminAdsPage() {
  return (
    <AdminPlaceholderPage
      title={t("lib.admin.s1n8hugt")}
      description={t("app.admin.st5nbe4")}
      actions={[{ label: t("app.events.s1n8j6u5") }, { label: t("app.admin.s1om8ueg") }]}
    />
  );
}
