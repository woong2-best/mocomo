import { getGoldShopAdminPageData } from "@/actions/admin-gold-shop";
import { AdminGoldShopPanel } from "@/components/admin/admin-gold-shop-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Store } from "lucide-react";

export default async function AdminGoldShopPage() {
  let data: Awaited<ReturnType<typeof getGoldShopAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getGoldShopAdminPageData();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

  return (
    <AdminPageChrome
      maxWidth="5xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6" />
          Gold Shop Admin
        </h1>
      }
    >
      <AdminGoldShopPanel offers={data.offers} catalogItems={data.catalogItems} />
    </AdminPageChrome>
  );
}
