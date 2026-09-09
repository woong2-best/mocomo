import { ChatHeaderSkeleton, ChatMessagesSkeleton } from "@/components/ui/content-skeletons";

export default function MessageRoomLoading() {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 animate-pulse">
      <ChatHeaderSkeleton />
      <ChatMessagesSkeleton />
    </div>
  );
}
