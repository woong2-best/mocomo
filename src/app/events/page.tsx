import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEvents } from "@/actions/events";
import { EventListCard } from "@/components/events/event-list-card";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, PlusCircle } from "lucide-react";

export default async function EventsPage() {
  const session = await auth();
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  try {
    events = await getEvents();
  } catch {
    events = [];
  }

  return (
    <AppPageChrome maxWidth="3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <NativePageTitle>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-neon-cyan" />
              이벤트
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              굿즈 추첨 · 팬아트 · 코스프레 대회 ·{" "}
              <Link href="/events/map" className="text-primary hover:underline">
                오프라인 행사 지도
              </Link>
            </p>
          </div>
        </NativePageTitle>
        {session?.user && (
          <Link href="/events/new">
            <Button className="rounded-xl gap-2 shrink-0">
              <PlusCircle className="h-4 w-4" />
              이벤트 추가하기
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground space-y-3">
              <p>진행 중인 이벤트가 없습니다.</p>
              {session?.user && (
                <Link href="/events/new">
                  <Button variant="outline" className="rounded-xl gap-2">
                    <PlusCircle className="h-4 w-4" />
                    첫 이벤트 만들기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          events.map((e) => (
            <EventListCard key={e.id} event={e} showJoin={!!session?.user} />
          ))
        )}
      </div>
    </AppPageChrome>
  );
}
