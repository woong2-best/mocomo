import { errorText } from "@/lib/i18n/error-text";
import { adminLoadIdolBackdrops } from "@/actions/admin-idol-backdrop";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminIdolBackdropForm } from "@/components/admin/cms/admin-idol-backdrop-form";

export const dynamic = "force-dynamic";

export default async function AdminIdolBackdropPage() {
  const res = await adminLoadIdolBackdrops();
  if (!res.ok) return <p className="text-sm text-destructive">{errorText(res.error)}</p>;

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={<h1 className="text-2xl font-bold tracking-tight">라이브 아바타 배경</h1>}
    >
      <AdminIdolBackdropForm initial={res.data} />
    </AdminPageChrome>
  );
}
