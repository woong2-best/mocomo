import { getCachedSession } from "@/lib/auth";
import { getChatRooms } from "@/actions/chat";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";

function ChatRoomsLoadError() {
  return (
    <p className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">
      대화 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
    </p>
  );
}

export async function MessagesInboxAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/messages");

  let rooms: Awaited<ReturnType<typeof getChatRooms>> = [];
  let loadError = false;
  try {
    rooms = await getChatRooms(session.user.id);
  } catch {
    loadError = true;
  }

  return (
    <>
      {loadError && <ChatRoomsLoadError />}
      <ConversationList rooms={rooms} currentUserId={session.user.id} className="md:max-w-full" />
    </>
  );
}
