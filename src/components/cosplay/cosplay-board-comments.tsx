"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { createCosplayBoardComment } from "@/actions/cosplay-board";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userAvatarFallbackInitial, userDisplayName } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";

type CommentAuthor = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
};

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  author: CommentAuthor;
};

export function CosplayBoardComments({
  postId,
  initialComments,
  isSignedIn,
}: {
  postId: string;
  initialComments: Comment[];
  isSignedIn: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createCosplayBoardComment(postId, content);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setContent("");
      window.location.reload();
    });
  }

  return (
    <section className="border-t border-[#d6d6d6] dark:border-border">
      <div className="px-4 py-3 bg-[#f7f7f7] dark:bg-muted/30 text-xs font-semibold text-muted-foreground">
        댓글 {comments.length}개
      </div>

      <ul className="divide-y divide-[#ececec] dark:divide-border">
        {comments.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            첫 댓글을 남겨 보세요.
          </li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="px-4 py-3 flex gap-3">
              <Link href={`/u/${c.author.username}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.author.image ?? undefined} />
                  <AvatarFallback>{userAvatarFallbackInitial(c.author)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/u/${c.author.username}`} className="hover:text-primary">
                    <DisplayNameWithSupportTier
                      name={userDisplayName(c.author)}
                      tier={c.author.supportTierSent}
                      nameClassName="text-xs font-semibold"
                      compact
                    />
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(c.createdAt, { addSuffix: true, locale: ko })}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="px-4 py-4 bg-[#fafafa] dark:bg-muted/20 border-t border-[#ececec] dark:border-border">
        {isSignedIn ? (
          <form onSubmit={submit} className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="댓글을 입력하세요"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y"
              maxLength={2000}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={pending} className="rounded-lg">
              {pending ? "등록 중…" : "댓글 등록"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={`/auth/signin?callbackUrl=/cosplay/board/${postId}`} className="text-primary hover:underline">
              로그인
            </Link>
            하면 댓글을 남길 수 있습니다.
          </p>
        )}
      </div>
    </section>
  );
}
