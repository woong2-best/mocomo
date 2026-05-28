import { Suspense } from "react";
import { ChatSidebarAsync } from "@/components/messages/chat-sidebar-async";
import { ChatRoomShellAsync } from "@/components/messages/chat-room-shell-async";
import { ChatHeaderSkeleton, ChatMessagesSkeleton } from "@/components/ui/content-skeletons";

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  return (
    <div className="flex flex-1 min-h-0 h-full">
      <Suspense
        fallback={
          <aside className="hidden md:flex w-72 shrink-0 border-r border-border/60 animate-pulse bg-muted/20" />
        }
      >
        <ChatRoomSidebar params={params} />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
        <Suspense
          fallback={
            <>
              <ChatHeaderSkeleton />
              <ChatMessagesSkeleton />
            </>
          }
        >
          <ChatRoomMain params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function ChatRoomSidebar({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <ChatSidebarAsync roomId={roomId} className="hidden md:flex" />;
}

async function ChatRoomMain({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <ChatRoomShellAsync roomId={roomId} />;
}
