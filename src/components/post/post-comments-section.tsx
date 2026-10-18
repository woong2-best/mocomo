import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { auth } from "@/lib/auth";
import { getPostCommentsPage } from "@/lib/comment-service";
import { getServerTranslator } from "@/lib/i18n/server";
import { CommentForm } from "@/components/post/comment-form";
import { PostCommentsList } from "@/components/post/post-comments-list";

export async function PostCommentsSection({
  postId,
  postAuthorId,
  qna = false,
  showIdHandle = false,
}: {
  postId: string;
  postAuthorId: string;
  qna?: boolean;
  showIdHandle?: boolean;
}) {
  const [session, { t }] = await Promise.all([auth(), getServerTranslator()]);

  let pinned: Awaited<ReturnType<typeof getPostCommentsPage>>["pinned"] = [];
  let top: Awaited<ReturnType<typeof getPostCommentsPage>>["top"] = [];
  let comments: Awaited<ReturnType<typeof getPostCommentsPage>>["comments"] = [];
  let nextCursor: string | null = null;
  let loadError = "";
  const sort = qna ? "oldest" : "ranked";

  try {
    const page = await getPostCommentsPage({
      postId,
      postAuthorId,
      sort,
      limit: 20,
      viewerId: session?.user?.id ?? null,
      includePinned: !qna,
      communityId: qna ? "qna" : null,
    });
    pinned = page.pinned;
    top = page.top;
    comments = page.comments;
    nextCursor = page.nextCursor;
  } catch (e) {
    console.error("[PostCommentsSection]", e);
    loadError = t("post.sxwzygv");
  }

  const totalShown = pinned.length + top.length + comments.length;

  return (
    <section id="comments" className="space-y-4 scroll-mt-24">
      <h2 className="font-semibold">
        {t("post.comments")} {totalShown > 0 && totalShown}
      </h2>
      {session?.user && <CommentForm postId={postId} className="mt-4" />}
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <PostCommentsList
          postId={postId}
          postAuthorId={postAuthorId}
          qna={qna}
          sort={sort}
          initialPinned={pinned}
          initialTop={top}
          initialComments={comments}
          initialCursor={nextCursor}
          emptyLabel={t("post.noComments")}
          showIdHandle={showIdHandle}
        />
      )}
    </section>
  );
}
