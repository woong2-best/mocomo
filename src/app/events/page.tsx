import { auth } from "@/lib/auth";
import { getEvents } from "@/actions/events";
import { EventJoinButton } from "@/components/events/event-join-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default async function EventsPage() {
  const session = await auth();
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  try {
    events = await getEvents();
  } catch {
    events = [];
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6 text-neon-cyan" />
        이벤트
      </h1>
      <p className="text-muted-foreground text-sm">굿즈 추첨 · 팬아트 · 코스프레 대회</p>

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              진행 중인 이벤트가 없습니다.
            </CardContent>
          </Card>
        ) : (
          events.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle>{e.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(e.startsAt, "PPP", { locale: ko })} — {e.type}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{e.description}</p>
                {e.prize && <p className="text-sm text-neon-pink mt-2">🎁 {e.prize}</p>}
                <p className="text-xs text-muted-foreground mt-2">{e._count.participants} 참가</p>
                {session?.user && <EventJoinButton eventId={e.id} />}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
