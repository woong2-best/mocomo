import { Suspense } from "react";
import { getChatRooms } from "@/actions/chat";
import { ConversationList } from "@/components/messages/conversation-list";
import { getRequestLocale } from "@/lib/i18n/server";


async function ChatRoomsLoadError() {
  const locale = await getRequestLocale();
  return (
    <p className="mx-3 mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {t("ui.couldn_t_load_conversations_please_try")}
    </p>
  );
}

async function ConversationListData({
  currentUserId,
  activeRoomId,
  className,
}: {
  currentUserId: string;
  activeRoomId: string;
  className?: string;
}) {
  let rooms: Awaited<ReturnType<typeof getChatRooms>> = [];
  let loadError = false;
  try {
    rooms = await getChatRooms(currentUserId);
  } catch {
    loadError = true;
  }
  return (
    <>
      {loadError ? <ChatRoomsLoadError /> : null}
      <ConversationList
        rooms={rooms}
        currentUserId={currentUserId}
        activeRoomId={activeRoomId}
        className={className}
      />
    </>
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
