"use client";

export function WikiStickyToc({
  headings,
  title,
}: {
  headings: { id: string; label: string; level: 2 | 3 }[];
  title: string;
}) {
  if (headings.length === 0) return null;

  return (
    <nav
      aria-label={title}
      className="rounded-2xl border border-border/70 bg-card/80 px-3 py-3 text-sm shadow-sm"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ol className="max-h-[40vh] space-y-1 overflow-y-auto pl-0 [scrollbar-width:thin]">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-3" : undefined}>
            <a
              href={`#${heading.id}`}
              className="block truncate text-primary hover:underline"
              onClick={(event) => {
                const target = document.getElementById(heading.id);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", `#${heading.id}`);
              }}
            >
              {heading.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
