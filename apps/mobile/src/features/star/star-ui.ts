/** STAR bookmarks copy — use with `useI18n().u`. */
export function starUi(u: (ko: string, en: string) => string) {
  return {
    back: u("뒤로", "Back"),
    tabAll: u("전체", "All"),
    tabPosts: u("게시물", "Posts"),
    tabQna: u("QnA", "QnA"),
    tabMarket: u("마켓", "Market"),
    tabWiki: u("컬처위키", "Culture Wiki"),
    postFallback: u("게시물", "Post"),
    productFallback: u("상품", "Product"),
    wikiFallback: u("컬처위키", "Culture Wiki"),
    badgeWiki: u("컬처위키", "Culture Wiki"),
    emptyCreator: u("이 크리에이터의 STAR 저장 글이 없습니다.", "No STAR saves from this creator."),
    emptyAll: u("저장한 항목이 없습니다.", "Nothing saved to STAR yet."),
    emptyQna: u("저장한 QnA가 없습니다.", "No saved QnA."),
    emptyMarket: u("저장한 마켓 상품이 없습니다.", "No saved market items."),
    emptyWiki: u("저장한 컬처 위키가 없습니다.", "No saved wiki articles."),
    emptyPosts: u("저장한 게시물이 없습니다.", "No saved posts."),
    clearAllTitle: u("전체 삭제", "Clear all"),
    clearAllAllMsg: u(
      "STAR에 저장한 게시물, QnA, 마켓, 컬처위키를 모두 삭제할까요? 북마크만 지워지며 글과 상품 자체는 삭제되지 않습니다.",
      "Remove all STAR saves (posts, QnA, market, wiki)? Only bookmarks are removed; content stays."
    ),
    clearAllTabMsg: (label: string) =>
      u(
        `STAR에 저장한 ${label}을 모두 삭제할까요? 북마크만 지워지며 글 자체는 삭제되지 않습니다.`,
        `Remove all saved ${label} from STAR? Only bookmarks are removed.`
      ),
    clearAllBtn: u("전체 삭제", "Clear all"),
    cancel: u("취소", "Cancel"),
    clearAllAction: u("전체 삭제하기", "Clear all saves"),
    loadError: u("STAR 목록을 불러오지 못했습니다.", "Could not load STAR list."),
    retry: u("다시 시도", "Try again"),
    tabLabel: (id: string) => {
      const map: Record<string, string> = {
        all: u("전체", "All"),
        posts: u("게시물", "Posts"),
        qna: u("QnA", "QnA"),
        market: u("마켓", "Market"),
        wiki: u("컬처위키", "Culture Wiki"),
      };
      return map[id] ?? u("게시물", "Posts");
    },
  };
}

export type StarUi = ReturnType<typeof starUi>;
