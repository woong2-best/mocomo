import Link from "next/link";
import { getGoldShopAdminPageData } from "@/actions/admin-gold-shop";
import { AdminGoldShopPanel } from "@/components/admin/admin-gold-shop-panel";
import { ChevronLeft, Store } from "lucide-react";

export default async function AdminGoldShopPage() {
  let data: Awaited<ReturnType<typeof getGoldShopAdminPageData>> | null = null;
  try {
    data = await getGoldShopAdminPageData();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4 pb-24">
      <Link href="/admin/economy" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        Economy Dashboard
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Store className="h-6 w-6" />
        Gold Shop Admin
      </h1>
      <AdminGoldShopPanel offers={data.offers} catalogItems={data.catalogItems} />
    </div>
  );
}
