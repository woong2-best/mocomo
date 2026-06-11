"use client";

import Link from "next/link";
import { wikiLinkSlug } from "@/lib/anime-revision";
import { cn } from "@/lib/utils";

type FootnoteMap = Map<string, string>;

const INLINE_RE =
  /(\{\{([^}]+)\}\}|\[\[(?:[^\]|]+\|)?([^\]|]+)\]\]|\[([^\]]+)\]\(([^)]+)\)|\[\^(\d+)\]|!\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;

export function WikiInline({
  text,
  notes = new Map(),
  keyPrefix = "wi",
  className,
}: {
  text: string;
  notes?: FootnoteMap;
  keyPrefix?: string;
  className?: string;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));

    if (m[2] !== undefined) {
      parts.push(
        <span
          key={`${keyPrefix}-badge-${i++}`}
          className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300 mx-0.5"
        >
          {m[2].trim()}
        </span>
      );
    } else if (m[0].startsWith("[[")) {
      const label = m[0].includes("|") ? m[0].slice(2, m[0].indexOf("|")) : m[3];
      const target = m[3]!.trim();
      parts.push(
        <Link
          key={`${keyPrefix}-wl-${i++}`}
          href={`/anime/${wikiLinkSlug(target)}`}
          className="text-primary font-medium hover:underline"
        >
          {label.trim()}
        </Link>
      );
    } else if (m[4] !== undefined && m[5]) {
      const href = m[5].trim();
      const external = /^https?:\/\//i.test(href);
      parts.push(
        <a
          key={`${keyPrefix}-ext-${i++}`}
          href={href}
          className="text-primary hover:underline inline-flex items-center gap-0.5"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {m[4]}
          {external && <span className="text-[10px] opacity-60">↗</span>}
        </a>
      );
    } else if (m[6]) {
      const id = m[6];
      parts.push(
        <sup key={`${keyPrefix}-fn-${i++}`} className="text-primary">
          <a href={`#wiki-fn-${id}`} id={`wiki-fn-ref-${id}`} className="hover:underline">
            [{id}]
          </a>
        </sup>
      );
    } else if (m[7] !== undefined && m[8]) {
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${keyPrefix}-img-${i++}`}
          src={m[8]}
          alt={m[7]}
          className="rounded-lg max-w-full my-2 border border-border/60"
          loading="lazy"
        />
      );
    } else if (m[9]) {
      parts.push(<strong key={`${keyPrefix}-b-${i++}`}>{m[9]}</strong>);
    }

    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));

  if (!parts.length) return <span className={className}>{text}</span>;
  return <span className={cn(className)}>{parts}</span>;
}
