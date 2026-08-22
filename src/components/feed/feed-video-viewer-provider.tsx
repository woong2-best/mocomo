"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";
import { FeedVideoViewer } from "@/components/feed/feed-video-viewer";
import {
  buildFeedVideoGroups,
  findGroupOpenPosition,
  getMainScrollEl,
  type FeedVideoOpenTarget,
} from "@/lib/feed-video-viewer";
import { getVideoPlaybackController } from "@/lib/video-playback";
import { registerFeedOverlay } from "@/lib/feed-overlay-guard";

type FeedVideoViewerContextValue = {
  openVideoViewer: (target: FeedVideoOpenTarget) => boolean;
};

const FeedVideoViewerContext = createContext<FeedVideoViewerContextValue | null>(
  null
);

export function useFeedVideoViewerOptional() {
  return useContext(FeedVideoViewerContext);
}

export function FeedVideoViewerProvider({
  items,
  likedIds,
  starredIds,
  onNearEnd,
  loadingMore,
  children,
}: {
  items: FeedLayoutItem[];
  likedIds: Set<string>;
  starredIds: Set<string>;
  onNearEnd?: () => void;
  loadingMore?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [startGroupIndex, setStartGroupIndex] = useState(0);
  const [startVideoIndex, setStartVideoIndex] = useState(0);
  const savedScrollTopRef = useRef(0);

  const groups = useMemo(
    () => buildFeedVideoGroups(items, likedIds, starredIds),
    [items, likedIds, starredIds]
  );

  const openVideoViewer = useCallback(
    (target: FeedVideoOpenTarget) => {
      const pos = findGroupOpenPosition(groups, target);
      if (!pos) return false;
      savedScrollTopRef.current = getMainScrollEl()?.scrollTop ?? 0;
      getVideoPlaybackController()?.pauseAll();
      setStartGroupIndex(pos.groupIndex);
      setStartVideoIndex(pos.videoIndex);
      setOpen(true);
      return true;
    },
    [groups]
  );

  const onClose = useCallback(() => {
    setOpen(false);
    const y = savedScrollTopRef.current;
    requestAnimationFrame(() => {
      const main = getMainScrollEl();
      if (main && Number.isFinite(y)) {
        main.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      }
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    return registerFeedOverlay();
  }, [open]);

  const value = useMemo(
    () => ({ openVideoViewer }),
    [openVideoViewer]
  );

  return (
    <FeedVideoViewerContext.Provider value={value}>
      {children}
      {open && groups.length > 0 && (
        <FeedVideoViewer
          groups={groups}
          startGroupIndex={startGroupIndex}
          startVideoIndex={startVideoIndex}
          onClose={onClose}
          onNearEnd={onNearEnd}
          loadingMore={loadingMore}
        />
      )}
    </FeedVideoViewerContext.Provider>
  );
}
