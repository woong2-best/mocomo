import { Suspense } from "react";
import { getChatRooms } from "@/actions/chat";
import { ConversationList } from "@/components/messages/conversation-list";

async function ConversationListData({
  currentUserId,
  activeRoomId,
  className,
}: {
  currentUserId: string;
  activeRoomId: string;
  className?: string;
}) {
  const rooms = await getChatRooms(currentUserId).catch(() => []);
  return (
    <ConversationList
      rooms={rooms}
      currentUserId={currentUserId}
      activeRoomId={activeRoomId}
      className={className}
    />
  );
}

function ConversationListSkeleton({ className }: { className?: string }) {
  return (
    <aside
      className={`w-72 shrink-0 border-r border-border/60 flex flex-col animate-pulse ${className ?? ""}`}
    >
      <div className="h-14 border-b border-border/60 bg-muted/30" />
      <div className="flex-1 p-2 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
    </aside>
  );
}

export function ConversationListAsync(props: {
  currentUserId: string;
  activeRoomId: string;
  className?: string;
}) {
  return (
    <Suspense fallback={<ConversationListSkeleton className={props.className} />}>
      <ConversationListData {...props} />
    </Suspense>
  );
}
