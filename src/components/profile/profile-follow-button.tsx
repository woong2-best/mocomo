"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
  followLabel = t("profile.svtgiw"),
  followingLabel = t("lib.user.connections.s44bb989270"),
  requestLabel = t("profile.sywex"),
  requestedLabel = t("profile.su2wfj"),
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
  /** Optimistic UI, then again with meta.committed after the server agrees. */
  onFollowingChange?: (
    following: boolean,
    meta?: { committed?: boolean; requested?: boolean }
  ) => void;
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
  const [pending, setPending] = useState(false);
  const userIdRef = useRef(userId);
  const inFlightRef = useRef(false);
  const mutationEpochRef = useRef(0);
  const serverFollowingRef = useRef(initialFollowing);
  const serverRequestedRef = useRef(initialRequested);
  const onFollowingChangeRef = useRef(onFollowingChange);
  onFollowingChangeRef.current = onFollowingChange;

  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      setFollowing(initialFollowing);
      setRequested(initialRequested);
      setLocked(postsLocked);
      setPending(false);
      serverFollowingRef.current = initialFollowing;
      serverRequestedRef.current = initialRequested;
      inFlightRef.current = false;
      mutationEpochRef.current += 1;
    }
  }, [userId, initialFollowing, initialRequested, postsLocked]);

  useEffect(() => {
    if (!syncFollowingOnMount) return;
    const epoch = mutationEpochRef.current;
    let cancelled = false;
    void getFollowStatusAction(userId)
      .then((res) => {
        if (cancelled || inFlightRef.current || mutationEpochRef.current !== epoch) return;
        if (typeof res.following === "boolean") {
          serverFollowingRef.current = res.following;
          setFollowing(res.following);
        }
        if (typeof res.requested === "boolean") {
          serverRequestedRef.current = res.requested;
          setRequested(res.requested);
        }
        if (typeof res.postsLocked === "boolean") {
          setLocked(res.postsLocked);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, syncFollowingOnMount]);

  function revertToServer() {
    setFollowing(serverFollowingRef.current);
    setRequested(serverRequestedRef.current);
    onFollowingChangeRef.current?.(serverFollowingRef.current);
  }

  async function toggle() {
    if (inFlightRef.current) return;
    const requestUserId = userId;
    const intent = following || requested ? "unfollow" : "follow";

    if (intent === "unfollow") {
      setFollowing(false);
      setRequested(false);
      onFollowingChangeRef.current?.(false);
    } else if (locked) {
      setRequested(true);
    } else {
      setFollowing(true);
      onFollowingChangeRef.current?.(true);
    }

    inFlightRef.current = true;
    setPending(true);
    mutationEpochRef.current += 1;

    try {
      const result = await followUserAction(requestUserId, username, {
        listOwnerUsername,
        intent,
      });
      if (userIdRef.current !== requestUserId) return;
      if (result && "error" in result && result.error) {
        revertToServer();
        return;
      }
      if (result && "following" in result) {
        const followingNow = !!result.following;
        const requestedNow = !!result.requested && !followingNow;
        serverFollowingRef.current = followingNow;
        serverRequestedRef.current = requestedNow;
        setFollowing(followingNow);
        setRequested(requestedNow);
        if (requestedNow) setLocked(true);
        onFollowingChangeRef.current?.(followingNow, {
          committed: true,
          requested: requestedNow,
        });
        return;
      }
      const status = await getFollowStatusAction(requestUserId);
      if (userIdRef.current !== requestUserId) return;
      const followingNow = !!status.following;
      const requestedNow = !!status.requested && !followingNow;
      serverFollowingRef.current = followingNow;
      serverRequestedRef.current = requestedNow;
      setFollowing(followingNow);
      setRequested(requestedNow);
      if (typeof status.postsLocked === "boolean") setLocked(status.postsLocked);
      onFollowingChangeRef.current?.(followingNow, {
        committed: true,
        requested: requestedNow,
      });
    } catch {
      if (userIdRef.current === requestUserId) revertToServer();
    } finally {
      if (userIdRef.current === requestUserId) {
        inFlightRef.current = false;
        setPending(false);
      }
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
      aria-busy={pending}
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
