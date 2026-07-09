"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { CallParticipant } from "@/lib/call-types";
import { CallBottomSheet } from "@/components/call/call-bottom-sheet";

export function CallInviteSheet({
  open,
  onClose,
  peer,
}: {
  open: boolean;
  onClose: () => void;
  peer: CallParticipant;
}) {
  const [query, setQuery] = useState("");

  return (
    <CallBottomSheet open={open} onClose={onClose} title="초대하기">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          className="h-11 rounded-xl border-0 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-white/20"
        />
      </div>

      <p className="mb-2 text-xs font-semibold text-white/50">통화 중</p>
      <div className="flex items-center gap-3 rounded-xl px-1 py-2">
        <Avatar className="h-11 w-11">
          <AvatarImage src={peer.image ?? undefined} />
          <AvatarFallback className="bg-white/10 text-white">
            {peer.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{peer.username}</p>
          <p className="text-xs text-white/50">참여 중</p>
        </div>
      </div>

      {query.trim() && (
        <p className="mt-6 text-center text-sm text-white/45">
          그룹 통화 초대는 곧 지원됩니다.
        </p>
      )}
    </CallBottomSheet>
  );
}
