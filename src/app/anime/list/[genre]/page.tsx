import { redirect, notFound } from "next/navigation";
import { genreFromParam, genreToParam } from "@/lib/anime-genres";

/** Legacy genre URL → hub pill filter. */
export default async function AnimeGenreListRedirect({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre: genreParam } = await params;
  const genre = genreFromParam(genreParam);
  if (!genre) notFound();
  redirect(`/anime?genre=${genreToParam(genre)}`);
}
