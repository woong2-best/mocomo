import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AnimeForm } from "@/components/anime/anime-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function AnimeEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/auth/signin?callbackUrl=/anime/${slug}/edit`);

  const anime = await db.anime.findUnique({ where: { slug } });
  if (!anime) notFound();

  const isOwner = anime.creatorId === session.user.id;
  const isMod = session.user.role === "ADMIN" || session.user.role === "MODERATOR";
  if (!isOwner && !isMod) redirect(`/anime/${slug}`);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Link href={`/anime/${slug}`}>
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          상세로
        </Button>
      </Link>
      <AnimeForm mode="edit" slug={slug} initial={anime} />
    </div>
  );
}
