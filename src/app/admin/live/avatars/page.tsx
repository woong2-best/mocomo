import { errorText } from "@/lib/i18n/error-text";
import { adminLoadIdolVrms } from "@/actions/admin-idol-vrm";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminIdolVrmForm } from "@/components/admin/cms/admin-idol-vrm-form";

export const dynamic = "force-dynamic";

export default async function AdminIdolVrmPage() {
  const res = await adminLoadIdolVrms();
  if (!res.ok) return <p className="text-sm text-destructive">{errorText(res.error)}</p>;

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={<h1 className="text-2xl font-bold tracking-tight">라이브 아바타 파일</h1>}
    >
      <AdminIdolVrmForm initial={res.data} />
    </AdminPageChrome>
  );
}
