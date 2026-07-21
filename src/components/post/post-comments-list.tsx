"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TranslatableText } from "@/components/ui/translatable-text";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { SupportTierLevel } from "@prisma/client";
import {
  COMMENT_ADDED_EVENT,
  COMMENT_CONFIRMED_EVENT,
  COMMENT_FAILED_EVENT,
  type OptimisticComment,
} from "@/lib/comment-optimistic-sync";

export type ServerComment = {
  id: string;
  content: string;
  createdAt: Date | string;
  author: {
    name: string | null;
    username: string;
    supportTierSent?: string | null;
  };
  replies: {
    id: string;
    content: string;
    author: {
      name: string | null;
      username: string;
      supportTierSent?: string | null;
    };
  }[];
};

function safeTier(tier: string | null | undefined): SupportTierLevel {
  if (!tier) return "PEBBLE";
  const allowed = [
    "PEBBLE", "STONE", "COAL", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
    "EMERALD", "SAPPHIRE", "RUBY", "DIAMOND", "CRYSTAL", "MYTHRIL", "ORICHALCUM",
    "CELESTITE", "ASTRAL", "COSMIC", "ETERNAL",
  ];
  return allowed.includes(tier) ? (tier as SupportTierLevel) : "PEBBLE";
}

function toOptimistic(c: ServerComment): OptimisticComment {
  return {
    id: c.id,
    content: c.content,
    author: {
      name: c.author.name,
      username: c.author.username,
      supportTierSent: c.author.supportTierSent,
    },
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      author: {
        name: r.author.name,
        username: r.author.username,
        supportTierSent: r.author.supportTierSent,
      },
    })),
  };
}

export function PostCommentsList({
  postId,
  initialComments,
  emptyLabel,
}: {
  postId: string;
  initialComments: ServerComment[];
  emptyLabel: string;
}) {
  const [comments, setComments] = useState<OptimisticComment[]>(() =>
    initialComments.map(toOptimistic)
  );

  useEffect(() => {
    setComments((prev) => {
      const pending = prev.filter((c) => c.pending);
      const fromServer = initialComments.map(toOptimistic);
      const serverIds = new Set(fromServer.map((c) => c.id));
      const stillPending = pending.filter((p) => !serverIds.has(p.id));
      return [...fromServer, ...stillPending];
    });
  }, [initialComments]);

  useEffect(() => {
    function onAdded(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; comment: OptimisticComment }>).detail;
      if (!detail || detail.postId !== postId) return;
      const comment = detail.comment;
      if (comment.parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.parentId
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    {
                      id: comment.id,
                      content: comment.content,
                      author: comment.author,
                    },
                  ],
                }
              : c
          )
        );
        return;
      }
      setComments((prev) => [...prev, comment]);
    }

    function onConfirmed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string; realId: string }>)
        .detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === detail.pendingId) return { ...c, id: detail.realId, pending: false };
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === detail.pendingId ? { ...r, id: detail.realId } : r
            ),
          };
        })
      );
    }

    function onFailed(e: Event) {
      const detail = (e as CustomEvent<{ postId: string; pendingId: string }>).detail;
      if (!detail || detail.postId !== postId) return;
      setComments((prev) =>
        prev
          .filter((c) => c.id !== detail.pendingId)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== detail.pendingId),
          }))
      );
    }

    window.addEventListener(COMMENT_ADDED_EVENT, onAdded);
    window.addEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
    window.addEventListener(COMMENT_FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(COMMENT_ADDED_EVENT, onAdded);
      window.removeEventListener(COMMENT_CONFIRMED_EVENT, onConfirmed);
      window.removeEventListener(COMMENT_FAILED_EVENT, onFailed);
    };
  }, [postId]);

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <>
      {comments.map((c) => (
        <Card key={c.id} className={c.pending ? "opacity-70" : undefined}>
          <CardContent className="p-4">
            <DisplayNameWithSupportTier
              name={c.author.name || c.author.username}
              tier={safeTier(c.author.supportTierSent)}
              nameClassName="font-medium text-sm"
              compact
            />
            <TranslatableText text={c.content} as="p" className="text-sm mt-1 whitespace-pre-wrap" />
            {c.replies.map((r) => (
              <div key={r.id} className="ml-6 mt-2 pl-4 border-l border-border">
                <DisplayNameWithSupportTier
                  name={r.author.name || r.author.username}
                  tier={safeTier(r.author.supportTierSent)}
                  nameClassName="text-sm font-medium"
                  compact
                />
                <TranslatableText text={r.content} as="p" className="text-sm whitespace-pre-wrap" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
