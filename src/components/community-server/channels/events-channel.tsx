import Link from "next/link";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function EventsChannelView({ communityId: _communityId }: { communityId: string }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h1 className="font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          이벤트
        </h1>
        <Button size="sm" variant="outline" asChild>
          <Link href="/events">이벤트 탐색</Link>
        </Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground space-y-3">
          <p>커뮤니티 전용 이벤트를 여기서 관리할 수 있습니다.</p>
          <Button size="sm" asChild>
            <Link href="/events">이벤트 만들기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
