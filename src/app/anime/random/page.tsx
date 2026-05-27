import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AnimeRandomPage() {
  const total = await db.anime.count();
  if (total === 0) redirect("/anime");

  const skip = Math.floor(Math.random() * total);
  const anime = await db.anime.findFirst({
    skip,
    select: { slug: true },
  });

  if (!anime) redirect("/anime");
  redirect(`/anime/${anime.slug}`);
}
