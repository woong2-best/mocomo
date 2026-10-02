"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { QuotePostPreviewCard } from "@/components/post/quote-post-preview-card";
import type { QuotedPostPreview } from "@/lib/quoted-post";

export function ComposeQuotedPostPreview({ postId }: { postId: string }) {
  const [post, setPost] = useState<QuotedPostPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/quote-preview`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { post?: QuotedPostPreview };
        if (!cancelled) setPost(data.post ?? null);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("compose.s1o1iehh")}
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        {t("compose.s1yrobwa")}
      </div>
    );
  }

  return <QuotePostPreviewCard post={post} />;
}
