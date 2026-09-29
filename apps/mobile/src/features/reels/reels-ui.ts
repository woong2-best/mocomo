/** Reels / short video copy — use with `useI18n().u`. */
export function reelsUi(u: (ko: string, en: string) => string) {
  return {
    title: u("영상", "Videos"),
    noVideos: u("재생할 영상이 없습니다.", "No videos to play."),
    comments: (n: number) => u(`댓글 ${n}`, `${n} comments`),
    sortNewest: u("최신순", "Newest"),
    noComments: u("아직 댓글이 없습니다.", "No comments yet."),
    commentPh: u("댓글 추가...", "Add a comment..."),
    postComment: u("게시", "Post"),
    adCategory: u("광고", "Ad"),
    ctaJoin: u("참가하기", "Join"),
  };
}

export type ReelsUi = ReturnType<typeof reelsUi>;
