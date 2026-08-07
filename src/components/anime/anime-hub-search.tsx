"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { displayAnimeTitle } from "@/lib/anime-display-title";

type Result = { slug: string; title: string; titleEn: string | null };

export function AnimeHubSearch() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [popular, setPopular] = useState<{ query: string; count: number }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/anime/search?q=")
      .then((r) => r.json())
      .then((d: { popular?: { query: string; count: number }[] }) => setPopular(d.popular ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/anime/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d: { results?: Result[]; popular?: { query: string; count: number }[] }) => {
          setResults(d.results ?? []);
          if (d.popular) setPopular(d.popular);
        })
        .catch(() => undefined);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submit} className="relative" role="search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          type="search"
          placeholder={t("anime.searchPlaceholder")}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-folk-cobalt/40"
          autoComplete="off"
        />
      </form>

      {open && (results.length > 0 || popular.length > 0) && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          {results.map((r) => (
            <Link
              key={r.slug}
              href={`/anime/${r.slug}`}
              className="block px-3 py-2 text-sm hover:bg-muted/60 border-b border-border/40 last:border-0"
            >
              <span className="font-medium truncate">
                {displayAnimeTitle(
                  { title: r.title, titleEn: r.titleEn, slug: r.slug },
                  locale
                )}
              </span>
            </Link>
          ))}
          {results.length === 0 && q.trim().length >= 1 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("anime.searchNoResults")}</p>
          )}
          {popular.length > 0 && (
            <div className="px-3 py-2 bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t("anime.popularSearches")}</p>
              <div className="flex flex-wrap gap-1">
                {popular.map((p) => (
                  <button
                    key={p.query}
                    type="button"
                    className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border hover:border-primary/40"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQ(p.query);
                      router.push(`/search?q=${encodeURIComponent(p.query)}`);
                    }}
                  >
                    {p.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
