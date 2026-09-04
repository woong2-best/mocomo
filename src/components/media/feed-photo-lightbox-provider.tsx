"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PostMediaLightbox,
  type PostMediaLightboxItem,
} from "@/components/media/post-media-lightbox";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { registerFeedOverlay } from "@/lib/feed-overlay-guard";

type OpenArgs = {
  media: ProfilePostMediaItem[];
  index: number;
  postId: string;
  postInstantPurchasePriceKrw?: number;
  isOwner?: boolean;
};

type FeedPhotoLightboxContextValue = {
  openPhotoLightbox: (args: OpenArgs) => void;
  closePhotoLightbox: () => void;
  updatePhotoLightboxMedia: (media: ProfilePostMediaItem[]) => void;
  isPhotoLightboxOpen: boolean;
};

const FeedPhotoLightboxContext = createContext<FeedPhotoLightboxContextValue | null>(
  null
);

export function useFeedPhotoLightboxOptional() {
  return useContext(FeedPhotoLightboxContext);
}

function toLightboxItems(media: ProfilePostMediaItem[]): PostMediaLightboxItem[] {
  return media.map((m) => ({
    id: m.id,
    url: m.url,
    type: m.type,
    priceKrw: m.priceKrw,
    instantPurchasePriceKrw: m.instantPurchasePriceKrw,
    locked: m.locked,
    lockReason: m.lockReason,
  }));
}

/** 피드·프로필 공용 — router.refresh()로도 닫히지 않도록 앱 루트에 둔다. */
export function FeedPhotoLightboxProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<ProfilePostMediaItem[]>([]);
  const [index, setIndex] = useState(0);
  const [postId, setPostId] = useState("");
  const [postInstantPurchasePriceKrw, setPostInstantPurchasePriceKrw] = useState<
    number | undefined
  >();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!open) return;
    return registerFeedOverlay();
  }, [open]);

  const openPhotoLightbox = useCallback((args: OpenArgs) => {
    setMedia(args.media);
    setIndex(Math.min(Math.max(0, args.index), Math.max(0, args.media.length - 1)));
    setPostId(args.postId);
    setPostInstantPurchasePriceKrw(args.postInstantPurchasePriceKrw);
    setIsOwner(args.isOwner ?? false);
    setOpen(true);
  }, []);

  const closePhotoLightbox = useCallback(() => {
    setOpen(false);
  }, []);

  const updatePhotoLightboxMedia = useCallback((next: ProfilePostMediaItem[]) => {
    setMedia(next);
  }, []);

  const value = useMemo(
    () => ({
      openPhotoLightbox,
      closePhotoLightbox,
      updatePhotoLightboxMedia,
      isPhotoLightboxOpen: open,
    }),
    [open, openPhotoLightbox, closePhotoLightbox, updatePhotoLightboxMedia]
  );

  const lightboxItems = useMemo(() => toLightboxItems(media), [media]);

  return (
    <FeedPhotoLightboxContext.Provider value={value}>
      {children}
      {open && lightboxItems.length > 0 ? (
        <PostMediaLightbox
          open
          onClose={closePhotoLightbox}
          media={lightboxItems}
          initialIndex={index}
          postId={postId}
          postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
          isOwner={isOwner}
        />
      ) : null}
    </FeedPhotoLightboxContext.Provider>
  );
}
