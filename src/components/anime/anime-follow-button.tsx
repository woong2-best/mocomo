"use client";

import { useTransition } from "react";
import { toggleAnimeFollow } from "@/actions/anime";
import { Button } from "@/components/ui/button";

export function AnimeFollowButton({
  animeId,
  initialFollowing,
}: {
  animeId: string;
  initialFollowing: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={initialFollowing ? "secondary" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleAnimeFollow(animeId);
        })
      }
    >
      {initialFollowing ? "팔로잉" : "팔로우"}
    </Button>
  );
}
