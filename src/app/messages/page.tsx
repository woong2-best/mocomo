import { auth } from "@/lib/auth";
import { getChatRooms } from "@/actions/chat";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/messages");

  let rooms: Awaited<ReturnType<typeof getChatRooms>> = [];
  try {
    rooms = await getChatRooms(session.user.id);
  } catch {
    rooms = [];
  }

  return (
    <div className="flex flex-1 min-h-0 h-full">
      <ConversationList rooms={rooms} currentUserId={session.user.id} className="md:max-w-full" />
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-muted/15 text-center p-8">
        <div className="h-20 w-20 rounded-full bg-muted/80 flex items-center justify-center mb-4">
          <MessageCircle className="h-10 w-10 text-muted-foreground/70" />
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
