import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { AdminReportsPanel } from "@/components/admin/admin-reports-panel";
import { AdminRepeatViolatorsPolicy } from "@/components/admin/admin-repeat-violators-policy";
import { getPendingReports } from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  let reports: Awaited<ReturnType<typeof getPendingReports>> = [];
  let authorized = true;
  let loadFailed = false;

  try {
    reports = await getPendingReports();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      authorized = false;
    } else {
      loadFailed = true;
    }
  }

  if (!authorized) {
    return <AdminAccessDenied />;
  }

  if (loadFailed) {
    return <AdminLoadError />;
  }

  return (
    <AdminPageChrome maxWidth="4xl" title="신고 관리">
      <p className="mb-4 text-sm text-muted-foreground">
        이용자 신고 대기열입니다. 신고를 검토하고 콘텐츠 삭제·해결·기각·제재를 적용하세요.
      </p>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <AdminReportsPanel initialReports={reports} />
        <AdminRepeatViolatorsPolicy />
      </div>
    </AdminPageChrome>
  );
}
