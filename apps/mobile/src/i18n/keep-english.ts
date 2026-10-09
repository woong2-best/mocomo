/**
 * Product labels that stay English in every UI language.
 * ML Kit must not rewrite these — it produced 다다음 / 추종자 / 시장 / 라이브 / 별.
 */
export const KEEP_ENGLISH_UI_KEYS = new Set([
  "m.common.following",
  "m.common.followers",
  "m.nav.following_v",
  "m.nav.followers_v",
  "m.common.live",
  "m.live.studio.tag",
  "nav.market",
  "nav.live",
  "nav.star",
  "nav.communities",
  "nav.anime",
  "nav.wallet",
  "nav.studio",
]);

export const KEEP_ENGLISH_TOKENS_RE =
  /\b(Following|Followers|Market|LIVE|Live|STAR|QnA|Q&A|Culture Wiki|Wallet|Studio|ALL|Cos)\b/g;
