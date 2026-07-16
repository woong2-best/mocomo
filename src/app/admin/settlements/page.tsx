import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminSettlementsPage() {
  return (
    <AdminPlaceholderPage
      title="정산 관리"
      description="출금 요청 · 정산 승인 화면입니다. 실제 승인 로직은 이후 단계에서 연결합니다."
      actions={[{ label: "정산 승인" }, { label: "정산 반려" }, { label: "내역 내보내기" }]}
    />
  );
}
