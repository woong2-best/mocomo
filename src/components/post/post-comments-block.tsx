"use client";

import { useRef, useState } from "react";
import { CommentForm } from "@/components/post/comment-form";
import { PostCommentsList } from "@/components/post/post-comments-list";
import type { SerializedComment } from "@/lib/comment-service";

export function PostCommentsBlock({
  postId,
  postAuthorId,
  qna = false,
  sort = "oldest",
  signedIn,
  initialPinned = [],
  initialTop = [],
  initialComments,
  initialCursor = null,
  emptyLabel,
  showIdHandle = true,
}: {
  postId: string;
  postAuthorId: string;
  qna?: boolean;
  sort?: string;
  signedIn: boolean;
  initialPinned?: SerializedComment[];
  initialTop?: SerializedComment[];
  initialComments: SerializedComment[];
  initialCursor?: string | null;
  emptyLabel: string;
  showIdHandle?: boolean;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [replyTarget, setReplyTarget] = useState<{
    rootId: string;
    userId: string;
    username: string;
  } | null>(null);
  const [expandNonceById, setExpandNonceById] = useState<Record<string, number>>(
    {}
  );

  function startReply(target: {
    rootId: string;
    userId: string;
    username: string;
  }) {
    setReplyTarget(target);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="space-y-4">
      <PostCommentsList
        postId={postId}
        postAuthorId={postAuthorId}
        qna={qna}
        sort={sort}
        initialPinned={initialPinned}
        initialTop={initialTop}
        initialComments={initialComments}
        initialCursor={initialCursor}
        emptyLabel={emptyLabel}
        showIdHandle={showIdHandle}
        expandNonceById={expandNonceById}
        onReply={startReply}
        onReplyPosted={(rootId) =>
          setExpandNonceById((prev) => ({
            ...prev,
            [rootId]: (prev[rootId] ?? 0) + 1,
          }))
        }
      />
      {signedIn ? (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 py-3 backdrop-blur">
          <CommentForm
            postId={postId}
            parentId={replyTarget?.rootId}
            replyToUserId={replyTarget?.userId}
            replyToUsername={replyTarget?.username}
            onCancelReply={() => setReplyTarget(null)}
            inputRef={inputRef}
            onSubmitted={() => {
              if (replyTarget) {
                setExpandNonceById((prev) => ({
                  ...prev,
                  [replyTarget.rootId]: (prev[replyTarget.rootId] ?? 0) + 1,
                }));
              }
              setReplyTarget(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
