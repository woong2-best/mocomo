import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminStatisticsPage() {
  return (
    <AdminPlaceholderPage
      title={t("lib.admin.s10m9b")}
      description={t("app.admin.submltp")}
      actions={[{ label: t("app.admin.s1ofeuct") }, { label: t("app.admin.s1rihttp") }, { label: t("app.admin.csv") }]}
    />
  );
}
