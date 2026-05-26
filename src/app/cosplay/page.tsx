import Link from "next/link";
import { getCachedSession } from "@/lib/auth";

export const revalidate = 120;
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, UserPlus } from "lucide-react";

export default async function CosplayPage() {
  const session = await getCachedSession();
  let hasCosplayerProfile = false;
  if (session?.user?.id) {
    hasCosplayerProfile = !!(await db.cosplayerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }));
  }

  type CosplayerWithRelations = Awaited<
    ReturnType<
      typeof db.cosplayerProfile.findMany<{
        include: {
          user: { select: { username: true; image: true } };
          photos: { take: 1 };
          animeLinks: { include: { anime: { select: { title: true } } } };
        };
      }>
    >
  >;
  let cosplayers: CosplayerWithRelations = [];
  try {
    cosplayers = await db.cosplayerProfile.findMany({
      take: 24,
      orderBy: { followerCount: "desc" },
      include: {
        user: { select: { username: true, image: true } },
        photos: { take: 1 },
        animeLinks: { take: 1, include: { anime: { select: { title: true } } } },
      },
    });
  } catch {
    cosplayers = [];
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6 text-pink-500" />
          코스프레
        </h1>
        {session?.user && !hasCosplayerProfile && (
          <Link href="/cosplay/apply">
            <Button className="gap-2 rounded-xl">
              <UserPlus className="h-4 w-4" />
              코스프레 등록
            </Button>
          </Link>
        )}
        {session?.user && hasCosplayerProfile && (
          <Link href={`/cosplay/${session.user.username}`}>
            <Button variant="outline" className="rounded-xl">
              내 코스프레 프로필
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cosplayers.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">
            등록된 코스프레 프로필이 없습니다.
            {session?.user && !hasCosplayerProfile && (
              <>
                {" "}
                <Link href="/cosplay/apply" className="text-primary hover:underline">
                  첫 프로필을 등록해 보세요
                </Link>
              </>
            )}
          </p>
        ) : (
          cosplayers.map((cp) => (
            <Link key={cp.id} href={`/cosplay/${cp.user.username}`}>
              <Card className="overflow-hidden hover:border-primary/40 rounded-2xl h-full">
                {cp.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cp.photos[0].url} alt="" className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-muted/40 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={cp.user.image ?? undefined} />
                    <AvatarFallback>{cp.user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{cp.stageName || cp.user.username}</p>
                    {cp.photos[0]?.character && (
                      <p className="text-xs text-muted-foreground truncate">{cp.photos[0].character}</p>
                    )}
                    {cp.animeLinks[0] && (
                      <p className="text-xs text-primary truncate">{cp.animeLinks[0].anime.title}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
