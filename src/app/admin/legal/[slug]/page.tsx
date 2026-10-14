import Link from "next/link";
import { notFound } from "next/navigation";
import { errorText } from "@/lib/i18n/error-text";
import { adminLoadLegalDocument } from "@/actions/admin-legal";
import { AdminLegalEditor } from "@/components/admin/cms/admin-legal-editor";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";

export const dynamic = "force-dynamic";

export default async function AdminLegalEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await adminLoadLegalDocument(slug);
  if (!res.ok) {
    if (res.error === "Unknown legal document.") notFound();
    return <p className="text-sm text-destructive">{errorText(res.error)}</p>;
  }

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={
        <div>
          <Link href="/admin/legal" className="text-sm text-muted-foreground hover:underline">
            Legal documents
          </Link>
          <h1 className="text-2xl font-bold">{res.data.label}</h1>
          <a
            href={res.data.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View public page
          </a>
        </div>
      }
    >
      <AdminLegalEditor initial={res.data} />
    </AdminPageChrome>
  );
}
