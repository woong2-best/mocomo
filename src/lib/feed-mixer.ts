export type FeedPostItem<T> = { type: "post"; data: T };
export type FeedAdItem<A> = { type: "ad"; data: A };

export type FeedItem<T, A> = FeedPostItem<T> | FeedAdItem<A>;

export type MixFeedOptions = {
  /** 블록당 게시글 수 (광고 1개 삽입 주기) */
  postsPerBlock?: number;
  /** 첫 광고 전 최소 게시글 수 — 2열 그리드 기준 2행 = 4 */
  minPostsBeforeFirstAd?: number;
  /** 무한 스크롤 등 이미 지나간 게시글 수 */
  postOffset?: number;
};

const DEFAULT_MIN_POSTS = 4;
const DEFAULT_BLOCK = 6;

function resolveOptions(options?: MixFeedOptions | number): Required<MixFeedOptions> {
  const o = typeof options === "number" ? { postsPerBlock: options } : (options ?? {});
  return {
    postsPerBlock: o.postsPerBlock ?? DEFAULT_BLOCK,
    minPostsBeforeFirstAd: o.minPostsBeforeFirstAd ?? DEFAULT_MIN_POSTS,
    postOffset: o.postOffset ?? 0,
  };
}

/** 블록 중간(맨 앞 제외)에 광고 1개 */
function adIndexInBlock(blockLen: number): number {
  if (blockLen <= 1) return blockLen;
  return Math.max(1, Math.floor(blockLen / 2));
}

function mixTailWithAds<T, A>(
  posts: T[],
  ads: A[],
  postsPerBlock: number,
  startAdIndex: number
): { items: FeedItem<T, A>[]; nextAdIndex: number } {
  const result: FeedItem<T, A>[] = [];
  let adIndex = startAdIndex;

  for (let i = 0; i < posts.length; i += postsPerBlock) {
    const chunk = posts.slice(i, i + postsPerBlock);
    const pos = adIndexInBlock(chunk.length);

    chunk.forEach((post, idx) => {
      if (ads.length > 0 && idx === pos) {
        result.push({ type: "ad", data: ads[adIndex % ads.length] });
        adIndex++;
      }
      result.push({ type: "post", data: post });
    });

    if (ads.length > 0 && pos === chunk.length) {
      result.push({ type: "ad", data: ads[adIndex % ads.length] });
      adIndex++;
    }
  }

  return { items: result, nextAdIndex: adIndex };
}

/** 게시글 + 광고 믹스. 상단·첫 글 직후 광고 없음, 피드 중간에만 삽입 */
export function mixFeedWithAds<T, A>(
  posts: T[],
  ads: A[],
  options?: MixFeedOptions | number
): FeedItem<T, A>[] {
  const { postsPerBlock, minPostsBeforeFirstAd, postOffset } = resolveOptions(options);

  if (ads.length === 0) {
    return posts.map((data) => ({ type: "post" as const, data }));
  }

  if (posts.length === 0) {
    return postOffset === 0 ? ads.map((data) => ({ type: "ad" as const, data })) : [];
  }

  const result: FeedItem<T, A>[] = [];

  let headCount = 0;
  if (postOffset < minPostsBeforeFirstAd) {
    headCount = Math.min(posts.length, minPostsBeforeFirstAd - postOffset);
  }

  for (let h = 0; h < headCount; h++) {
    result.push({ type: "post", data: posts[h]! });
  }

  const tail = posts.slice(headCount);
  const { items: mixed } = mixTailWithAds(tail, ads, postsPerBlock, 0);
  return [...result, ...mixed];
}
