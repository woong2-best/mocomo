import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AnimeForm } from "@/components/anime/anime-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
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
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <Link href="/anime">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          애니 홈
        </Button>
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">새 위키 문서</h1>
      </NativePageTitle>
      <AnimeForm
        mode="create"
        initial={presetGenre ? { title: "", genre: presetGenre as AnimeGenre } : undefined}
      />
    </AppPageChrome>
  );
}
