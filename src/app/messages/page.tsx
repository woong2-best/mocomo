import { Suspense } from "react";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessagesInboxAsync } from "@/components/messages/messages-inbox-async";

function InboxSkeleton() {
  return (
    <aside className="w-full md:max-w-full shrink-0 border-r border-border/60 flex flex-col animate-pulse">
      <div className="h-14 border-b border-border/60 bg-muted/30" />
      <div className="flex-1 p-2 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
    </aside>
  );
}

export default function MessagesPage() {
  return (
    <div className="flex flex-1 min-h-0 h-full">
      <Suspense fallback={<InboxSkeleton />}>
        <MessagesInboxAsync />
      </Suspense>
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-muted/15 text-center p-8">
        <div className="h-20 w-20 rounded-full bg-muted/80 flex items-center justify-center mb-4">
          <MessageSquare className="h-10 w-10 text-muted-foreground/70" />
        </div>
        <p className="font-semibold text-lg">내 메시지</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          왼쪽에서 대화를 선택하거나 새 메시지를 보내 보세요.
        </p>
        <Button asChild variant="outline" className="rounded-full mt-6">
          <Link href="/messages/new">새 메시지 작성</Link>
        </Button>
      </div>
    </div>
  );
}
