import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminProductsPage() {
  return (
    <AdminPlaceholderPage
      title="상품 관리"
      description="마켓 · 디지털 상품 관리 화면입니다. 삭제 등 동작은 아직 연결하지 않습니다."
      actions={[{ label: "상품 삭제" }, { label: "상품 숨김" }, { label: "상품 등록" }]}
    />
  );
}
