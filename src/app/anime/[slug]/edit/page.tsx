import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth, isSiteOperator } from "@/lib/auth";
import { AnimeForm } from "@/components/anime/anime-form";
import { AnimeDeleteRequestForm } from "@/components/anime/anime-delete-request-form";
import { AnimeProtectionToggle } from "@/components/anime/anime-protection-toggle";
import { Button } from "@/components/ui/button";
import { ChevronLeft, History } from "lucide-react";
import { UserRole } from "@prisma/client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export default async function AnimeEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/auth/signin?callbackUrl=/anime/${slug}/edit`);

  const anime = await db.anime.findUnique({ where: { slug } });
  if (!anime) notFound();

  const canEditProtected =
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.MODERATOR ||
    (session.user.username ? isSiteOperator(session.user as { username: string; role: string; email?: string | null }) : false);

  if (anime.isProtected && !canEditProtected) {
    redirect(`/anime/${slug}`);
  }

  const isAdmin =
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.MODERATOR ||
    (session.user.username ? isSiteOperator(session.user as { username: string; role: string; email?: string | null }) : false);

  return (
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/anime/${slug}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            상세로
          </Button>
        </Link>
        <Link href={`/anime/${slug}/history`}>
          <Button variant="outline" size="sm" className="gap-1 rounded-lg">
            <History className="h-3.5 w-3.5" />
            수정 기록
          </Button>
        </Link>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-3 bg-muted/20">
          <span className="text-sm font-medium">운영진</span>
          <AnimeProtectionToggle slug={slug} isProtected={anime.isProtected} />
        </div>
      )}

      <AnimeForm mode="edit" slug={slug} initial={anime} />

      <section className="rounded-xl border border-border/70 p-4 space-y-2">
        <h2 className="text-sm font-semibold">삭제 요청</h2>
        <AnimeDeleteRequestForm slug={slug} title={anime.title} />
      </section>
    </AppPageChrome>
  );
}
