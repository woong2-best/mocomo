import { auth } from "@/lib/auth";
import { getPostComments } from "@/lib/post-queries";
import { getServerTranslator } from "@/lib/i18n/server";
import { CommentForm } from "@/components/post/comment-form";
import { PostCommentsList } from "@/components/post/post-comments-list";

export async function PostCommentsSection({ postId }: { postId: string }) {
  const [session, { t }] = await Promise.all([auth(), getServerTranslator()]);

  let comments: Awaited<ReturnType<typeof getPostComments>> = [];
  let loadError = "";

  try {
    comments = await getPostComments(postId);
  } catch (e) {
    console.error("[PostCommentsSection]", e);
    loadError = "댓글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";
  }

  return (
    <section id="comments" className="space-y-4 scroll-mt-24">
      <h2 className="font-semibold">
        {t("post.comments")} {comments.length > 0 && comments.length}
      </h2>
      {session?.user && <CommentForm postId={postId} />}
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <PostCommentsList
          postId={postId}
          initialComments={comments}
          emptyLabel={t("post.noComments")}
        />
      )}
    </section>
  );
}
