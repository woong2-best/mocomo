"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileLink } from "@/components/user/user-profile-link";
import type { LiveChatMessage } from "@/components/live/live-chat";
import { commentDonationTier } from "@/lib/comment-donation";
import { formatUsd } from "@/lib/money";

export function CommentDonationChatCard({ message }: { message: LiveChatMessage }) {
  const amount = message.supportAmount ?? 0;
  const tier = commentDonationTier(amount);
  const displayMessage = message.tipMessage?.trim() || message.content;
  const username = message.username.startsWith("@") ? message.username.slice(1) : message.username;

  return (
    <div className="overflow-hidden rounded-lg shadow-sm">
      <div
        className="flex items-center gap-2 px-2.5 py-1.5"
        style={{ backgroundColor: tier.headerBg }}
      >
        <UserProfileLink username={username} className="shrink-0 rounded-full">
          <Avatar className="h-7 w-7 ring-2 ring-white/30">
            <AvatarImage src={message.image ?? undefined} />
            <AvatarFallback className="bg-white/20 text-white text-[10px]">
              {username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </UserProfileLink>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          @{username}
        </span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-white">
          {formatUsd(amount)}
        </span>
      </div>
      {displayMessage ? (
        <div className="px-2.5 py-2" style={{ backgroundColor: tier.bodyBg }}>
          <p
            className="text-sm font-medium leading-snug break-words"
            style={{ color: tier.textColor }}
          >
            {displayMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** 채팅 상단 — 최근 댓글 후원 미니 티커 */
export function CommentDonationTicker({ message }: { message: LiveChatMessage | null }) {
  if (!message || message.messageKind !== "tip") return null;
  const amount = message.supportAmount ?? 0;
  const tier = commentDonationTier(amount);
  const username = message.username.startsWith("@") ? message.username.slice(1) : message.username;

  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-full px-2.5 py-1 shadow-sm"
      style={{ backgroundColor: tier.headerBg }}
    >
      <Avatar className="h-5 w-5 ring-1 ring-white/30">
        <AvatarImage src={message.image ?? undefined} />
        <AvatarFallback className="bg-white/20 text-white text-[8px]">
          {username[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs font-semibold text-white">@{username}</span>
      <span className="ml-auto shrink-0 text-xs font-bold tabular-nums text-white">
        {formatUsd(amount)}
      </span>
    </div>
  );
}
