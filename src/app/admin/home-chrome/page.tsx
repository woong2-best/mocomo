import { errorText } from "@/lib/i18n/error-text";
import { adminLoadHomeChrome } from "@/actions/admin-home-chrome";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminHomeChromeForm } from "@/components/admin/cms/admin-home-chrome-form";

export const dynamic = "force-dynamic";

export default async function AdminHomeChromePage() {
  const res = await adminLoadHomeChrome();
  if (!res.ok) return <p className="text-sm text-destructive">{errorText(res.error)}</p>;

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={<h1 className="text-2xl font-bold tracking-tight">홈 배경 사진</h1>}
    >
      <AdminHomeChromeForm initial={res.data} />
    </AdminPageChrome>
  );
}
