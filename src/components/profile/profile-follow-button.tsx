"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followUserAction, getFollowStatusAction } from "@/actions/user-profile";
import { cn } from "@/lib/utils";

export function ProfileFollowButton({
  userId,
  username,
  initialFollowing,
  onFollowingChange,
  followLabel = "팔로우",
  followingLabel = "팔로우 됨",
  syncFollowingOnMount = false,
  className,
  size = "default",
}: {
  userId: string;
  username: string;
  initialFollowing: boolean;
  /** 팔로워 수 등 낙관적 UI (선택) */
  onFollowingChange?: (following: boolean) => void;
  followLabel?: string;
  followingLabel?: string;
  /** SSR 캐시와 다를 수 있을 때 마운트 시 DB 재확인 */
  syncFollowingOnMount?: boolean;
  className?: string;
  size?: "default" | "sm";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing, userId]);

  useEffect(() => {
    if (!syncFollowingOnMount) return;
    let cancelled = false;
    void getFollowStatusAction(userId).then((res) => {
      if (!cancelled && typeof res.following === "boolean") {
        setFollowing(res.following);
        onFollowingChange?.(res.following);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, syncFollowingOnMount, onFollowingChange]);

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
      size={size}
      className={cn(
        "rounded-full font-bold gap-1 shrink-0",
        size === "sm" ? "h-8 px-3 text-xs min-w-[5.5rem]" : "px-5 min-w-[7.5rem]",
        following && "bg-transparent text-foreground border-border",
        busy && "opacity-90",
        className
      )}
      disabled={busy}
      onClick={() => void toggle()}
      aria-pressed={following}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserCheck className="h-4 w-4" />
          {followingLabel}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {followLabel}
        </>
      )}
    </Button>
  );
}
