"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import type { FastSearchResult } from "@/lib/search-fast";
import { SearchPreviewPanel } from "@/components/search/search-preview-panel";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type PanelRect = { top: number; left: number; width: number };

export function HeaderSearch({ variant = "header" }: { variant?: "header" | "page" }) {
  const router = useRouter();
  const { t } = useLocale();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<FastSearchResult | null>(null);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const useFloatingPanel = variant === "header";

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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(q), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchPreview]);

  useEffect(() => {
    setOpen(false);
    setResults(null);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-search-preview-panel]")) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const updatePanelRect = useCallback(() => {
    const el = inputRef.current;
    if (!el || !useFloatingPanel) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setPanelRect({ top: rect.bottom + 6, left, width });
  }, [useFloatingPanel]);

  const trimmed = q.trim();
  const showPanel = open && trimmed.length >= 1;

  useLayoutEffect(() => {
    if (!showPanel || !useFloatingPanel) {
      setPanelRect(null);
      return;
    }
    updatePanelRect();
    const onScroll = () => setOpen(false);
    window.addEventListener("resize", updatePanelRect);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", updatePanelRect);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [showPanel, useFloatingPanel, updatePanelRect, q, results, pending]);

  function goFullSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (term.length < 1) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function clearQuery() {
    setQ("");
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
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

  const panelProps = {
    trimmed,
    pending,
    results,
    hasHits,
    onClose: () => setOpen(false),
    onFullSearch: () => goFullSearch(),
  };

  const previewPanel =
    showPanel &&
    (useFloatingPanel ? (
      panelRect &&
      typeof document !== "undefined" &&
      createPortal(
        <div
          data-search-preview-panel
          className="z-[220]"
          style={{
            position: "fixed",
            top: panelRect.top,
            left: panelRect.left,
            width: panelRect.width,
          }}
        >
          <SearchPreviewPanel {...panelProps} />
        </div>,
        document.body
      )
    ) : (
      <div data-search-preview-panel className="absolute top-full left-0 right-0 mt-1.5 z-[200] w-full min-w-0">
        <SearchPreviewPanel {...panelProps} />
      </div>
    ));

  const formContent = (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <form onSubmit={goFullSearch} className="relative w-full" role="search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          name="q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length >= 1) setOpen(true);
          }}
          onFocus={() => trimmed.length >= 1 && setOpen(true)}
          placeholder={t("search.placeholder")}
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "w-full h-10 pl-10 pr-10 rounded-full bg-muted/80 border text-sm transition-shadow",
            "border-border/80 focus:outline-none focus:ring-2 focus:ring-folk-cobalt/40 focus:border-folk-cobalt/30",
            showPanel && "ring-2 ring-folk-cobalt/30 border-folk-cobalt/30"
          )}
        />
        {pending && !q && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {q.length > 0 && !pending && (
          <button
            type="button"
            onClick={clearQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/80 text-muted-foreground"
            aria-label="검색어 지우기"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {pending && q.length > 0 && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>
      {!useFloatingPanel && previewPanel}
    </div>
  );

  if (!useFloatingPanel) {
    return formContent;
  }

  return (
    <>
      {formContent}
      {previewPanel}
    </>
  );
}
