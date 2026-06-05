"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followUserAction } from "@/actions/user-profile";
import { cn } from "@/lib/utils";

export function ProfileFollowButton({
  userId,
  username,
  initialFollowing,
  onFollowingChange,
}: {
  userId: string;
  username: string;
  initialFollowing: boolean;
  /** 팔로워 수 등 낙관적 UI (선택) */
  onFollowingChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  async function toggle() {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    onFollowingChange?.(next);
    setBusy(true);
    try {
      const result = await followUserAction(userId, username);
      if (result?.error) {
        setFollowing(!next);
        onFollowingChange?.(!next);
      } else if (typeof result?.following === "boolean") {
        setFollowing(result.following);
        onFollowingChange?.(result.following);
      }
    } catch {
      setFollowing(!next);
      onFollowingChange?.(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={following ? "outline" : "default"}
      className={cn("rounded-full font-bold px-5 gap-1 min-w-[7.5rem]", busy && "opacity-90")}
      disabled={busy}
      onClick={() => void toggle()}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="h-4 w-4" />
          팔로잉
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          팔로우
        </>
      )}
    </Button>
  );
}
