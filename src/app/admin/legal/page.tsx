import Link from "next/link";
import { errorText } from "@/lib/i18n/error-text";
import { adminListLegalDocuments } from "@/actions/admin-legal";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";

export const dynamic = "force-dynamic";

export default async function AdminLegalIndexPage() {
  const res = await adminListLegalDocuments();
  if (!res.ok) {
    return <p className="text-sm text-destructive">{errorText(res.error)}</p>;
  }

  return (
    <AdminPageChrome maxWidth="4xl" title={<h1 className="text-2xl font-bold">Legal documents</h1>}>
      <p className="text-sm text-muted-foreground">
        Edit public terms and policies. Publish immediately, or announce now and apply in 30 days
        with the forced consent popup.
      </p>
      <ul className="space-y-2">
        {res.data.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/admin/legal/${item.slug}`}
              className="block rounded-2xl border border-border p-4 hover:border-primary/40 hover:bg-muted/30"
            >
              <span className="font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {item.scheduledPublishAt
                  ? `Scheduled ${item.scheduledPublishAt.slice(0, 10)}`
                  : item.liveUpdatedAt
                    ? `Live ${item.liveUpdatedAt.slice(0, 10)}`
                    : "Using built-in text until first publish"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminPageChrome>
  );
}
