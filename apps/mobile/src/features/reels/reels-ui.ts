
import type { TFn } from "@/i18n/types";

/** Reels / short video copy. */
export function reelsUi(t: TFn) {
  return {
    title: t("m.reels.videos"),
    noVideos: t("m.reels.no_videos_to_play"),
    comments: (n: number) => t("m.reels.n_comments", { n: String(n) }),
    sortNewest: t("m.reels.newest"),
    noComments: t("m.common.no_comments_yet"),
    commentPh: t("m.reels.add_a_comment"),
    postComment: t("m.common.post"),
    adCategory: t("m.common.ad"),
    ctaJoin: t("m.common.join"),
  };
}

export type ReelsUi = ReturnType<typeof reelsUi>;
