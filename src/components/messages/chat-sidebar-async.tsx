import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChatRooms } from "@/actions/chat";
import { ConversationList } from "@/components/messages/conversation-list";

export async function ChatSidebarAsync({
  roomId,
  className,
}: {
  roomId: string;
  className?: string;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/messages/${roomId}`);

  const rooms = await getChatRooms(session.user.id).catch(() => []);

  return (
    <ConversationList
      rooms={rooms}
      currentUserId={session.user.id}
      activeRoomId={roomId}
      className={className}
    />
  );
}
