"use client";

import { useState } from "react";
import { createComment } from "@/actions/community";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function CommentForm({ postId, parentId }: { postId: string; parentId?: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    await createComment(postId, content.trim(), parentId);
    setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "대댓글..." : "댓글을 입력하세요..."}
        className="flex-1 h-10 rounded-lg border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "..." : "등록"}
      </Button>
    </form>
  );
}
