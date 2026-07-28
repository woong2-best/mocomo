"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { approveFollowRequest, rejectFollowRequest } from "@/actions/social";
import { userAvatarFallbackInitial, userDisplayName } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";

type RequestUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  bio: string | null;
};

export function FollowRequestsPanel({
  initialRequests,
}: {
  initialRequests: Array<{ id: string; user: RequestUser }>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialRequests);
  const [pending, startTransition] = useTransition();

  function act(requesterId: string, action: "approve" | "reject") {
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveFollowRequest(requesterId)
          : await rejectFollowRequest(requesterId);
      if (result && "error" in result && result.error) return;
      setItems((prev) => prev.filter((r) => r.user.id !== requesterId));
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">대기 중인 팔로우 요청이 없습니다.</p>
    );
  }

  return (
    <ul className="divide-y divide-border/60 -mx-1">
      {items.map((req) => {
        const displayName = userDisplayName(req.user);
        return (
          <li key={req.id} className="flex items-center gap-3 py-3 px-1">
            <Link href={`/u/${req.user.username}`} className="shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={req.user.image ?? undefined} />
                <AvatarFallback>{userAvatarFallbackInitial(req.user)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/u/${req.user.username}`} className="font-semibold text-sm hover:underline truncate block">
                {displayName}
              </Link>
              <p className="text-xs text-muted-foreground truncate">@{req.user.username}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="rounded-full"
                disabled={pending}
                onClick={() => act(req.user.id, "approve")}
              >
                수락
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={() => act(req.user.id, "reject")}
              >
                거절
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
