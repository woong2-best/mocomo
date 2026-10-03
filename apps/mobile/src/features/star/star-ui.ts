
import type { TFn } from "@/i18n/types";

/** STAR bookmarks copy. */
export function starUi(t: TFn) {
  return {
    back: t("m.common.back"),
    tabAll: t("m.common.all"),
    tabPosts: t("m.common.posts"),
    tabQna: t("m.common.qna"),
    tabMarket: t("m.star.market"),
    tabWiki: t("m.common.culture_wiki"),
    postFallback: t("m.common.post"),
    productFallback: t("m.common.product"),
    wikiFallback: t("m.common.culture_wiki"),
    badgeWiki: t("m.common.culture_wiki"),
    emptyCreator: t("m.star.no_star_saves_from_this_creator"),
    emptyAll: t("m.star.nothing_saved_to_star_yet"),
    emptyQna: t("m.star.no_saved_qna"),
    emptyMarket: t("m.star.no_saved_market_items"),
    emptyWiki: t("m.star.no_saved_wiki_articles"),
    emptyPosts: t("m.star.no_saved_posts"),
    clearAllTitle: t("m.star.clear_all"),
    clearAllAllMsg: t("m.star.remove_all_star_saves_posts_qna"),
    clearAllTabMsg: (label: string) =>
      t("m.star.remove_all_saved_label_from_star", { label: String(label) }),
    clearAllBtn: t("m.star.clear_all"),
    cancel: t("m.common.cancel"),
    clearAllAction: t("m.star.clear_all_saves"),
    loadError: t("m.star.could_not_load_star_list"),
    retry: t("m.common.try_again"),
    tabLabel: (id: string) => {
      const map: Record<string, string> = {
        all: t("m.common.all"),
        posts: t("m.common.posts"),
        qna: t("m.common.qna"),
        market: t("m.star.market"),
        wiki: t("m.common.culture_wiki"),
      };
      return map[id] ?? t("m.common.posts");
    },
  };
}

export type StarUi = ReturnType<typeof starUi>;
