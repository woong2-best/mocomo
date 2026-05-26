import { auth } from "@/lib/auth";
import { getPostComments } from "@/lib/post-queries";
import { getServerTranslator } from "@/lib/i18n/server";
import { Card, CardContent } from "@/components/ui/card";
import { CommentForm } from "@/components/post/comment-form";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

export async function PostCommentsSection({ postId }: { postId: string }) {
  const [session, comments, { t }] = await Promise.all([
    auth(),
    getPostComments(postId),
    getServerTranslator(),
  ]);

  return (
    <section id="comments" className="space-y-4">
      <h2 className="font-semibold">
        {t("post.comments")} {comments.length > 0 && comments.length}
      </h2>
      {session?.user && <CommentForm postId={postId} />}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("post.noComments")}</p>
      ) : (
        comments.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <DisplayNameWithSupportTier
                name={c.author.name || c.author.username}
                tier={c.author.supportTierSent}
                nameClassName="font-medium text-sm"
                compact
              />
              <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
              {c.replies.map((r) => (
                <div key={r.id} className="ml-6 mt-2 pl-4 border-l border-border">
                  <DisplayNameWithSupportTier
                    name={r.author.name || r.author.username}
                    tier={r.author.supportTierSent}
                    nameClassName="text-sm font-medium"
                    compact
                  />
                  <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
