import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminAdsPage() {
  return (
    <AdminPlaceholderPage
      title="광고 관리"
      description="사이드바·피드 광고 슬롯 관리 화면입니다."
      actions={[{ label: "광고 등록" }, { label: "광고 비활성" }]}
    />
  );
}
