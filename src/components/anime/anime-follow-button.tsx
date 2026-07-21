"use client";

import { useRef, useState } from "react";
import { toggleAnimeFollow } from "@/actions/anime";
import { Button } from "@/components/ui/button";

export function AnimeFollowButton({
  animeId,
  initialFollowing,
}: {
  animeId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const inFlightRef = useRef(false);
  const desiredRef = useRef(initialFollowing);
  const serverRef = useRef(initialFollowing);

  async function toggle() {
    const next = !desiredRef.current;
    desiredRef.current = next;
    setFollowing(next);

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      while (serverRef.current !== desiredRef.current) {
        await toggleAnimeFollow(animeId);
        serverRef.current = !serverRef.current;
      }
      setFollowing(desiredRef.current);
    } catch {
      desiredRef.current = serverRef.current;
      setFollowing(serverRef.current);
    } finally {
      inFlightRef.current = false;
    }
  }

  return (
    <Button
      variant={following ? "secondary" : "default"}
      size="sm"
      onClick={() => void toggle()}
      aria-pressed={following}
    >
      {following ? "팔로잉" : "팔로우"}
    </Button>
  );
}
