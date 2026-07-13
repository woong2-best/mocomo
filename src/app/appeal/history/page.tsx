import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { getMyAppeals } from "@/actions/appeal";
import { appealStatusLabel } from "@/lib/account-status";
import { auth } from "@/lib/auth";

export default async function AppealHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/appeal/history");

  const appeals = await getMyAppeals();

  return (
    <AppPageChrome maxWidth="3xl" className="py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">이의 제기 내역</h1>
        <Link href="/appeal" className="text-sm text-primary hover:underline">
          새 이의 제기
        </Link>
      </div>

      {appeals.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          제출한 이의 제기가 없습니다.
        </p>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {appeals.map((appeal) => (
            <Link
              key={appeal.id}
              href={`/appeal/${appeal.id}`}
              className="block px-5 py-4 hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{appeal.title}</p>
                <span className="text-sm text-muted-foreground">{appealStatusLabel(appeal.status)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(appeal.createdAt, "yyyy-MM-dd HH:mm", { locale: ko })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppPageChrome>
  );
}
