import type { SupportTierLevel } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DmCallButtons } from "@/components/call/dm-call-buttons";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

export function ChatHeader({
  displayName,
  displayImage,
  profileUsername,
  supportTierSent,
  roomId,
  roomType,
  otherUserId,
  showBackOnMobile = true,
}: {
  displayName: string;
  displayImage: string | null;
  profileUsername?: string;
  supportTierSent?: SupportTierLevel;
  roomId: string;
  roomType: string;
  otherUserId?: string;
  showBackOnMobile?: boolean;
}) {
  const profileHref = profileUsername ? `/u/${profileUsername}` : undefined;

  return (
    <header className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-border/60 bg-background/95 backdrop-blur-md shrink-0 z-10">
      {showBackOnMobile && (
        <Link
          href="/messages"
          className="md:hidden p-2 -ml-1 rounded-full hover:bg-muted/80 shrink-0"
          aria-label="대화 목록"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}

      {profileHref ? (
        <Link href={profileHref} prefetch className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
            <AvatarImage src={displayImage ?? undefined} />
            <AvatarFallback className="text-sm font-semibold">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <DisplayNameWithSupportTier
              name={displayName}
              tier={supportTierSent ?? "PEBBLE"}
              nameClassName="font-semibold text-sm"
              compact
            />
            <p className="text-xs text-muted-foreground">프로필 보기</p>
          </div>
        </Link>
      ) : (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-sm">{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <DisplayNameWithSupportTier
            name={displayName}
            tier={supportTierSent ?? "PEBBLE"}
            nameClassName="font-semibold text-sm"
            compact
          />
        </div>
      )}

      {roomType === "DM" && otherUserId && (
        <DmCallButtons calleeId={otherUserId} chatRoomId={roomId} />
      )}
    </header>
  );
}
