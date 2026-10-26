"use client";

export function WikiFootnote({
  id,
  preview,
}: {
  id: string;
  preview?: string;
}) {
  return (
    <sup className="relative group text-primary font-semibold">
      <a href={`#wiki-fn-${id}`} id={`wiki-fn-ref-${id}`} className="hover:underline">
        [{id}]
      </a>
      {preview ? (
        <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden w-56 -translate-x-1/2 rounded-xl border border-border/70 bg-card px-2.5 py-2 text-left text-[11px] font-normal leading-relaxed text-foreground shadow-lg group-hover:block">
          {preview}
        </span>
      ) : null}
    </sup>
  );
}
