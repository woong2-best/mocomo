"use client";

import { useEffect, useRef } from "react";

export function AnimeViewTracker({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch(`/api/anime/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}
