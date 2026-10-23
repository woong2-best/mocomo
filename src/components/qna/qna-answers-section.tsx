import { auth } from "@/lib/auth";
import { getPostCommentsPage } from "@/lib/comment-service";
import { getServerTranslator } from "@/lib/i18n/server";
import { CommentForm } from "@/components/post/comment-form";
import { QnaAnswerList } from "@/components/qna/qna-answer-list";

export async function QnaAnswersSection({
  postId,
  postAuthorId,
  acceptedCommentId,
  bountyCenti,
}: {
  postId: string;
  postAuthorId: string;
  acceptedCommentId?: string | null;
  bountyCenti: number;
}) {
  const [session, { t }] = await Promise.all([auth(), getServerTranslator()]);

  let comments: Awaited<ReturnType<typeof getPostCommentsPage>>["comments"] = [];
  let nextCursor: string | null = null;
  let loadError = "";

  try {
    const page = await getPostCommentsPage({
      postId,
      postAuthorId,
      sort: "oldest",
      limit: 20,
      viewerId: session?.user?.id ?? null,
      includePinned: false,
      communityId: "qna",
    });
    comments = page.comments;
    nextCursor = page.nextCursor;
  } catch (e) {
    console.error("[QnaAnswersSection]", e);
    loadError = t("post.sxwzygv");
  }

  const totalShown = comments.length;

  return (
    <section id="answers" className="space-y-5 scroll-mt-24">
      {session?.user ? (
        <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-4">
          <CommentForm
            postId={postId}
            placeholder={t("qna.write_answer")}
            submitLabel={t("qna.answer_button")}
            className="mt-0"
            inputClassName="rounded-xl min-h-[72px] max-h-40"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
        <h2 className="font-semibold">
          {t("qna.answers", { count: String(totalShown) })}
        </h2>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <QnaAnswerList
          postId={postId}
          postAuthorId={postAuthorId}
          acceptedCommentId={acceptedCommentId}
          bountyCenti={bountyCenti}
          initialComments={comments}
          initialCursor={nextCursor}
          emptyLabel={t("qna.first_answer")}
        />
      )}
    </section>
  );
}
