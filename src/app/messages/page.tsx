import Link from "next/link";
import { auth } from "@/lib/auth";
import { getChatRooms } from "@/actions/chat";
import { redirect } from "next/navigation";
import { MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/messages");

  let rooms: Awaited<ReturnType<typeof getChatRooms>> = [];
  try {
    rooms = await getChatRooms();
  } catch {
    rooms = [];
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)]">
      <aside className="w-full md:w-80 border-r border-border/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50 flex items-center justify-between gap-2">
          <h1 className="font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            메시지
          </h1>
          <Button asChild size="sm" className="rounded-xl shrink-0">
            <Link href="/messages/new">
              <Plus className="h-4 w-4 mr-1" />
              새 DM
            </Link>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">아직 대화가 없습니다.</p>
              <Button asChild className="rounded-xl w-full">
                <Link href="/messages/new">닉네임으로 DM 시작</Link>
              </Button>
            </div>
          ) : (
            rooms.map((room) => {
              const other = room.members.find((m) => m.userId !== session.user.id);
              const name =
                room.name || (room.type === "DM" && other ? other.user.username : room.type);
              return (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  className="block rounded-xl px-3 py-2.5 hover:bg-accent/50 text-sm border border-transparent hover:border-border/50"
                >
                  <p className="font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.messages[0]?.content || "대화 시작"}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </aside>
      <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground text-sm p-6 text-center">
        <div>
          <p className="mb-3">채팅방을 선택하거나 새 DM을 시작하세요.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/messages/new">새 메시지</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
