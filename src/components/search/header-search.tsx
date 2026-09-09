"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import type { FastSearchResult } from "@/lib/search-fast";
import { SearchPreviewPanel } from "@/components/search/search-preview-panel";
import { SearchRankingFocusPanel } from "@/components/search/search-ranking-focus-panel";
import { getHeaderSearchContext } from "@/lib/header-search-context";
import type {
  SidebarSearchRankingItem,
  SidebarSearchRankingScope,
} from "@/lib/scoped-search-rank-shared";
import { cn } from "@/lib/utils";

type PanelRect = { top: number; left: number; width: number };

/** Body-level overlay so previews never fight page cards / stacking contexts. */
const SEARCH_PREVIEW_Z = 220;

export function HeaderSearch({
  variant = "header",
  defaultQuery = "",
  className,
}: {
  variant?: "header" | "page" | "pill";
  defaultQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchContext = getHeaderSearchContext(pathname ?? "");
  const isOnSearchPage = pathname === "/search";
  const urlScope = searchParams.get("scope");
  const isSocialScope = searchContext.scope === "social" || urlScope === "social";
  const usesPageQuery = isOnSearchPage || searchContext.inPage;
  const urlQuery = usesPageQuery ? (searchParams.get("q") ?? "") : "";
  const [q, setQ] = useState(usesPageQuery ? urlQuery : defaultQuery);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<FastSearchResult | null>(null);
  const [rankings, setRankings] = useState<SidebarSearchRankingItem[]>([]);
  const [rankScope, setRankScope] = useState<SidebarSearchRankingScope>("global");
  const [rankPending, setRankPending] = useState(false);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadRankings = useCallback(() => {
    setRankPending(true);
    void fetch(`/api/search/ranking?pathname=${encodeURIComponent(pathname ?? "/")}`)
      .then((res) => res.json())
      .then((body: { ok?: boolean; items?: SidebarSearchRankingItem[]; scope?: SidebarSearchRankingScope }) => {
        if (!body.ok) return;
        setRankings(body.items ?? []);
        setRankScope(body.scope ?? "global");
      })
      .catch(() => undefined)
      .finally(() => setRankPending(false));
  }, [pathname]);

  const fetchPreview = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 1) {
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
          suggestions: body.suggestions ?? [],
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
    if (usesPageQuery) {
      setQ(urlQuery);
      setOpen(false);
      setResults(null);
      return;
    }
    setQ(defaultQuery);
  }, [defaultQuery, usesPageQuery, urlQuery]);

  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length >= 1 && !searchContext.inPage) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPreview(q), 280);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    return undefined;
  }, [q, open, fetchPreview, searchContext.inPage]);

  useEffect(() => {
    setOpen(false);
    setResults(null);
    setRankings([]);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-search-dropdown-panel]")) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const updatePanelRect = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setPanelRect({ top: rect.bottom + 6, left, width });
  }, []);

  const trimmed = q.trim();
  const showTypingPreview = open && trimmed.length >= 1 && !searchContext.inPage;
  const showRankingPanel = open && !showTypingPreview;
  const showDropdown = showTypingPreview || showRankingPanel;

  useLayoutEffect(() => {
    if (!showDropdown) {
      setPanelRect(null);
      return;
    }
    updatePanelRect();
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-search-dropdown-panel]")) return;
      setOpen(false);
    };
    window.addEventListener("resize", updatePanelRect);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", updatePanelRect);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [showDropdown, updatePanelRect, q, results, pending, rankings, rankPending]);

  function goFullSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (term.length < 1) return;
    setOpen(false);

    if (
      searchContext.scope === "used" ||
      searchContext.scope === "market" ||
      searchContext.scope === "live" ||
      searchContext.scope === "wiki" ||
      searchContext.scope === "community" ||
      searchContext.scope === "social"
    ) {
      void fetch("/api/search/scoped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: searchContext.scope, q: term }),
      }).catch(() => undefined);
    }

    if (searchContext.inPage) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", term);
      const qs = params.toString();
      router.replace(qs ? `${searchContext.basePath}?${qs}` : searchContext.basePath);
      return;
    }

    if (isSocialScope) {
      router.push(`/search?q=${encodeURIComponent(term)}&scope=social`);
      return;
    }

    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function clearQuery() {
    setQ("");
    setResults(null);
    setOpen(true);
    loadRankings();

    if (usesPageQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      const qs = params.toString();
      const base = searchContext.inPage ? searchContext.basePath : "/search";
      router.replace(qs ? `${base}?${qs}` : base);
      return;
    }

    inputRef.current?.focus();
  }

  function onInputFocus() {
    setOpen(true);
    loadRankings();
    if (!searchContext.inPage && trimmed.length >= 1) {
      fetchPreview(q);
    }
  }

  const suggestions = results?.suggestions ?? [];
  const users = results?.users ?? [];
  const extraAnimes = (results?.animes ?? []).filter(
    (a) => !suggestions.some((s) => s.id === `anime:${a.slug}`)
  );
  const hasHits =
    suggestions.length > 0 ||
    users.length > 0 ||
    extraAnimes.length > 0 ||
    (results?.posts.length ?? 0) > 0 ||
    (results?.liveStreams.length ?? 0) > 0;

  const dropdownPanel =
    showDropdown &&
    mounted &&
    panelRect &&
    createPortal(
      <div
        data-search-dropdown-panel
        className="pointer-events-auto overflow-hidden rounded-xl border-2 border-folk-terracotta/50 bg-background shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        style={{
          position: "fixed",
          top: panelRect.top,
          left: panelRect.left,
          width: panelRect.width,
          zIndex: SEARCH_PREVIEW_Z,
        }}
      >
        {showTypingPreview ? (
          <SearchPreviewPanel
            trimmed={trimmed}
            pending={pending}
            results={results}
            hasHits={hasHits}
            onClose={() => setOpen(false)}
            onFullSearch={() => goFullSearch()}
          />
        ) : (
          <SearchRankingFocusPanel
            scope={rankScope}
            items={rankings}
            pending={rankPending}
            filter={searchContext.inPage ? q : undefined}
            onPick={() => setOpen(false)}
          />
        )}
      </div>,
      document.body
    );

  return (
    <>
      <div
        ref={wrapRef}
        className={cn("relative w-full min-w-0", variant === "page" && "z-[1]", className)}
      >
        <form
          onSubmit={goFullSearch}
          className={cn(
            "flex w-full items-stretch overflow-hidden rounded-xl border-2 border-folk-cobalt/35 bg-background shadow-[2px_3px_0_hsl(var(--folk-cobalt)/0.1)] transition-all",
            "focus-within:border-folk-terracotta focus-within:shadow-[3px_4px_0_hsl(var(--folk-terracotta)/0.18)]",
            showDropdown && "border-folk-terracotta shadow-[3px_4px_0_hsl(var(--folk-terracotta)/0.18)]"
          )}
          role="search"
        >
          <div className="relative flex min-w-0 flex-1 items-center">
            <input
              ref={inputRef}
              name="q"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
                if (!searchContext.inPage && e.target.value.trim().length >= 1) {
                  /* preview fetched via effect */
                } else if (e.target.value.trim().length < 1) {
                  setResults(null);
                  loadRankings();
                }
              }}
              onFocus={onInputFocus}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                goFullSearch();
              }}
              aria-label={searchContext.placeholder}
              placeholder={searchContext.placeholder}
              autoComplete="off"
              enterKeyHint="search"
              className="h-11 w-full bg-transparent px-3 pr-9 text-sm outline-none placeholder:text-muted-foreground/70"
            />
            {pending && !q && (
              <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {q.length > 0 && !pending && (
              <button
                type="button"
                onClick={clearQuery}
                className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {pending && q.length > 0 && (
              <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center bg-folk-terracotta px-3.5 text-white transition-colors hover:brightness-110"
            aria-label={searchContext.placeholder}
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </form>
      </div>
      {dropdownPanel}
    </>
  );
}
