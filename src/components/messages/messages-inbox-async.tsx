import { getCachedSession } from "@/lib/auth";
import { getChatRooms } from "@/actions/chat";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";

export async function MessagesInboxAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/messages");

  const rooms = await getChatRooms(session.user.id).catch(() => []);

  return (
    <ConversationList rooms={rooms} currentUserId={session.user.id} className="md:max-w-full" />
  );
}
