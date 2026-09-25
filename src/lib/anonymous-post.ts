export const ANONYMOUS_AUTHOR_ID = "anonymous";
export const ANONYMOUS_AUTHOR_USERNAME = "anonymous";
export const ANONYMOUS_DISPLAY_NAME = "익명";

type AuthorLike = {
  id: string;
  username: string;
  name?: string | null;
  image?: string | null;
  supportTierSent?: string | null;
  earnedMocoTier?: string | null;
};

export function anonymousPublicAuthor<T extends AuthorLike>(author: T, keepId: boolean): T {
  return {
    ...author,
    id: keepId ? author.id : ANONYMOUS_AUTHOR_ID,
    username: ANONYMOUS_AUTHOR_USERNAME,
    name: ANONYMOUS_DISPLAY_NAME,
    image: null,
    supportTierSent: "SEED",
    earnedMocoTier: "SEED",
  };
}

export function redactAnonymousPostAuthor<
  T extends {
    isAnonymous?: boolean | null;
    authorId?: string;
    author: AuthorLike;
    collaborators?: unknown;
  },
>(post: T, viewerId?: string | null): T {
  if (!post.isAnonymous) return post;
  const realAuthorId = post.authorId ?? post.author.id;
  const keepId = Boolean(viewerId && realAuthorId && viewerId === realAuthorId);
  return {
    ...post,
    authorId: keepId ? realAuthorId : undefined,
    author: anonymousPublicAuthor(post.author, keepId),
    collaborators: Array.isArray(post.collaborators) ? [] : post.collaborators,
  };
}

export function redactAnonymousPostAuthors<
  T extends {
    isAnonymous?: boolean | null;
    authorId?: string;
    author: AuthorLike;
    collaborators?: unknown;
  },
>(posts: T[], viewerId?: string | null): T[] {
  return posts.map((post) => redactAnonymousPostAuthor(post, viewerId));
}

/** QnA 글은 플래그와 상관없이 공개 응답에서 작성자를 익명으로 바꾼다. authorId는 DB에 남긴다. */
export function redactQnaPublicPost<
  T extends {
    isAnonymous?: boolean | null;
    communityId?: string | null;
    authorId?: string;
    author: AuthorLike;
    collaborators?: unknown;
  },
>(post: T, viewerId?: string | null): T {
  if (!post.communityId) return redactAnonymousPostAuthor(post, viewerId);
  return redactAnonymousPostAuthor({ ...post, isAnonymous: true }, viewerId);
}

/** @deprecated QnA 질문만 익명 — 답글(댓글) 작성자는 공개. 호환용으로 작성자 그대로 반환. */
export function publicQnaCommentAuthor<T extends AuthorLike>(
  author: T,
  _viewerId?: string | null
): T {
  return author;
}
