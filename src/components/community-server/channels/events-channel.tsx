import Link from "next/link";
import { Calendar } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export async function EventsChannelView({ communityId: _communityId }: { communityId: string }) {
  const events = await db.event.findMany({
    where: { status: "PUBLISHED", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 20,
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      imageUrl: true,
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h1 className="font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          이벤트
        </h1>
        <Button size="sm" variant="outline" asChild>
          <Link href="/events">이벤트 만들기</Link>
        </Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            진행 중인 이벤트가 없습니다.
          </div>
        ) : (
          events.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="block rounded-xl border border-border p-4 hover:bg-muted/40 transition-colors"
            >
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {e.startsAt.toLocaleString()} — {e.endsAt.toLocaleString()}
              </p>
              {e.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
