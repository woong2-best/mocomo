import Link from "next/link";
import { getAdminEventMapRecommendations } from "@/actions/admin";
import { AdminEventsMapPanel } from "@/components/admin/admin-events-map-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";

export const dynamic = "force-dynamic";

export default async function AdminEventsMapPage() {
  let recommendations: Awaited<ReturnType<typeof getAdminEventMapRecommendations>> = [];
  let authorized = true;
  let loadFailed = false;

  try {
    recommendations = await getAdminEventMapRecommendations();
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
    <AdminPageChrome maxWidth="4xl" title="행사 지도 · 유저 추천 핀">
      <p className="mb-4 text-sm text-muted-foreground">
        유저가 행사 지도에 등록한 초록 핀(추천 장소) 목록입니다. 부적절한 장소는 강제 삭제할 수
        있습니다.
      </p>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>
      <AdminEventsMapPanel initialRecommendations={recommendations} />
    </AdminPageChrome>
  );
}
