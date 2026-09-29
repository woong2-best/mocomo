import { getCachedSession } from "@/lib/auth";
import { getChatRooms } from "@/actions/chat";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";
import { getRequestLocale } from "@/lib/i18n/server";
import { uiText } from "@/lib/i18n/ui-text";

async function ChatRoomsLoadError() {
  const locale = await getRequestLocale();
  return (
    <p className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">
      {uiText(
        locale,
        "대화 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        "Couldn't load conversations. Please try again shortly."
      )}
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
      {loadError ? <ChatRoomsLoadError /> : null}
      <ConversationList rooms={rooms} currentUserId={session.user.id} className="md:max-w-full" />
    </>
  );
}
