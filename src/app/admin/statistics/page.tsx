import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminStatisticsPage() {
  return (
    <AdminPlaceholderPage
      title="통계"
      description="가입·매출·트래픽 통계 조회 화면입니다. 현재는 조회 버튼만 둡니다."
      actions={[{ label: "통계 조회" }, { label: "기간 설정" }, { label: "CSV 내보내기" }]}
    />
  );
}
