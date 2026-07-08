"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pin, PinOff, MoreHorizontal } from "lucide-react";
import { PostCard } from "@/components/feed/post-card";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { hasPermission } from "@/lib/community-server/permissions";
import {
  deleteCommunityPost,
  pinCommunityPost,
} from "@/actions/community-content";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CommunityPostCard({
  post,
  communityId,
}: {
  post: Parameters<typeof PostCard>[0]["post"] & { isPinned?: boolean };
  communityId: string;
}) {
  const { permissions } = useCommunityMembership();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canMod =
    hasPermission(permissions, "deletePosts") || hasPermission(permissions, "announce");

  async function remove() {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    setLoading(true);
    const res = await deleteCommunityPost(post.id, communityId);
    if ("error" in res && res.error) alert(res.error);
    else router.refresh();
    setLoading(false);
  }

  async function togglePin() {
    setLoading(true);
    const res = await pinCommunityPost(post.id, communityId, !post.isPinned);
    if ("error" in res && res.error) alert(res.error);
    else router.refresh();
    setLoading(false);
  }

  return (
    <div className="relative group">
      {canMod && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-md bg-background/90 border border-border shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasPermission(permissions, "announce") && (
                <DropdownMenuItem onClick={() => void togglePin()}>
                  {post.isPinned ? (
                    <>
                      <PinOff className="h-4 w-4" /> 고정 해제
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4" /> 공지 고정
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {hasPermission(permissions, "deletePosts") && (
                <DropdownMenuItem className="text-destructive" onClick={() => void remove()}>
                  <Trash2 className="h-4 w-4" /> 삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <PostCard post={post} />
    </div>
  );
}
