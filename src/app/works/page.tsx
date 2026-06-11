import Link from "next/link";
import { listCreatorSeries } from "@/actions/creator-works";
import { CREATOR_WORK_KIND_DESC, CREATOR_WORK_KIND_LABEL } from "@/lib/creator-work-labels";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Camera, Clapperboard } from "lucide-react";

export const dynamic = "force-dynamic";

const kindIcon = {
  WEBTOON: BookOpen,
  PHOTO: Camera,
  VIDEO: Clapperboard,
} as const;

export default async function WorksHomePage() {
  const [webtoons, photos, videos] = await Promise.all([
    listCreatorSeries("WEBTOON").catch(() => []),
    listCreatorSeries("PHOTO").catch(() => []),
    listCreatorSeries("VIDEO").catch(() => []),
  ]);

  const sections = [
    { kind: "WEBTOON" as const, items: webtoons },
    { kind: "PHOTO" as const, items: photos },
    { kind: "VIDEO" as const, items: videos },
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground leading-relaxed">
        일러스트·사진·영상을 MoCoMo 안에서 판매할 수 있습니다. 크리에이터는{" "}
        <Link href="/works/studio" className="text-primary font-medium hover:underline">
          판매 등록
        </Link>
        에서 포트폴리오를 만들고 작품별 가격을 설정하세요.
      </p>

      {sections.map(({ kind, items }) => {
        const Icon = kindIcon[kind];
        return (
          <section key={kind}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-folk-cobalt" />
              <h2 className="font-bold">{CREATOR_WORK_KIND_LABEL[kind]}</h2>
              <span className="text-xs text-muted-foreground">{CREATOR_WORK_KIND_DESC[kind]}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
                아직 등록된 {CREATOR_WORK_KIND_LABEL[kind]}이 없습니다.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <Link key={s.id} href={`/works/series/${s.id}`}>
                    <Card className="overflow-hidden hover:border-primary/40 h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.coverUrl} alt="" className="w-full aspect-[3/4] object-cover" />
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm line-clamp-2">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">@{s.author.username}</p>
                        <p className="text-xs text-primary mt-1">{s.episodes.length}작품</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
