import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminSuspensionsPanel } from "@/components/admin/admin-suspensions-panel";
import { AdminSanctionsLookup } from "@/components/admin/admin-sanctions-lookup";
import { searchSuspendedUsers } from "@/actions/admin";
import { getAdminAppeals, getBanEvasionSuspects } from "@/actions/appeal";

export default async function AdminSuspensionsPage() {
  const [users, appeals, evasion] = await Promise.all([
    searchSuspendedUsers(""),
    getAdminAppeals(),
    getBanEvasionSuspects(),
  ]);

  return (
    <AdminPageChrome maxWidth="4xl" title={t("app.admin.s1tvjdmu")}>
      <p className="mb-4 text-sm text-muted-foreground">
        유저 ID로 제재 이력을 찾고, 숨긴 게시물을 삭제 전과 동일하게 복구할 수 있습니다.
      </p>
      <div className="mb-6">
        <AdminSanctionsLookup />
      </div>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>
      <AdminSuspensionsPanel
        initialUsers={users}
        initialAppeals={appeals}
        initialEvasion={evasion}
      />
    </AdminPageChrome>
  );
}
