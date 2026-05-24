import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AnimeForm } from "@/components/anime/anime-form";
import { genreFromParam } from "@/lib/anime-genres";
import { AnimeGenre } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function AnimeNewPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/anime/new");

  const { genre: genreParam } = await searchParams;
  const presetGenre = genreParam ? genreFromParam(genreParam) : null;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Link href="/anime">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          애니 홈
        </Button>
      </Link>
      <AnimeForm
        mode="create"
        initial={presetGenre ? { title: "", genre: presetGenre as AnimeGenre } : undefined}
      />
    </div>
  );
}
