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

  if (ads.length === 0) return null;

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
