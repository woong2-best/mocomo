"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import type { FastSearchResult } from "@/lib/search-fast";

export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<FastSearchResult | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchPreview = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: ac.signal,
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setResults(null);
          return;
        }
        setResults({
          users: body.users ?? [],
          animes: body.animes ?? [],
          posts: body.posts ?? [],
          liveStreams: body.liveStreams ?? [],
        });
        setOpen(true);
      } catch {
        if (!ac.signal.aborted) setResults(null);
      }
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(q), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchPreview]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function goFullSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const hasHits =
    results &&
    (results.liveStreams.length > 0 ||
      results.users.length > 0 ||
      results.animes.length > 0 ||
      results.posts.length > 0);

  return (
    <div ref={wrapRef} className="relative w-full">
      <form onSubmit={goFullSearch} className="relative w-full" role="search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder="검색"
          autoComplete="off"
          className="w-full h-10 pl-10 pr-10 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-folk-cobalt/40"
        />
        {pending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[60] rounded-xl border border-border bg-background shadow-lg max-h-[min(70vh,420px)] overflow-y-auto text-sm">
          {!hasHits && !pending && (
            <p className="px-3 py-4 text-muted-foreground text-center">결과 없음</p>
          )}
          {results?.liveStreams.map((ch) => (
            <Link
              key={ch.id}
              href={`/voice/${ch.id}`}
              className="block px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <span className="text-folk-terracotta font-medium">LIVE</span> {ch.name}
            </Link>
          ))}
          {results?.users.map((u) => (
            <Link
              key={u.username}
              href={`/u/${u.username}`}
              className="block px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              @{u.username}
              {u.name ? ` · ${u.name}` : ""}
            </Link>
          ))}
          {results?.animes.map((a) => (
            <Link
              key={a.slug}
              href={`/anime/${a.slug}`}
              className="block px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              {a.title}
            </Link>
          ))}
          {results?.posts.map((p) => (
            <Link
              key={p.id}
              href={`/post/${p.id}`}
              className="block px-3 py-2 hover:bg-muted line-clamp-1"
              onClick={() => setOpen(false)}
            >
              {p.title || p.content}
            </Link>
          ))}
          <button
            type="button"
            className="w-full px-3 py-2.5 text-xs font-medium text-primary border-t hover:bg-muted"
            onClick={() => goFullSearch()}
          >
            「{q.trim()}」 전체 검색
          </button>
        </div>
      )}
    </div>
  );
}
