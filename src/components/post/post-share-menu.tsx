"use client";

import { ContentShareMenu } from "@/components/share/content-share-menu";
import {
  buildPostQuoteDraft,
  buildPostShareMessage,
  postUrl,
} from "@/lib/post-share";

export function PostShareMenu({
  postId,
  authorUsername,
  title,
  content,
  hasVideo = false,
  size = "sm",
  tone = "folk",
  className,
  onActionError,
}: {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
  hasVideo?: boolean;
  size?: "sm" | "md" | "detail";
  tone?: "folk" | "plain";
  className?: string;
  onActionError?: (message: string) => void;
}) {
  const input = { postId, authorUsername, title, content, hasVideo };
  const shareMessage = buildPostShareMessage(input);
  const composeDraft = buildPostQuoteDraft(input);
  const preview = title?.trim() || content?.trim().slice(0, 40) || "게시물";

  return (
    <ContentShareMenu
      url={postUrl(postId)}
      label={preview}
      shareMessage={shareMessage}
      composeDraft={composeDraft}
      composeTitle={title?.trim() || `${authorUsername}님 게시물`}
      nativeShareTitle={preview}
      postId={postId}
      hasVideo={hasVideo}
      size={size}
      tone={tone}
      className={className}
      onActionError={onActionError}
    />
  );
}
