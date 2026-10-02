import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChatRooms } from "@/actions/chat";
import { ConversationList } from "@/components/messages/conversation-list";
import { getServerTranslator } from "@/lib/i18n/server";

async function ChatRoomsLoadError() {
  const { t } = await getServerTranslator();
  return (
    <p className="mx-3 mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {t("ui.couldn_t_load_conversations_please_try")}
    </p>
  );
}

export async function ChatSidebarAsync({
  roomId,
  className,
}: {
  roomId: string;
  className?: string;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  let rooms: Awaited<ReturnType<typeof getChatRooms>> = [];
  let loadError = false;
  try {
    rooms = await getChatRooms(session.user.id);
  } catch {
    loadError = true;
  }

  return (
    <>
      {loadError ? <ChatRoomsLoadError /> : null}
      <ConversationList
        rooms={rooms}
        currentUserId={session.user.id}
        activeRoomId={roomId}
        className={className}
      />
    </>
  );
}
