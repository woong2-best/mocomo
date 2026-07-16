import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholderPage
      title="시스템 설정"
      description="플랫폼 전역 설정 · 운영 플래그 화면 골격입니다."
      actions={[{ label: "설정 저장" }, { label: "캐시 초기화" }]}
    />
  );
}
