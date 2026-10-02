import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { auth } from "@/lib/auth";
import { getPostComments } from "@/lib/post-queries";
import { getServerTranslator } from "@/lib/i18n/server";
import { CommentForm } from "@/components/post/comment-form";
import { PostCommentsList } from "@/components/post/post-comments-list";

export async function PostCommentsSection({
  postId,
  showIdHandle = false,
}: {
  postId: string;
  showIdHandle?: boolean;
}) {
  const [session, { t }] = await Promise.all([auth(), getServerTranslator()]);

  let comments: Awaited<ReturnType<typeof getPostComments>> = [];
  let loadError = "";

  try {
    comments = await getPostComments(postId, 40, "oldest", session?.user?.id ?? null);
  } catch (e) {
    console.error("[PostCommentsSection]", e);
    loadError = t("post.sxwzygv");
  }

  return (
    <section id="comments" className="space-y-4 scroll-mt-24">
      <h2 className="font-semibold">
        {t("post.comments")} {comments.length > 0 && comments.length}
      </h2>
      {session?.user && <CommentForm postId={postId} className="mt-4" />}
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <PostCommentsList
          postId={postId}
          initialComments={comments}
          emptyLabel={t("post.noComments")}
          showIdHandle={showIdHandle}
        />
      )}
    </section>
  );
}
