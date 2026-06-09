"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AnimeCommunityPanel({
  animeId,
  slug,
  posts,
  isLoggedIn,
}: {
  animeId: string;
  slug: string;
  posts: { id: string; content: string; author: { username: string; image: string | null } }[];
  isLoggedIn: boolean;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: content.trim(), animeId }),
      });
      const data = (await res.json()) as { postId?: string; error?: string };
      if (!res.ok || !data.postId) {
        setError(data.error ?? "게시에 실패했습니다.");
        return;
      }
      setContent("");
      window.location.reload();
    } catch {
      setError("게시에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {isLoggedIn ? (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">이 문서에 대한 토론·의견을 남겨 주세요.</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="토론 내용…"
            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
            required
          />
          <Button type="submit" size="sm" disabled={loading} className="rounded-lg">
            {loading ? "게시 중…" : "토론 글 올리기"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/anime/${slug}?tab=community`)}`} className="text-primary underline">
            로그인
          </Link>
          하면 토론에 참여할 수 있습니다.
        </p>
      )}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 토론 글이 없습니다.</p>
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`}>
              <div className="rounded-xl border border-border/70 p-3 hover:border-primary/30 transition-colors">
                <p className="text-sm font-medium">@{p.author.username}</p>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.content}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
