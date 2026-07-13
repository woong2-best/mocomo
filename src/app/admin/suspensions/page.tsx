import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminSuspensionsPanel } from "@/components/admin/admin-suspensions-panel";
import { searchSuspendedUsers } from "@/actions/admin";
import { getAdminAppeals, getBanEvasionSuspects } from "@/actions/appeal";

export default async function AdminSuspensionsPage() {
  const [users, appeals, evasion] = await Promise.all([
    searchSuspendedUsers(""),
    getAdminAppeals(),
    getBanEvasionSuspects(),
  ]);

  return (
    <AdminPageChrome maxWidth="4xl" title="계정 제재 · 이의 제기">
      <p className="mb-4 text-sm text-muted-foreground">
        영구 정지, 복구, 이의 제기, 제재 우회 의심 기록을 관리합니다.
      </p>
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
