import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { getAppealDetail } from "@/actions/appeal";
import { appealStatusLabel } from "@/lib/account-status";
import { auth } from "@/lib/auth";

export default async function AppealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const appeal = await getAppealDetail(id);
  if (!appeal) notFound();

  return (
    <AppPageChrome maxWidth="3xl" className="py-8 space-y-6">
      <Link href="/appeal/history" className="text-sm text-muted-foreground hover:text-foreground">
        ← 이의 제기 내역
      </Link>

      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{appeal.title}</h1>
          <span className="text-sm font-medium">{appealStatusLabel(appeal.status)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          접수: {format(appeal.createdAt, "yyyy-MM-dd HH:mm", { locale: ko })}
        </p>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{appeal.content}</div>

        {appeal.attachments.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold">첨부파일</h2>
            <ul className="space-y-1 text-sm">
              {appeal.attachments.map((file) => (
                <li key={file.id}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {file.filename}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {appeal.decisionNote && (
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            <h2 className="font-semibold">최종 결과</h2>
            <p className="mt-2 whitespace-pre-wrap">{appeal.decisionNote}</p>
            {appeal.decidedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                처리일: {format(appeal.decidedAt, "yyyy-MM-dd HH:mm", { locale: ko })}
              </p>
            )}
          </div>
        )}
      </div>
    </AppPageChrome>
  );
}
