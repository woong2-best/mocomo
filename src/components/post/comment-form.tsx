"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function CommentForm({ postId, parentId }: { postId: string; parentId?: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, parentId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "댓글 등록에 실패했습니다.");
      }
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4">
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={parentId ? "대댓글..." : "댓글을 입력하세요..."}
          className="flex-1 h-10 rounded-lg border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "..." : "등록"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
