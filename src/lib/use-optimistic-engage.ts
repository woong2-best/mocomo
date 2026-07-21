"use client";

import { useCallback, useRef, useState } from "react";
import { engageStar, postEngage } from "@/lib/post-engage-client";

/** Twitter-style like: UI flips instantly; syncs to server with last-write-wins. */
export function useOptimisticLike(
  postId: string,
  initialLiked: boolean,
  initialCount: number
) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);
  const desiredRef = useRef(initialLiked);
  const serverRef = useRef(initialLiked);
  const serverCountRef = useRef(initialCount);

  const toggle = useCallback(async () => {
    const next = !desiredRef.current;
    desiredRef.current = next;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    setError("");

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      while (serverRef.current !== desiredRef.current) {
        const data = await postEngage(postId, "like");
        const confirmed = !!data.liked;
        serverRef.current = confirmed;
        if (typeof data.likeCount === "number") {
          serverCountRef.current = data.likeCount;
        }
      }
      setLiked(desiredRef.current);
      if (serverRef.current === desiredRef.current) {
        setLikeCount(serverCountRef.current);
      }
    } catch (err) {
      desiredRef.current = serverRef.current;
      setLiked(serverRef.current);
      setLikeCount(serverCountRef.current);
      setError(err instanceof Error ? err.message : "좋아요에 실패했습니다.");
    } finally {
      inFlightRef.current = false;
    }
  }, [postId]);

  return { liked, likeCount, error, setError, toggle };
}

/** Twitter-style star: UI flips instantly; syncs with last-write-wins. */
export function useOptimisticStar(postId: string, initialStarred: boolean) {
  const [starred, setStarred] = useState(initialStarred);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);
  const desiredRef = useRef(initialStarred);
  const serverRef = useRef(initialStarred);

  const toggle = useCallback(async () => {
    const next = !desiredRef.current;
    desiredRef.current = next;
    setStarred(next);
    setError("");

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      while (serverRef.current !== desiredRef.current) {
        const confirmed = await engageStar(postId);
        serverRef.current = confirmed;
      }
      setStarred(desiredRef.current);
    } catch (err) {
      desiredRef.current = serverRef.current;
      setStarred(serverRef.current);
      setError(err instanceof Error ? err.message : "STAR 저장에 실패했습니다.");
    } finally {
      inFlightRef.current = false;
    }
  }, [postId]);

  return { starred, error, setError, toggle };
}
