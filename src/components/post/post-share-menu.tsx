"use client";

import { ContentShareMenu } from "@/components/share/content-share-menu";
import { buildPostShareMessage, postUrl } from "@/lib/post-share";

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
  const shareMessage = buildPostShareMessage({
    postId,
    authorUsername,
    title,
    content,
    hasVideo,
  });

  return (
    <ContentShareMenu
      url={postUrl(postId)}
      shareMessage={shareMessage}
      postId={postId}
      size={size}
      tone={tone}
      className={className}
      onActionError={onActionError}
    />
  );
}
