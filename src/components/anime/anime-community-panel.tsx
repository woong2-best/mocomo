"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
        setError(errorText(data.error ?? t("anime.s1l7khy9")));
        return;
      }
      setContent("");
      window.location.reload();
    } catch {
      setError(t("anime.s1l7khy9"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {isLoggedIn ? (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">{t("anime.ss7enyr")}</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={t("anime.s1pthii9")}
            className="w-full rounded-lg border border-border bg-background p-2 text-sm"
            required
          />
          <Button type="submit" size="sm" disabled={loading} className="rounded-lg">
            {loading ? t("lib.published.toast.store.sfaa0601b2e") : t("anime.s1qeqjzk")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/anime/${slug}?tab=community`)}`} className="text-primary underline">
            {t("auth.signIn")}
          </Link>
          {t("anime.s9ygmr9")}
        </p>
      )}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("anime.swrvvdg")}</p>
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
