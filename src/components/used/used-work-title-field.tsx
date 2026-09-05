"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sanitizeWorkTitleInput } from "@/lib/used-catalog";
import { cn } from "@/lib/utils";

type SuggestHit = {
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
};

export function UsedWorkTitleField({
  value,
  onChange,
  animeSlug,
  onAnimeSlugChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  animeSlug?: string | null;
  onAnimeSlugChange?: (slug: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SuggestHit[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/subculture/anime-suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { items?: SuggestHit[] }) => setHits(d.items ?? []))
        .catch(() => setHits([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(hit: SuggestHit) {
    onChange(sanitizeWorkTitleInput(hit.title));
    onAnimeSlugChange?.(hit.slug);
    setOpen(false);
  }

  function onInputChange(next: string) {
    onChange(sanitizeWorkTitleInput(next));
    onAnimeSlugChange?.(null);
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="space-y-1 relative">
      <label htmlFor="used-work-title" className="text-sm font-medium">
        작품명 (애니/게임/IP)
      </label>
      <input
        id="used-work-title"
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="블루아카이브 (띄어쓰기 없이)"
        className="w-full h-11 rounded-xl border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        autoComplete="off"
        spellCheck={false}
      />
      {open && hits.length > 0 && (
        <ul
          className={cn(
            "absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-border",
            "bg-background shadow-lg overflow-hidden max-h-56 overflow-y-auto"
          )}
        >
          {hits.map((hit) => (
            <li key={hit.slug}>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80"
                onClick={() => pick(hit)}
              >
                {hit.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hit.coverUrl} alt="" className="w-8 h-10 rounded object-cover shrink-0" />
                ) : (
                  <span className="w-8 h-10 rounded bg-muted shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="font-medium block truncate">{hit.title}</span>
                  {hit.titleEn && (
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {hit.titleEn}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {animeSlug ? (
        <p className="text-[10px] text-primary">
          위키 연결:{" "}
          <Link href={`/anime/${animeSlug}`} className="underline">
            {animeSlug}
          </Link>
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">예: 원신, 홀로라이브, 귀멸의칼날</p>
      )}
    </div>
  );
}
