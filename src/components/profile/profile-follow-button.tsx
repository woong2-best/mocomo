"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followUserAction, getFollowStatusAction } from "@/actions/user-profile";
import { cn } from "@/lib/utils";

export function ProfileFollowButton({
  userId,
  username,
  initialFollowing,
  initialRequested = false,
  postsLocked = false,
  onFollowingChange,
  followLabel = "팔로우",
  followingLabel = "팔로잉",
  requestLabel = "요청",
  requestedLabel = "요청됨",
  syncFollowingOnMount = false,
  listOwnerUsername,
  className,
  size = "default",
}: {
  userId: string;
  username: string;
  initialFollowing: boolean;
  initialRequested?: boolean;
  postsLocked?: boolean;
  /** 팔로워 수 등 낙관적 UI (선택) */
  onFollowingChange?: (following: boolean) => void;
  followLabel?: string;
  followingLabel?: string;
  requestLabel?: string;
  requestedLabel?: string;
  /** SSR 캐시와 다를 수 있을 때 마운트 시 DB 재확인 */
  syncFollowingOnMount?: boolean;
  /** 팔로워 목록 페이지 주인 — 팔로우 후 목록 캐시 갱신 */
  listOwnerUsername?: string;
  className?: string;
  size?: "default" | "sm";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [requested, setRequested] = useState(initialRequested);
  const [locked, setLocked] = useState(postsLocked);
  const userIdRef = useRef(userId);
  const inFlightRef = useRef(false);
  const desiredFollowingRef = useRef(initialFollowing);
  const desiredRequestedRef = useRef(initialRequested);
  const serverFollowingRef = useRef(initialFollowing);
  const serverRequestedRef = useRef(initialRequested);

  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      setFollowing(initialFollowing);
      setRequested(initialRequested);
      setLocked(postsLocked);
      desiredFollowingRef.current = initialFollowing;
      desiredRequestedRef.current = initialRequested;
      serverFollowingRef.current = initialFollowing;
      serverRequestedRef.current = initialRequested;
      inFlightRef.current = false;
    }
  }, [userId, initialFollowing, initialRequested, postsLocked]);

  useEffect(() => {
    if (!syncFollowingOnMount) return;
    let cancelled = false;
    void getFollowStatusAction(userId).then((res) => {
      if (cancelled || inFlightRef.current) return;
      if (typeof res.following === "boolean") {
        serverFollowingRef.current = res.following;
        desiredFollowingRef.current = res.following;
        setFollowing(res.following);
        onFollowingChange?.(res.following);
      }
      if (typeof res.requested === "boolean") {
        serverRequestedRef.current = res.requested;
        desiredRequestedRef.current = res.requested;
        setRequested(res.requested);
      }
      if (typeof res.postsLocked === "boolean") {
        setLocked(res.postsLocked);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, syncFollowingOnMount, onFollowingChange]);

  async function toggle() {
    if (following) {
      desiredFollowingRef.current = false;
      desiredRequestedRef.current = false;
      setFollowing(false);
      setRequested(false);
      onFollowingChange?.(false);
    } else if (requested) {
      desiredRequestedRef.current = false;
      setRequested(false);
    } else {
      if (locked) {
        desiredRequestedRef.current = true;
        setRequested(true);
      } else {
        desiredFollowingRef.current = true;
        setFollowing(true);
        onFollowingChange?.(true);
      }
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      while (
        serverFollowingRef.current !== desiredFollowingRef.current ||
        serverRequestedRef.current !== desiredRequestedRef.current
      ) {
        const result = await followUserAction(userId, username, {
          listOwnerUsername,
        });
        if (result && "error" in result && result.error) {
          desiredFollowingRef.current = serverFollowingRef.current;
          desiredRequestedRef.current = serverRequestedRef.current;
          setFollowing(serverFollowingRef.current);
          setRequested(serverRequestedRef.current);
          onFollowingChange?.(serverFollowingRef.current);
          break;
        }
        if (result && "following" in result) {
          serverFollowingRef.current = !!result.following;
          serverRequestedRef.current = !!result.requested;
          if (result.following) {
            desiredRequestedRef.current = false;
          }
        } else {
          const status = await getFollowStatusAction(userId);
          if (typeof status.following === "boolean") {
            serverFollowingRef.current = status.following;
          }
          if (typeof status.requested === "boolean") {
            serverRequestedRef.current = status.requested;
          }
        }
      }
      setFollowing(desiredFollowingRef.current);
      setRequested(desiredRequestedRef.current);
      onFollowingChange?.(desiredFollowingRef.current);
    } catch {
      desiredFollowingRef.current = serverFollowingRef.current;
      desiredRequestedRef.current = serverRequestedRef.current;
      setFollowing(serverFollowingRef.current);
      setRequested(serverRequestedRef.current);
      onFollowingChange?.(serverFollowingRef.current);
    } finally {
      inFlightRef.current = false;
    }
  }

  const showRequested = requested && !following;
  const idleLabel = locked ? requestLabel : followLabel;

  return (
    <Button
      type="button"
      variant={following || showRequested ? "outline" : "default"}
      size={size}
      className={cn(
        "rounded-full font-bold gap-1 shrink-0",
        size === "sm" ? "h-8 px-3 text-xs min-w-[5.5rem]" : "px-5 min-w-[7.5rem]",
        (following || showRequested) && "bg-transparent text-foreground border-border",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      aria-pressed={following || showRequested}
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4" />
          {followingLabel}
        </>
      ) : showRequested ? (
        <>
          <Clock className="h-4 w-4" />
          {requestedLabel}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {idleLabel}
        </>
      )}
    </Button>
  );
}
