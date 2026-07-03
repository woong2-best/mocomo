import { auth } from "@/lib/auth";
import { getPostComments } from "@/lib/post-queries";
import { getServerTranslator } from "@/lib/i18n/server";
import { Card, CardContent } from "@/components/ui/card";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { SupportTierLevel } from "@prisma/client";

function safeTier(tier: string | null | undefined): SupportTierLevel {
  if (!tier) return "PEBBLE";
  const allowed = [
    "PEBBLE", "STONE", "COAL", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
    "EMERALD", "SAPPHIRE", "RUBY", "DIAMOND", "CRYSTAL", "MYTHRIL", "ORICHALCUM",
    "CELESTITE", "ASTRAL", "COSMIC", "ETERNAL",
  ];
  return allowed.includes(tier) ? (tier as SupportTierLevel) : "PEBBLE";
}

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
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("post.noComments")}</p>
      ) : (
        comments.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <DisplayNameWithSupportTier
                name={c.author.name || c.author.username}
                tier={safeTier(c.author.supportTierSent)}
                nameClassName="font-medium text-sm"
                compact
              />
              <LinkifiedText text={c.content} as="p" className="text-sm mt-1 whitespace-pre-wrap" />
              {c.replies.map((r) => (
                <div key={r.id} className="ml-6 mt-2 pl-4 border-l border-border">
                  <DisplayNameWithSupportTier
                    name={r.author.name || r.author.username}
                    tier={safeTier(r.author.supportTierSent)}
                    nameClassName="text-sm font-medium"
                    compact
                  />
                  <LinkifiedText text={r.content} as="p" className="text-sm whitespace-pre-wrap" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
