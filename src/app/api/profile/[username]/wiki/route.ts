import { NextRequest, NextResponse } from "next/server";
import { getUserWikiContributions } from "@/actions/anime";
import { getProfileAuthorByUsername } from "@/actions/profile-page";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const author = await getProfileAuthorByUsername(username);
  if (!author) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { created, edited } = await getUserWikiContributions(author.id);

  return NextResponse.json(
    {
      created: created.map((a) => ({
        slug: a.slug,
        title: a.title,
        updatedAt: a.updatedAt.toISOString(),
      })),
      edited: edited.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        anime: r.anime,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
