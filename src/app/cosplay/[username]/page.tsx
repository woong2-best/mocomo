import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StartDmButton } from "@/components/messages/start-dm-button";
import { Gem, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { userAvatarFallbackInitial, userDisplayName } from "@/lib/user-public-select";

export default async function CosplayProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    include: {
      cosplayerProfile: {
        include: {
          photos: { orderBy: { createdAt: "desc" } },
          schedules: {
            where: { startsAt: { gte: new Date() } },
            orderBy: { startsAt: "asc" },
          },
          animeLinks: { include: { anime: { select: { title: true, slug: true } } } },
        },
      },
    },
  });

  if (!user?.cosplayerProfile) notFound();
  const cp = user.cosplayerProfile;
  const displayName = userDisplayName(user);

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <Avatar className="h-20 w-20 ring-4 ring-primary/30">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>{userAvatarFallbackInitial(user)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">@{username}</p>
          {cp.bio && <p className="text-sm mt-3">{cp.bio}</p>}
          <p className="text-sm text-neon-cyan mt-2">{cp.followerCount} 팔로워 · 후원 {cp.totalTips.toLocaleString()}원</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href={`/u/${username}`}>
              <span className="text-sm text-primary">전체 프로필 →</span>
            </Link>
            <StartDmButton userId={user.id} />
          </div>
        </div>
      </div>

      {cp.animeLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cp.animeLinks.map((l) => (
            <Link
              key={l.id}
              href={`/anime/${l.anime.slug}`}
              className="text-xs px-3 py-1 rounded-full bg-primary/20 hover:bg-primary/30"
            >
              {l.anime.title} {l.character && `· ${l.character}`}
            </Link>
          ))}
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Gem className="h-4 w-4 text-neon-pink" />
          코스프레 갤러리
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cp.photos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.character || ""} className="w-full aspect-[3/4] object-cover" />
              <CardContent className="p-2 text-xs">
                {p.character && <p className="font-medium">{p.character}</p>}
                {p.series && <p className="text-muted-foreground">{p.series}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {cp.schedules.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            일정
          </h2>
          <div className="space-y-2">
            {cp.schedules.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 text-sm">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-muted-foreground">
                    {format(s.startsAt, "PPP p", { locale: ko })}
                    {s.location && ` · ${s.location}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
