import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyPurchasedEpisodes } from "@/actions/creator-works";
import { CREATOR_WORK_KIND_LABEL } from "@/lib/creator-work-labels";

export const dynamic = "force-dynamic";

export default async function WorksLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/works/library");

  const episodes = await getMyPurchasedEpisodes(session.user.id).catch(() => []);

  return (
    <div className="space-y-4">
      <h2 className="font-bold">구매한 작품</h2>
      {episodes.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">
          구매한 회차가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <Link
                href={`/works/e/${ep.id}`}
                className="flex gap-3 rounded-xl border border-border/60 p-3 hover:border-primary/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ep.series.coverUrl} alt="" className="w-14 h-[4.5rem] rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{CREATOR_WORK_KIND_LABEL[ep.series.kind]}</p>
                  <p className="font-medium text-sm truncate">{ep.series.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ep.episodeNo}화 · {ep.title}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
