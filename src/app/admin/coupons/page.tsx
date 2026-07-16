import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminCouponsPage() {
  return (
    <AdminPlaceholderPage
      title="쿠폰 / 프로모션"
      description="쿠폰 생성 · 프로모션 캠페인 관리 화면입니다. 현재는 버튼만 배치합니다."
      actions={[{ label: "쿠폰 생성" }, { label: "프로모션 등록" }]}
    />
  );
}
