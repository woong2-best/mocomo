import { Suspense } from "react";
import { MessagesLayoutShell } from "@/components/messages/messages-layout-shell";
import { MessagesInboxAsync } from "@/components/messages/messages-inbox-async";

function InboxSkeleton() {
  return (
    <aside className="w-full md:w-[340px] lg:w-[360px] shrink-0 border-r border-border/60 flex flex-col animate-pulse">
      <div className="h-14 border-b border-border/60 bg-muted/30" />
      <div className="flex-1 p-2 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
    </aside>
  );
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MessagesLayoutShell
      sidebar={
        <Suspense fallback={<InboxSkeleton />}>
          <MessagesInboxAsync />
        </Suspense>
      }
    >
      {children}
    </MessagesLayoutShell>
  );
}
