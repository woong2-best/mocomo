export type FeedPostItem<T> = { type: "post"; data: T };
export type FeedAdItem<A> = { type: "ad"; data: A };

export type FeedItem<T, A> = FeedPostItem<T> | FeedAdItem<A>;

/** 게시글 + 광고 믹스. 게시글 0개여도 광고는 표시 */
export function mixFeedWithAds<T, A>(
  posts: T[],
  ads: A[],
  postsPerBlock = 6
): FeedItem<T, A>[] {
  if (ads.length === 0) {
    return posts.map((data) => ({ type: "post" as const, data }));
  }

  if (posts.length === 0) {
    return ads.map((data) => ({ type: "ad" as const, data }));
  }

  const result: FeedItem<T, A>[] = [];
  let adIndex = 0;

  for (let i = 0; i < posts.length; i += postsPerBlock) {
    const chunk = posts.slice(i, i + postsPerBlock);
    const adPosition = Math.floor(Math.random() * (chunk.length + 1));

    chunk.forEach((post, idx) => {
      if (idx === adPosition && adIndex < ads.length) {
        result.push({ type: "ad", data: ads[adIndex % ads.length] });
        adIndex++;
      }
      result.push({ type: "post", data: post });
    });

    if (adPosition === chunk.length && adIndex < ads.length) {
      result.push({ type: "ad", data: ads[adIndex % ads.length] });
      adIndex++;
    }
  }

  return result;
}
