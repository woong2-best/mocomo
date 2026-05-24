import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export async function AdSidebar({ position }: { position: "left" | "right" }) {
  let ads: { id: string; title: string; imageUrl: string; linkUrl: string }[] = [];
  try {
    ads = await db.adSlot.findMany({
      where: { position, active: true },
      take: 2,
    });
  } catch {
    ads = [];
  }

  if (ads.length === 0) {
    return (
      <aside className="hidden xl:block w-48 shrink-0 p-4">
        <Card className="border-dashed border-border/40 bg-transparent">
          <CardContent className="p-4 text-center text-xs text-muted-foreground">
            광고 영역
            <br />
            <span className="text-neon-cyan">프리미엄은 광고 없음</span>
          </CardContent>
        </Card>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:block w-48 shrink-0 p-4 space-y-3">
      {ads.map((ad) => (
        <a key={ad.id} href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
          <Card className="overflow-hidden hover:border-primary/50 transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.imageUrl} alt={ad.title} className="w-full aspect-[4/3] object-cover" />
          </Card>
        </a>
      ))}
    </aside>
  );
}
