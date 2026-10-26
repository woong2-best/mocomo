"use client";

import Link from "next/link";
import { wikiLinkSlug } from "@/lib/anime-revision";
import { useWikiLinkStatus } from "@/components/anime/wiki-link-context";
import { isExternalHref, parseLinkifyParts } from "@/lib/linkify";
import { cn } from "@/lib/utils";

type FootnoteMap = Map<string, string>;

export const WIKI_HYPERLINK_CLASS =
  "text-emerald-600 dark:text-emerald-400 font-medium underline underline-offset-2 hover:text-emerald-500 dark:hover:text-emerald-300 inline-flex items-center gap-0.5 break-all";

export function WikiExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const external = isExternalHref(href) || /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={cn(WIKI_HYPERLINK_CLASS, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external && <span className="text-[10px] opacity-70">↗</span>}
    </a>
  );
}

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
  const linkStatus = useWikiLinkStatus();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;

  const pushPlain = (value: string, key: string) => {
    if (!value) return;
    const tokens = parseLinkifyParts(value);
    if (tokens.length === 1 && tokens[0]?.type === "text") {
      parts.push(value);
      return;
    }
    tokens.forEach((token, ti) => {
      if (token.type === "link") {
        parts.push(
          <WikiExternalLink key={`${key}-url-${ti}`} href={token.href}>
            {token.label}
          </WikiExternalLink>
        );
        return;
      }
      parts.push(token.type === "text" ? token.value : token.label);
    });
  };

  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) pushPlain(text.slice(last, m.index), `${keyPrefix}-pre-${i}`);

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
      const resolved = linkStatus?.[target];
      const exists = linkStatus ? Boolean(resolved?.exists) : true;
      const slug = resolved?.slug ?? wikiLinkSlug(target);
      const href = exists ? `/anime/${slug}` : `/anime/new?title=${encodeURIComponent(target)}`;
      parts.push(
        <Link
          key={`${keyPrefix}-wl-${i++}`}
          href={href}
          title={exists ? undefined : `Create "${target}"`}
          className={cn(
            "font-medium hover:underline",
            exists ? "text-primary" : "text-[#c0392b] decoration-[#c0392b]/50"
          )}
        >
          {label.trim()}
        </Link>
      );
    } else if (m[4] !== undefined && m[5]) {
      const href = m[5].trim();
      parts.push(
        <WikiExternalLink key={`${keyPrefix}-ext-${i++}`} href={href}>
          {m[4]}
        </WikiExternalLink>
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

  if (last < text.length) pushPlain(text.slice(last), `${keyPrefix}-tail`);

  if (!parts.length) return <span className={className}>{text}</span>;
  return <span className={cn(className)}>{parts}</span>;
}
