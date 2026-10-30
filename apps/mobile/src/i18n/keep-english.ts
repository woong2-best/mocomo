/**
 * Product labels that stay English in every UI language.
 * ML Kit must not rewrite these — it produced 다다음 / 추종자 / 시장 / 라이브 / 별.
 */
export const KEEP_ENGLISH_UI_KEYS = new Set([
  "m.common.follow",
  "m.common.following",
  "m.common.followers",
  "m.common.requested",
  "m.nav.following_v",
  "m.nav.followers_v",
  "m.common.live",
  "m.live.no_live_currently_in_progress",
  "m.live.studio.tag",
  "nav.market",
  "nav.live",
  "nav.star",
  "nav.communities",
  "nav.anime",
  "nav.wallet",
  "nav.studio",
  "m.star.clear_all",
  "m.star.clear_all_saves",
  "m.feed.instagram",
  "m.feed.instagram_stories",
  "m.feed.sms",
  "m.feed.whatsapp",
  "m.profile.more_connect_moment",
  "m.feed.gif_powered",
  "m.feed.repost",
  "m.feed.undo_repost",
  "m.feed.quote",
  "m.feed.quote_post",
  "sidebar.eventsMapTitle",
  "sidebar.eventsMapExpand",
  "m.events.subculture_map",
  "m.events.venues",
  "m.events.maid_caf",
  "m.events.maid_caf_s",
  "m.events.picks",
  "m.events.place_name",
  "m.events.goods",
  "m.events.pick",
  "m.events.user_pick",
]);

export const KEEP_ENGLISH_TOKENS_RE =
  /\b(Follow|Following|Followers|Requested|Market|LIVE|Live|STAR|QnA|Q&A|Culture Wiki|Wallet|Studio|ALL|Delete All|Cos|Instagram|Instagram Stories|WhatsApp|SMS|Repost|Reposted|Quote|Subculture Map|Places|Maid Cafe|Hotel products|Venue|Venues|Featured|Picks|Goods)\b/g;
