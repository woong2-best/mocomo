import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { AdminModerationPanel } from "@/components/admin/admin-moderation-panel";
import { AdminRepeatViolatorsPolicy } from "@/components/admin/admin-repeat-violators-policy";
import { getModerationReviewQueue } from "@/actions/moderation-admin";

export default async function AdminModerationPage() {
  let queue: Awaited<ReturnType<typeof getModerationReviewQueue>> = [];
  let authorized = true;
  let loadFailed = false;

  try {
    queue = await getModerationReviewQueue();
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
    <AdminPageChrome maxWidth="4xl" title="위험도 · 검토 대기열">
      <p className="mb-4 text-sm text-muted-foreground">
        Risk Score 기반 자동 탐지·신고·AI 분석 결과를 검토하고 제재를 적용합니다.
      </p>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <AdminRepeatViolatorsPolicy />
      </div>
      <AdminModerationPanel initialQueue={queue} />
    </AdminPageChrome>
  );
}
