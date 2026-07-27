"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";
import { FeedVideoViewer } from "@/components/feed/feed-video-viewer";
import {
  buildFeedVideoPlaylist,
  findPlaylistIndex,
  getMainScrollEl,
  type FeedVideoOpenTarget,
} from "@/lib/feed-video-viewer";
import { isMobileViewport } from "@/hooks/use-mobile-viewport";

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
  const [startIndex, setStartIndex] = useState(0);
  const savedScrollTopRef = useRef(0);

  const playlist = useMemo(
    () => buildFeedVideoPlaylist(items, likedIds, starredIds),
    [items, likedIds, starredIds]
  );

  const openVideoViewer = useCallback(
    (target: FeedVideoOpenTarget) => {
      if (!isMobileViewport()) return false;
      const idx = findPlaylistIndex(playlist, target);
      if (idx < 0) return false;
      savedScrollTopRef.current = getMainScrollEl()?.scrollTop ?? 0;
      setStartIndex(idx);
      setOpen(true);
      return true;
    },
    [playlist]
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

  const value = useMemo(
    () => ({ openVideoViewer }),
    [openVideoViewer]
  );

  return (
    <FeedVideoViewerContext.Provider value={value}>
      {children}
      {open && playlist.length > 0 && (
        <FeedVideoViewer
          items={playlist}
          startIndex={startIndex}
          onClose={onClose}
          onNearEnd={onNearEnd}
          loadingMore={loadingMore}
        />
      )}
    </FeedVideoViewerContext.Provider>
  );
}
