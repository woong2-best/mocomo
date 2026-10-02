import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminProductsPage() {
  return (
    <AdminPlaceholderPage
      title={t("lib.admin.s1y6n5vp")}
      description={t("app.admin.s190bdr4")}
      actions={[{ label: t("app.admin.s1y6ql7s") }, { label: t("app.admin.s1y6qp69") }, { label: t("app.admin.s1y6oi91") }]}
    />
  );
}
