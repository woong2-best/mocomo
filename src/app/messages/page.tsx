import Link from "next/link";
import { auth } from "@/lib/auth";
import { getChatRooms } from "@/actions/chat";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  let rooms: Awaited<ReturnType<typeof getChatRooms>> = [];
  try {
    rooms = await getChatRooms();
  } catch {
    rooms = [];
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className="w-full md:w-72 border-r border-border/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h1 className="font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-neon-cyan" />
            메시지
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">채팅방 없음</p>
          ) : (
            rooms.map((room) => {
              const other = room.members.find((m) => m.userId !== session.user.id);
              const name =
                room.name || (room.type === "DM" && other ? other.user.username : room.type);
              return (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  className="block rounded-lg px-3 py-2.5 hover:bg-accent/50 text-sm"
                >
                  <p className="font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.messages[0]?.content || "—"}
                  </p>
                  <span className="text-[10px] text-primary/70">{room.type}</span>
                </Link>
              );
            })
          )}
        </div>
      </aside>
      <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground text-sm">
        채팅방을 선택하세요 · DM · 그룹 · 공지 · 팬채팅
      </div>
    </div>
  );
}
